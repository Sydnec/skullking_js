import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import GameRoomPage from '../../components/GameRoomPage';

interface PageProps {
  params: Promise<{ roomCode: string }>;
}

export default async function RoomPage({ params }: PageProps) {
  const { roomCode } = await params;
  
  // Validate room code format
  if (!roomCode || roomCode.length !== 6) {
    notFound();
  }

  // Check if room exists
  try {
    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
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
      notFound();
    }    const roomData = {
      id: room.code,
      name: room.name || undefined,
      host: room.host.username,
      players: room.players.map(p => p.user.username),
      maxPlayers: room.maxPlayers,
      status: room.status.toLowerCase() as 'waiting' | 'playing' | 'finished',
      createdAt: room.createdAt.toISOString()
    };

    return <GameRoomPage roomData={roomData} />;
  } catch (error) {
    console.error('Error fetching room:', error);
    notFound();
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { roomCode } = await params;
  return {
    title: `Partie ${roomCode} - Skull King`,
    description: `Rejoignez la partie Skull King avec le code ${roomCode}`
  };
}
