import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/users/disconnect - Déconnexion via beacon (fermeture navigateur)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'ID utilisateur manquant' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Collecter toutes les rooms où l'utilisateur est présent
    const roomsToCheck = new Set<string>();
    
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
      where: { id: userId }
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

    return NextResponse.json({ 
      message: 'Utilisateur déconnecté et nettoyage effectué',
      roomsCleaned: Array.from(roomsToCheck).length
    });

  } catch (error) {
    console.error('Erreur lors de la déconnexion beacon:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
