import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateRoomCode } from '@/lib/utils';

// GET /api/rooms - Lister toutes les rooms disponibles
export async function GET() {
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

    return NextResponse.json({ rooms: formattedRooms });
  } catch (error) {
    console.error('Erreur lors de la récupération des rooms:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// POST /api/rooms - Créer une nouvelle room
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Générer un code unique pour la room
    let roomCode: string;
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
      return NextResponse.json(
        { error: 'Impossible de générer un code unique' },
        { status: 500 }
      );
    }    // Créer la room et ajouter l'hôte comme joueur
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
    });return NextResponse.json({
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
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
