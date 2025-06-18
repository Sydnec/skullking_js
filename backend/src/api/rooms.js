import express from 'express';
import { prisma } from '../database/prisma.js';
import { isValidRoomCode, generateRoomCode } from '../utils/validation.js';

export const roomsRouter = express.Router();

// GET /api/rooms - Lister toutes les rooms disponibles
roomsRouter.get('/', async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      where: {
        status: {
          in: ['WAITING', 'PLAYING']
        }
      },
      include: {
        host: {
          select: { username: true }
        },
        players: {
          include: {
            user: {
              select: { username: true }
            }
          }
        },
        _count: {
          select: { players: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedRooms = rooms.map(room => ({
      id: room.code,
      name: room.name,
      host: room.host.username,
      players: room.players.map(p => p.user.username),
      maxPlayers: room.maxPlayers,
      status: room.status.toLowerCase(),
      createdAt: room.createdAt
    }));

    res.json({ rooms: formattedRooms });
  } catch (error) {
    console.error('Erreur lors de la récupération des rooms:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur'
    });
  }
});

// GET /api/rooms/:code - Récupérer une room spécifique par son code
roomsRouter.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    if (!isValidRoomCode(code)) {
      return res.status(400).json({
        error: 'Code de room invalide'
      });
    }

    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        host: {
          select: { username: true }
        },
        players: {
          include: {
            user: {
              select: { username: true, id: true }
            }
          }
        }
      }
    });

    if (!room) {
      return res.status(404).json({
        error: 'Room non trouvée'
      });
    }

    const formattedRoom = {
      code: room.code,
      name: room.name,
      host: room.host,
      players: room.players,
      maxPlayers: room.maxPlayers,
      status: room.status,
      createdAt: room.createdAt
    };

    res.json(formattedRoom);
  } catch (error) {
    console.error('Erreur lors de la récupération de la room:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur'
    });
  }
});

// POST /api/rooms - Créer une nouvelle room
roomsRouter.post('/', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Données manquantes'
      });
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    // Générer un code unique pour la room
    let roomCode;
    let attempts = 0;
    do {
      roomCode = generateRoomCode();
      const existingRoom = await prisma.room.findUnique({
        where: { code: roomCode }
      });
      if (!existingRoom) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return res.status(500).json({
        error: 'Impossible de générer un code unique'
      });
    }

    // Créer la room et ajouter l'hôte comme joueur
    const room = await prisma.room.create({
      data: {
        code: roomCode,
        hostId: userId,
        players: {
          create: {
            userId: userId
          }
        }
      },
      include: {
        host: {
          select: { username: true }
        },
        players: {
          include: {
            user: {
              select: { username: true }
            }
          }
        }
      }
    });

    res.json({
      room: {
        id: room.code,
        name: room.name,
        host: room.host.username,
        players: room.players.map(p => p.user.username),
        maxPlayers: room.maxPlayers,
        status: room.status.toLowerCase(),
        createdAt: room.createdAt
      }
    });
  } catch (error) {
    console.error('Erreur lors de la création de la room:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur'
    });
  }
});

// GET /api/rooms/:code - Récupérer les détails d'une room
roomsRouter.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    if (!isValidRoomCode(code)) {
      return res.status(400).json({
        error: 'Code de room invalide'
      });
    }

    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        host: {
          select: { username: true }
        },
        players: {
          include: {
            user: {
              select: { username: true }
            }
          }
        }
      }
    });

    if (!room) {
      return res.status(404).json({
        error: 'Room non trouvée'
      });
    }

    res.json({
      room: {
        id: room.code,
        name: room.name,
        host: room.host.username,
        players: room.players.map(p => p.user.username),
        maxPlayers: room.maxPlayers,
        status: room.status.toLowerCase(),
        createdAt: room.createdAt
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la room:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur'
    });
  }
});

// POST /api/rooms/:code/join - Rejoindre une room
roomsRouter.post('/:code/join', async (req, res) => {
  try {
    const { code } = req.params;
    const { userId } = req.body;

    if (!isValidRoomCode(code) || !userId) {
      return res.status(400).json({
        error: 'Données invalides'
      });
    }

    // Vérifier que la room existe et peut être rejointe
    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        players: true
      }
    });

    if (!room) {
      return res.status(404).json({
        error: 'Room non trouvée'
      });
    }

    if (room.status !== 'WAITING') {
      return res.status(400).json({
        error: 'Cette partie a déjà commencé'
      });
    }

    if (room.players.length >= room.maxPlayers) {
      return res.status(400).json({
        error: 'Cette partie est complète'
      });
    }

    // Vérifier que l'utilisateur existe et n'est pas déjà dans la room
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    const existingPlayer = await prisma.roomPlayer.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId: room.id
        }
      }
    });

    if (existingPlayer) {
      return res.status(400).json({
        error: 'Vous êtes déjà dans cette partie'
      });
    }

    // Ajouter le joueur à la room
    await prisma.roomPlayer.create({
      data: {
        userId,
        roomId: room.id
      }
    });

    // Récupérer la room mise à jour
    const updatedRoom = await prisma.room.findUnique({
      where: { code },
      include: {
        host: {
          select: { username: true }
        },
        players: {
          include: {
            user: {
              select: { username: true }
            }
          }
        }
      }
    });

    res.json({
      room: {
        id: updatedRoom.code,
        name: updatedRoom.name,
        host: updatedRoom.host.username,
        players: updatedRoom.players.map(p => p.user.username),
        maxPlayers: updatedRoom.maxPlayers,
        status: updatedRoom.status.toLowerCase(),
        createdAt: updatedRoom.createdAt
      }
    });
  } catch (error) {
    console.error('Erreur lors de la jonction à la room:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur'
    });
  }
});

// DELETE /api/rooms/:code - Quitter une room
roomsRouter.delete('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { userId } = req.body;

    if (!isValidRoomCode(code)) {
      return res.status(400).json({
        error: 'Code de room invalide'
      });
    }

    if (!userId) {
      return res.status(400).json({
        error: 'ID utilisateur manquant'
      });
    }

    // Vérifier que la room existe
    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        players: true
      }
    });

    if (!room) {
      return res.status(404).json({
        error: 'Room non trouvée'
      });
    }

    // Vérifier que l'utilisateur est dans la room
    const playerInRoom = room.players.find(p => p.userId === userId);
    if (!playerInRoom) {
      return res.status(400).json({
        error: 'Utilisateur pas dans cette room'
      });
    }

    // Supprimer le joueur de la room
    await prisma.roomPlayer.delete({
      where: { id: playerInRoom.id }
    });

    // Vérifier si la room est maintenant vide
    const remainingPlayers = await prisma.roomPlayer.count({
      where: { roomId: room.id }
    });

    if (remainingPlayers === 0) {
      // Supprimer la room vide
      await prisma.room.delete({
        where: { id: room.id }
      });

      return res.json({ 
        message: 'Room quittée et supprimée car vide',
        roomDeleted: true
      });
    } else {
      // Si l'hôte quitte, transférer à un autre joueur
      if (room.hostId === userId) {
        const newHost = await prisma.roomPlayer.findFirst({
          where: { roomId: room.id }
        });

        if (newHost) {
          await prisma.room.update({
            where: { id: room.id },
            data: { hostId: newHost.userId }
          });
        }
      }

      return res.json({ 
        message: 'Room quittée avec succès',
        roomDeleted: false
      });
    }
  } catch (error) {
    console.error('Erreur lors de la sortie de la room:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur'
    });
  }
});
