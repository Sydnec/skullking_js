import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidRoomCode } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ code: string }>;
}

// GET /api/rooms/[code] - Récupérer les détails d'une room
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;

    if (!isValidRoomCode(code)) {
      return NextResponse.json(
        { error: 'Code de room invalide' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Room non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({
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
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// POST /api/rooms/[code]/join - Rejoindre une room
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const { userId } = await request.json();

    if (!isValidRoomCode(code) || !userId) {
      return NextResponse.json(
        { error: 'Données invalides' },
        { status: 400 }
      );
    }

    // Vérifier que la room existe et peut être rejointe
    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        players: true
      }
    });

    if (!room) {
      return NextResponse.json(
        { error: 'Room non trouvée' },
        { status: 404 }
      );
    }

    if (room.status !== 'WAITING') {
      return NextResponse.json(
        { error: 'Cette partie a déjà commencé' },
        { status: 400 }
      );
    }

    if (room.players.length >= room.maxPlayers) {
      return NextResponse.json(
        { error: 'Cette partie est complète' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur existe et n'est pas déjà dans la room
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
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
      return NextResponse.json(
        { error: 'Vous êtes déjà dans cette partie' },
        { status: 400 }
      );
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

    return NextResponse.json({
      room: {
        id: updatedRoom!.code,
        name: updatedRoom!.name,
        host: updatedRoom!.host.username,
        players: updatedRoom!.players.map(p => p.user.username),
        maxPlayers: updatedRoom!.maxPlayers,
        status: updatedRoom!.status.toLowerCase(),
        createdAt: updatedRoom!.createdAt
      }
    });
  } catch (error) {
    console.error('Erreur lors de la jonction à la room:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// DELETE /api/rooms/[code] - Quitter une room
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const { userId } = await request.json();

    if (!isValidRoomCode(code)) {
      return NextResponse.json(
        { error: 'Code de room invalide' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'ID utilisateur manquant' },
        { status: 400 }
      );
    }

    // Vérifier que la room existe
    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        players: true
      }
    });

    if (!room) {
      return NextResponse.json(
        { error: 'Room non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur est dans la room
    const playerInRoom = room.players.find(p => p.userId === userId);
    if (!playerInRoom) {
      return NextResponse.json(
        { error: 'Utilisateur pas dans cette room' },
        { status: 400 }
      );
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

      return NextResponse.json({ 
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

      return NextResponse.json({ 
        message: 'Room quittée avec succès',
        roomDeleted: false
      });
    }

  } catch (error) {
    console.error('Erreur lors de la sortie de la room:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
