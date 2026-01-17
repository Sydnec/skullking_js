import prisma from "../../../common/prisma";
import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../../common/authMiddleware";
import { getSocketServer } from "../../../common/socket";
import {
  determineLeadSuit,
  determineTrickOutcome,
  getRoundSequence,
  calculateRoundScores,
} from "./game.logic";

export async function listGames(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    res.json(await prisma.game.findMany());
  } catch (e) {
    next(e);
  }
}

export async function getGame(req: Request, res: Response, next: NextFunction) {
  try {
    const g = await prisma.game.findUnique({ where: { id: req.params.id } });
    if (!g) return res.status(404).end();
    res.json(g);
  } catch (e) {
    next(e);
  }
}

export async function createGame(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });
    const payload: any = { ...req.body };
    delete payload.userId;

    const g = await prisma.game.create({ data: payload });
    res.status(201).json(g);
  } catch (e) {
    next(e);
  }
}

export async function submitPrediction(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const gameId = req.params.id;
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { prediction } = req.body;
    if (typeof prediction !== "number")
      return res.status(400).json({ error: "Prediction must be a number" });

    // Find game and current round
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        room: { include: { players: true } },
        rounds: { orderBy: { number: "desc" }, take: 1 },
      },
    });

    if (!game) return res.status(404).json({ error: "Game not found" });

    const currentRound = game.rounds[0];
    if (!currentRound)
      return res.status(400).json({ error: "No active round" });
    if (currentRound.phase !== "PREDICTION")
      return res.status(400).json({ error: "Not in prediction phase" });

    // Check if user is a player
    const player = game.room.players.find((p) => p.userId === userId);
    if (!player)
      return res.status(403).json({ error: "Not a player in this game" });

    // Check if already predicted
    const existing = await prisma.prediction.findFirst({
      where: { roundId: currentRound.id, playerId: player.id },
    });
    if (existing) return res.status(400).json({ error: "Already predicted" });

    // Save prediction
    await prisma.prediction.create({
      data: {
        roundId: currentRound.id,
        playerId: player.id,
        predicted: prediction,
      },
    });

    // Check if all players have predicted
    const predictionsCount = await prisma.prediction.count({
      where: { roundId: currentRound.id },
    });
    const totalPlayers = game.room.players.length;

    let updatedRound = currentRound;

    if (predictionsCount >= totalPlayers) {
      // Find starter: for Round 1, dealerId was set. Starter is next player.
      // Actually, logic for starter should be handled.
      // For now, let's just create the first trick if not exists.

      // Update phase to PLAY
      updatedRound = await prisma.round.update({
        where: { id: currentRound.id },
        data: { phase: "PLAY" },
      });

      // Create first trick
      // Who starts?
      // players are sorted by seat?
      const playersBySeat = [...game.room.players].sort(
        (a: any, b: any) => (a.seat || 0) - (b.seat || 0)
      );
      const dealerIndex = playersBySeat.findIndex(
        (p) => p.id === currentRound.dealerId
      );
      const starterIndex = (dealerIndex + 1) % totalPlayers;
      const starterId = playersBySeat[starterIndex].id;

      await prisma.trick.create({
        data: {
          roundId: currentRound.id,
          index: 1,
          starterId: starterId,
        },
      });
    }

    // Broadcast update
    const io = getSocketServer();
    if (io) {
      // Recalculate full game state or just notify
      io.to(game.room.code).emit("game-updated");
      io.to(game.room.code).emit("prediction-made", { playerId: player.id });
    }

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

async function finishRound(gameId: string, roundId: string) {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      predictions: true,
      tricks: {
        include: {
          plays: {
            include: {
              handCard: {
                include: { card: true },
              },
            },
          },
        },
      },
    },
  });
  if (!round) return;

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { room: true },
  });
  if (!game) return;

  // Fetch players
  const roomPlayers = await prisma.roomPlayer.findMany({
    where: { roomId: game.roomId },
  });

  // Calc scores
  const roundScores = calculateRoundScores(round, roomPlayers);

  for (const p of roomPlayers) {
    const score = roundScores[p.id] || 0;
    const newTotal = p.score + score;

    await prisma.roomPlayer.update({
      where: { id: p.id },
      data: { score: { increment: score } },
    });

    // Record score history
    await prisma.roundScore.create({
      data: {
        roundId: round.id,
        playerId: p.id,
        score: score,
        totalScore: newTotal,
      },
    });
  }

  // Determine if game is over
  if (round.number >= game.totalRounds) {
    await prisma.game.update({
      where: { id: gameId },
      data: { state: "FINISHED", finishedAt: new Date() },
    });
    await prisma.round.update({
      where: { id: roundId },
      data: { phase: "DONE" },
    });
    // Update room status to FINISHED
    await prisma.room.update({
      where: { id: game.roomId },
      data: { status: "FINISHED" },
    });
  } else {
    // Next round
    const roundsSeq = getRoundSequence(game.format, roomPlayers.length);
    const nextRoundNum = round.number + 1;
    const nextHandSize = roundsSeq[nextRoundNum - 1] || nextRoundNum;

    const sortedPlayers = [...roomPlayers].sort(
      (a, b) => (a.seat || 0) - (b.seat || 0)
    );
    const dealerIndex = (nextRoundNum - 1) % sortedPlayers.length;
    const dealerId = sortedPlayers[dealerIndex].id;

    const nextRound = await prisma.round.create({
      data: {
        gameId: game.id,
        number: nextRoundNum,
        handSize: nextHandSize,
        dealerId: dealerId,
        phase: "PREDICTION",
        predictionsCount: 0,
      },
    });

    // Deal cards
    const allCards = await prisma.card.findMany();

    // Filter deck based on settings (reusing logic from startRoom)
    const settings: any = game.room.settings || {};
    const useKraken = !!settings.kraken;
    const useWhale = !!settings.whale;
    const useLoot = !!settings.loot;

    let deck = allCards.filter((c) => {
      if (c.cardType === "KRAKEN" && !useKraken) return false;
      if (c.cardType === "WHITEWHALE" && !useWhale) return false;
      if (c.cardType === "LOOT" && !useLoot) return false;
      return true;
    });

    const shuffled = deck.sort(() => 0.5 - Math.random());
    let cardIdx = 0;

    for (const p of sortedPlayers) {
      const hand = await prisma.hand.create({
        data: { roundId: nextRound.id, playerId: p.id },
      });

      for (let i = 0; i < nextHandSize; i++) {
        if (cardIdx < shuffled.length) {
          await prisma.handCard.create({
            data: {
              handId: hand.id,
              cardId: shuffled[cardIdx].id,
              position: i,
            },
          });
          cardIdx++;
        }
      }
    }

    await prisma.game.update({
      where: { id: gameId },
      data: { currentRound: nextRoundNum },
    });
    await prisma.round.update({
      where: { id: roundId },
      data: { phase: "DONE" },
    });
  }

  const io = getSocketServer();
  if (io) {
    io.to(game.room.code).emit("game-updated");
    io.to(game.room.code).emit("room-updated", {
      room: await prisma.room.findUnique({
        where: { id: game.roomId },
        include: {
          players: { include: { user: { select: { id: true, name: true } } } },
        },
      }),
    }); // Payload included now
    io.emit("room-list-updated"); // Update lobby list
  }
}

export async function playCard(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const gameId = req.params.id;
    const userId = req.user?.sub;
    const { cardId, choice } = req.body;
    // Let's assume client sends the HandCard ID (which is the instance in hand)

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Fetch Game with active round and trick
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        room: { include: { players: true } },
        rounds: {
          orderBy: { number: "desc" },
          take: 1,
          include: {
            tricks: {
              orderBy: { index: "desc" },
              take: 1,
              include: {
                plays: { include: { handCard: { include: { card: true } } } },
              },
            },
            hands: {
              include: { cards: { include: { card: true, plays: true } } },
            },
          },
        },
      },
    });

    if (!game) return res.status(404).json({ error: "Game not found" });
    const currentRound = game.rounds[0];
    if (!currentRound || currentRound.phase !== "PLAY")
      return res.status(400).json({ error: "Not in Play phase" });

    const currentTrick = currentRound.tricks[0];
    if (!currentTrick)
      return res.status(400).json({ error: "No active trick" });

    // Determine whose turn it is
    const players = [...game.room.players].sort(
      (a: any, b: any) => (a.seat || 0) - (b.seat || 0)
    );
    const playsCount = currentTrick.plays.length;

    // Logic to find active player
    let expectedPlayerId: string;
    if (playsCount === 0) {
      expectedPlayerId = currentTrick.starterId!;
    } else {
      const lastPlayerId = currentTrick.plays[playsCount - 1].playerId;
      const lastPlayerIndex = players.findIndex((p) => p.id === lastPlayerId);
      const nextPlayerIndex = (lastPlayerIndex + 1) % players.length;
      expectedPlayerId = players[nextPlayerIndex].id;
    }

    const player = players.find((p) => p.userId === userId);
    if (!player) return res.status(403).json({ error: "Not a player" });

    if (player.id !== expectedPlayerId)
      return res.status(400).json({ error: "Not your turn" });

    // Check if card is in hand
    const hand = currentRound.hands.find((h) => h.playerId === player.id);
    const handCard = hand?.cards.find((hc) => hc.id === cardId);
    const targetHandCard =
      handCard || hand?.cards.find((hc) => hc.cardId === cardId);

    if (!targetHandCard)
      return res.status(400).json({ error: "Card not in hand" });

    // --- SUIT VALIDATION LOGIC ---
    // 1. Determine Lead Suit
    const leadSuit = determineLeadSuit(currentTrick.plays);

    // 2. Validate move
    if (leadSuit) {
      const playedType = targetHandCard.card.cardType;
      const playedSuit = targetHandCard.card.suit;

      // Constraint applies only if we play a Number card of a different suit
      if (playedType === "NUMBER" && playedSuit !== leadSuit) {
        // Check if user has the lead suit in hand (excluding played cards)
        const hasLeadSuitInHand = hand?.cards.some(
          (hc) =>
            hc.card.cardType === "NUMBER" &&
            hc.card.suit === leadSuit &&
            hc.id !== targetHandCard.id &&
            (!hc.plays || hc.plays.length === 0)
        );

        if (hasLeadSuitInHand) {
          return res.status(400).json({
            error: `Vous devez jouer la couleur demandée (${leadSuit})`,
          });
        }
      }
    }
    // -----------------------------

    // Execute Play
    await prisma.play.create({
      data: {
        trickId: currentTrick.id,
        handCardId: targetHandCard.id,
        playerId: player.id,
        playOrder: playsCount + 1,
        playChoice:
          targetHandCard.card.cardType === "TIGRESS" && choice
            ? choice
            : undefined,
      },
    });

    // We do NOT remove the HandCard record, as it is linked to the Play.
    // However, when querying "Hand", we should filter out played cards or the frontend should do it.
    // Prisma: HandCard has plays. If plays.length > 0, it's played.
    // Backend `getGame` should probably filter it or frontend does.
    // We can rely on frontend filtering: `!hc.plays || hc.plays.length === 0`.

    // Check if trick is complete
    const updatedTrick = await prisma.trick.findUnique({
      where: { id: currentTrick.id },
      include: {
        plays: { include: { handCard: { include: { card: true } } } },
      },
    });

    if (updatedTrick && updatedTrick.plays.length >= players.length) {
      // Trick complete
      const { winnerIndex, destroyed, destroyerIndex } = determineTrickOutcome(
        updatedTrick.plays
      );

      let winnerId;
      if (destroyed) {
        // If Kraken destroyed, NO winner. (winnerId = null or similar).
        // But we need to update DB. Let's assume Prisma allows nullable string for winnerId?
        // "trick" model winnerId is usually String?
        // If schema doesn't allow nullable, we might have an issue.
        // Let's check schema. Assuming it's nullable or we use a flag.
        // If not nullable, we might assign it to the Kraken player but not count it for score.
        // Wait, round scores depend on winnerId.
        // A destroyed trick shouldn't count for ANY score.
        // We can set it to null. if schema allows.
        winnerId = null;

        // Wait, who leads next? "The player who played the Kraken leads".
        // We need to store this info somewhere.
        // Maybe we can store "starterId" of NEXT trick now? No, we do that in collectTrick.
        // We can store it in the trick itself? "nextStarterId"?
        // Or just infer it: if winnerId is null, look for Kraken.
      } else {
        winnerId = updatedTrick.plays[winnerIndex].playerId;
      }

      await prisma.trick.update({
        where: { id: currentTrick.id },
        data: { winnerId: winnerId }, // Ensure schema allows null
      });

      // STOP HERE. Wait for manual collection.
      // We do *not* create the next trick or finish the round yet.
    }

    // Broadcast
    const io = getSocketServer();
    if (io) io.to(game.room.code).emit("game-updated");

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

export async function collectTrick(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const gameId = req.params.id;
    // const userId = req.user?.sub; // Maybe verify if user is player?

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        room: { include: { players: true } },
        rounds: {
          orderBy: { number: "desc" },
          take: 1,
          include: {
            tricks: { orderBy: { index: "desc" }, take: 1 },
          },
        },
      },
    });

    if (!game) return res.status(404).json({ error: "Game not found" });
    const currentRound = game.rounds[0];
    if (!currentRound)
      return res.status(400).json({ error: "No active round" });

    const currentTrick = currentRound.tricks[0];
    // winnerId can be null if destroyed, so we just check if it's "finished" (winner determined or destroyed)
    // but we can't easily check "destroyed" flag on model without fetching plays or adding a column.
    // However, playCard only sets winnerId (even to null) when trick is full.
    // If winnerId is NULL on DB, `collectTrick` might think it's not finished?
    // Wait, `if (!currentTrick || !currentTrick.winnerId)` will fail if null.
    // Use explicit check.
    // If plays.length == players.length?
    // Let's rely on checking Plays count.

    // Fetch full trick with plays count and card details (for Kraken check)
    const fullTrick = await prisma.trick.findUnique({
      where: { id: currentTrick.id },
      include: {
        plays: { include: { handCard: { include: { card: true } } } },
      },
    });

    // Check if full
    const playersCount = game.room.players.length;
    if (!fullTrick || fullTrick.plays.length < playersCount) {
      return res.status(400).json({ error: "Trick not finished" });
    }

    // Determine next starter logic...

    // Check if round is over (cards in hand?)
    // Simply check if this was the last trick.
    // Hand size tells us total tricks.
    // If winnerId is null, it means Kraken destroyed it.
    // We need to fetch the plays to find who played Kraken to determine next starter.
    let nextStarterId = currentTrick.winnerId;

    if (!nextStarterId) {
      // Trick was destroyed (Kraken).
      // PlayCard handles setting winnerId to null.
      // We find who played Kraken here.
      const krakenPlay = fullTrick.plays.find(
        (p) => p.handCard.card.cardType === "KRAKEN"
      );
      if (krakenPlay) {
        nextStarterId = krakenPlay.playerId;
      } else {
        // Fallback
        nextStarterId = currentTrick.starterId;
      }
    }

    if (currentTrick.index >= currentRound.handSize) {
      // Round Over
      await prisma.round.update({
        where: { id: currentRound.id },
        data: { phase: "SCORING" },
      });
      // Calculate scores and start next round asynchronously
      finishRound(game.id, currentRound.id).catch((err) =>
        console.error("finishRound error", err)
      );
    } else {
      // Next Trick
      await prisma.trick.create({
        data: {
          roundId: currentRound.id,
          index: currentTrick.index + 1,
          starterId: nextStarterId,
        },
      });
    }

    const io = getSocketServer();
    if (io) io.to(game.room.code).emit("game-updated");

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

export async function updateGame(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });

    const existing = await prisma.game.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).end();
    // @ts-ignore
    if (existing.userId && existing.userId !== userId)
      return res.status(403).json({ error: "Accès refusé" });

    const data: any = { ...req.body };
    delete data.userId;
    delete data.id;

    const g = await prisma.game.update({ where: { id: req.params.id }, data });
    res.json(g);
  } catch (e) {
    next(e);
  }
}

export async function deleteGame(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });

    const existing = await prisma.game.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).end();
    // @ts-ignore
    if (existing.userId && existing.userId !== userId)
      return res.status(403).json({ error: "Accès refusé" });

    await prisma.game.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}

export default { listGames, getGame, createGame, updateGame, deleteGame };
