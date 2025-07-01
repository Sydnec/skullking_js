import { redirect } from 'next/navigation';
import GameRoomPage from '../../components/GameRoomPage';

interface PageProps {
  params: Promise<{ roomCode: string }>;
}

export default async function RoomPage({ params }: PageProps) {
  const { roomCode } = await params;
  
  // Validate room code format
  if (!roomCode || roomCode.length !== 6) {
    redirect('/');
  }

  // Check if room exists via API
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/rooms/${roomCode.toUpperCase()}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        redirect('/');
      }
      throw new Error('Failed to fetch room data');
    }
    
    const room = await response.json();

    if (!room) {
      redirect('/');
    }
    
    const roomData = {
      id: room.code,
      name: room.name || undefined,
      host: room.host?.username || 'Unknown',
      players: room.players?.map((p: { user?: { username: string }; username?: string }) => 
        p.user?.username || p.username || 'Unknown'
      ) || [],
      maxPlayers: room.maxPlayers,
      status: (room.status?.toLowerCase() || 'waiting') as 'waiting' | 'playing' | 'finished',
      createdAt: room.createdAt
    };

    return <GameRoomPage roomData={roomData} />;
  } catch (error) {
    console.error('Error fetching room:', error);
    redirect('/');
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { roomCode } = await params;
  return {
    title: `Partie ${roomCode} - Skull King`,
    description: `Rejoignez la partie Skull King avec le code ${roomCode}`
  };
}
