import express from 'express';
import { prisma } from '../database/prisma.js';
import { isValidUsername } from '../utils/validation.js';

export const usersRouter = express.Router();

// GET /api/users?username=xxx - Vérifier si un nom d'utilisateur est disponible
usersRouter.get('/', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || !isValidUsername(username)) {
      return res.status(400).json({
        error: 'Nom d\'utilisateur invalide'
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username: username.trim() }
    });

    res.json({
      available: !existingUser,
      username: username.trim()
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du nom d\'utilisateur:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur'
    });
  }
});

// POST /api/users - Créer un nouvel utilisateur
usersRouter.post('/', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || !isValidUsername(username)) {
      return res.status(400).json({
        error: 'Nom d\'utilisateur invalide'
      });
    }

    const trimmedUsername = username.trim();

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { username: trimmedUsername }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Ce nom d\'utilisateur est déjà pris'
      });
    }

    // Créer l'utilisateur
    const newUser = await prisma.user.create({
      data: {
        username: trimmedUsername,
        isOnline: true
      }
    });

    res.json({
      user: {
        id: newUser.id,
        username: newUser.username,
        isOnline: newUser.isOnline
      }
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur'
    });
  }
});

// GET /api/users/:id - Récupérer un utilisateur par ID
usersRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'ID utilisateur manquant'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    res.json({ user });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur'
    });
  }
});

// PATCH /api/users/:id - Marquer un utilisateur comme hors ligne
usersRouter.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isOnline } = req.body;

    if (!id) {
      return res.status(400).json({
        error: 'ID utilisateur manquant'
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isOnline }
    });

    res.json({ user });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur'
    });
  }
});

// DELETE /api/users/:id - Déconnecter et nettoyer un utilisateur
usersRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'ID utilisateur manquant'
      });
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        playerRooms: {
          include: {
            room: {
              include: {
                players: true
              }
            }
          }
        },
        hostedRooms: {
          include: {
            players: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    // Collecter toutes les rooms où l'utilisateur est présent
    const roomsToCheck = new Set();
    
    // Ajouter les rooms où l'utilisateur est joueur
    user.playerRooms.forEach(playerRoom => {
      roomsToCheck.add(playerRoom.room.id);
    });

    // Ajouter les rooms où l'utilisateur est hôte
    user.hostedRooms.forEach(room => {
      roomsToCheck.add(room.id);
    });

    // Supprimer l'utilisateur (cela supprimera automatiquement ses relations)
    await prisma.user.delete({
      where: { id }
    });

    // Vérifier et nettoyer les rooms vides
    for (const roomId of roomsToCheck) {
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
          players: true
        }
      });

      // Si la room existe encore et n'a plus de joueurs, la supprimer
      if (room && room.players.length === 0) {
        await prisma.room.delete({
          where: { id: roomId }
        });
      }
    }

    res.json({ 
      message: 'Utilisateur déconnecté et nettoyage effectué',
      roomsCleaned: Array.from(roomsToCheck).length
    });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur'
    });
  }
});

// POST /api/users/disconnect - Déconnexion via beacon (fermeture navigateur)
usersRouter.post('/disconnect', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'ID utilisateur manquant'
      });
    }

    // Réutiliser la logique du DELETE
    const deleteResponse = await fetch(`/api/users/${userId}`, {
      method: 'DELETE'
    });

    if (!deleteResponse.ok) {
      throw new Error('Erreur lors de la déconnexion');
    }

    const result = await deleteResponse.json();
    res.json(result);
  } catch (error) {
    console.error('Erreur lors de la déconnexion beacon:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur'
    });
  }
});
