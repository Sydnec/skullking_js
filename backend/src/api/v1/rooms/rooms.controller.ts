import prisma from '../../../common/prisma';
import { Request, Response, NextFunction } from 'express';
import { getSocketServer } from '../../../common/socket';
import { AuthRequest } from '../../../common/authMiddleware';

const ROOM_INCLUDE = {
  owner: { select: { id: true, name: true } },
  players: { include: { user: { select: { id: true, name: true } } } },
};

export async function listRooms(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await prisma.room.findMany({ include: ROOM_INCLUDE }));
  } catch (e) {
    next(e);
  }
}

export async function getRoom(req: Request, res: Response, next: NextFunction) {
  try {
    // now lookup by public code (/:code)
    const room = await prisma.room.findUnique({ where: { code: req.params.code }, include: ROOM_INCLUDE });
    if (!room) return res.status(404).end();
    res.json(room);
  } catch (e) {
    next(e);
  }
}

export async function createRoom(req: Request, res: Response, next: NextFunction) {
  try {
    // owner will be the authenticated user
    const authReq = req as AuthRequest;
    const ownerId = authReq.user?.sub;
    if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

    // Prepare payload: include owner and ensure the owner is also added as a player
    const body = req.body || {};
    const data: any = { ...body, ownerId };

    // If client didn't explicitly include players, ensure owner is created as a roomPlayer
    // Use nested create to keep operation atomic
    if (!data.players) {
      data.players = { create: { userId: ownerId } };
    }

    const room = await prisma.room.create({ data, include: ROOM_INCLUDE });

    // Broadcast creation so lobby updates for everyone
    const io = getSocketServer();
    try {
      io?.emit('room-list-updated');
      io?.to(room.code).emit('room-created', { room });
    } catch (e) { /* ignore socket errors */ }

    res.status(201).json(room);
  } catch (e) {
    next(e);
  }
}

export async function updateRoom(req: Request, res: Response, next: NextFunction) {
  try {
    // authorize via authenticated user
    const authReq = req as AuthRequest;
    const userId = authReq.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // find room by code to check owner
    const roomBefore = await prisma.room.findUnique({ where: { code: req.params.code } });
    if (!roomBefore) return res.status(404).json({ error: 'Room not found' });
    if (roomBefore.ownerId !== userId) return res.status(403).json({ error: 'Only owner can update room settings' });

    // perform update (only allowed fields should be sent by client)
    const { userId: _discard, ...updateData } = req.body || {};
    const room = await prisma.room.update({ where: { code: req.params.code }, data: updateData, include: ROOM_INCLUDE });

    // emit socket events so clients update (room-scoped + global)
    const io = getSocketServer();
    try {
      io?.to(req.params.code).emit('room-updated', { room });
      io?.emit('room-list-updated');
    } catch (e) { /* ignore socket errors */ }

    res.json(room);
  } catch (e) {
    next(e);
  }
}

export async function deleteRoom(req: Request, res: Response, next: NextFunction) {
  try {
    // authorize: only owner can delete
    const authReq = req as AuthRequest;
    const userId = authReq.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // ensure room exists and owner matches
    const room = await prisma.room.findUnique({ where: { code: req.params.code } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.ownerId !== userId) return res.status(403).json({ error: 'Only owner can delete room' });

    // Delete dependent records first to avoid foreign key constraint errors
    try {
      await prisma.message.deleteMany({ where: { roomId: room.id } });
      await prisma.roomPlayer.deleteMany({ where: { roomId: room.id } });
    } catch (e) {
      // ignore deletion errors here and continue to attempt delete room
    }

    await prisma.room.delete({ where: { code: req.params.code } });

    // broadcast
    const io = getSocketServer();
    try {
      io?.emit('room-list-updated');
      io?.to(req.params.code).emit('room-deleted', { message: 'Room deleted by owner' });
    } catch (e) { /* ignore socket errors */ }

    res.status(204).end();
  } catch (e) {
    next(e);
  }
}

export async function joinRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const code = req.params.code;
    const authReq = req as AuthRequest;
    const userId = authReq.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    // if already joined, return existing wrapped in { player }
    const existing = await prisma.roomPlayer.findFirst({ where: { roomId: room.id, userId } });
    if (existing) return res.status(200).json({ player: existing });

    const rp = await prisma.roomPlayer.create({
      data: { roomId: room.id, userId, seat: null },
      include: { user: { select: { id: true, name: true } } },
    });

    const io = getSocketServer();
    try {
      io?.to(code).emit('player-joined', { player: rp });
      io?.emit('room-list-updated');
    } catch (e) { /* ignore socket errors */ }

    return res.status(201).json({ player: rp });
  } catch (e) {
    next(e);
  }
}

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getRoundSequence(format: string): number[] {
  switch (format) {
    case 'NO_ODD': return [2, 4, 6, 8, 10];
    case 'READY_TO_FIGHT': return [6, 7, 8, 9, 10];
    case 'LIGHTNING_ATTACK': return [5, 5, 5, 5, 5];
    case 'BARRAGE_SHOT': return [10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
    case 'WHIRLWIND': return [9, 7, 5, 3, 1];
    case 'BEDTIME': return [1];
    case 'CLASSIC':
    default: return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  }
}

export async function startRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const code = req.params.code;
    const authReq = req as AuthRequest;
    const userId = authReq.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const room = await prisma.room.findUnique({ where: { code }, include: ROOM_INCLUDE });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (room.ownerId !== userId) return res.status(403).json({ error: 'Only owner can start the game' });

    const players = room.players || [];
    if (players.length < 2) return res.status(400).json({ error: 'Not enough players (min 2)' });

    // 1. Shuffle players and assign seats
    const shuffledPlayers = shuffle([...players]);
    await Promise.all(shuffledPlayers.map((p: any, i: number) => prisma.roomPlayer.update({ where: { id: p.id }, data: { seat: i } })));

    // 2. Clear old game if exists
    try {
      const g = await prisma.game.findUnique({ where: { roomId: room.id } });
      if (g) await prisma.game.delete({ where: { roomId: room.id } });
    } catch { /* ignore */ }

    // 3. Create Game
    const settings: any = room.settings || {};
    const format = settings.gameFormat || 'CLASSIC';
    const roundsSeq = getRoundSequence(format);
    
    // Create game record
    const game = await prisma.game.create({
      data: {
        roomId: room.id,
        format,
        currentRound: 1,
        totalRounds: roundsSeq.length,
        state: 'RUNNING'
      }
    });

    // 4. Create Round 1
    const handSize = roundsSeq[0];
    // Dealer is usually determined by seat order. For round 1, let's say seat 0 is dealer (or last seat deals to first to start). 
    // Actually, dealer rotates. Let's pick random or start with seat 0.
    // If seat 0 is dealer, seat 1 starts.
    const dealerPlayer = shuffledPlayers[0]; 
    
    const round = await prisma.round.create({
      data: {
        gameId: game.id,
        number: 1,
        handSize,
        dealerId: dealerPlayer.id,
        phase: 'PREDICTION',
        predictionsCount: 0
      }
    });

    // 5. Deal cards
    // Fetch all cards
    const allCards = await prisma.card.findMany();
    // Filter deck based on settings
    const useKraken = !!settings.kraken;
    const useWhale = !!settings.whale;
    const useLoot = !!settings.loot;
    
    let deck = allCards.filter(c => {
       if (c.cardType === 'KRAKEN' && !useKraken) return false;
       if (c.cardType === 'WHITEWHALE' && !useWhale) return false;
       if (c.cardType === 'LOOT' && !useLoot) return false;
       // Remove special stuff if needed, but assuming basic deck + options
       return true;
    });

    deck = shuffle(deck);

    // Deal 'handSize' cards to each player
    let cardIdx = 0;
    // Sort players by seat for distribution logic if needed, but shuffledPlayers is fine order
    // We already assigned seats. Using shuffledPlayers loop is fine.
    
    for (const p of shuffledPlayers) {
      const hand = await prisma.hand.create({
        data: {
          roundId: round.id,
          playerId: p.id
        }
      });
      
      const cardsForPlayer = [];
      for(let i=0; i<handSize; i++) {
        if(cardIdx < deck.length) {
          cardsForPlayer.push(deck[cardIdx]);
          cardIdx++;
        }
      }
      
      // Save HandCards
      await Promise.all(cardsForPlayer.map((c, idx) => 
        prisma.handCard.create({
          data: {
            handId: hand.id,
            cardId: c.id,
            position: idx
          }
        })
      ));
    }

    // 6. Update room status
    const updated = await prisma.room.update({ 
      where: { id: room.id }, 
      data: { status: 'RUNNING' }, 
      include: ROOM_INCLUDE 
    });

    const io = getSocketServer();
    try {
      io?.to(code).emit('room-updated', { room: updated });
      io?.emit('game-started', { gameId: game.id }); 
      io?.emit('room-list-updated');
    } catch (e) { /* ignore socket errors */ }

    res.json({ room: updated, game });
  } catch (e) {
    next(e);
  }
}

export async function getRoomGame(req: Request, res: Response, next: NextFunction) {
  try {
    const code = req.params.code;
    console.log(`[getRoomGame] Fetching game for room ${code}`);

    const authReq = req as AuthRequest;
    const userId = authReq.user?.sub;
    if (!userId) {
      console.log('[getRoomGame] No userId');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) {
      console.log('[getRoomGame] Room not found');
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is player
    const player = await prisma.roomPlayer.findFirst({ where: { roomId: room.id, userId } });
    if (!player) {
      console.log(`[getRoomGame] User ${userId} is not a player in room ${room.id}`);
      return res.status(403).json({ error: 'Not a player of this room' });
    }

    const game = await prisma.game.findUnique({
      where: { roomId: room.id },
      include: {
        rounds: {
          orderBy: { number: 'desc' },
          take: 1, 
          include: {
            predictions: true,
            hands: {
              include: { 
                cards: { 
                    include: { card: true },
                    orderBy: { position: 'asc' }
                } 
              }
            },
            tricks: {
              orderBy: { index: 'asc' },
              include: { plays: { include: { handCard: { include: { card: true } } } } }
            }
          }
        }
      }
    });

    if (!game) {
      console.log(`[getRoomGame] Game not found for room ${room.id}`);
      return res.status(404).json({ error: 'Game not found' });
    }

    console.log(`[getRoomGame] Game found, sanitizing...`);

    // Sanitize
    const currentRound = game.rounds[0];
    if (currentRound) {
       const sanitizedHands = currentRound.hands.map((h: any) => {
         if (h.playerId === player.id) {
           return h; // My hand
         } else {
           // Others' hand: remove cards details
           return { ...h, cards: [] }; 
         }
       });
       (currentRound as any).hands = sanitizedHands;
    }

    res.json(game);
  } catch (e) {
    console.error('Error in getRoomGame:', e);
    next(e);
  }
}

export default { listRooms, getRoom, createRoom, updateRoom, deleteRoom, joinRoom, startRoom, getRoomGame };
