// Types pour l'API
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface User {
  id: string;
  username: string;
  isOnline: boolean;
}

export interface Room {
  id: string; // Le code de la room
  name?: string; // Nom optionnel
  host: string;
  players: string[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (
  process.env.NODE_ENV === 'production' || (typeof window !== 'undefined' && window.location.hostname !== 'localhost')
    ? 'https://skullking-api.duckdns.org' // Backend auto-hébergé sur Raspberry Pi
    : 'http://localhost:3001'
);

// Services API
export class UserService {
  static async checkUsername(username: string): Promise<{ available: boolean; username: string }> {
    const response = await fetch(`${API_BASE_URL}/api/users?username=${encodeURIComponent(username)}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de la vérification');
    }
    return response.json();
  }

  static async createUser(username: string): Promise<{ user: User }> {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de la création');
    }
    return response.json();
  }

  static async disconnectUser(userId: string): Promise<{ message: string; roomsCleaned: number }> {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de la déconnexion');
    }
    return response.json();
  }
  static async updateUserStatus(userId: string, isOnline: boolean): Promise<{ user: User }> {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOnline })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de la mise à jour');
    }
    return response.json();
  }

  static async getUserById(userId: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Utilisateur non trouvé');
    }
    const result = await response.json();
    return result.user;
  }
}

export class RoomService {
  static async getRooms(): Promise<{ rooms: Room[] }> {
    const response = await fetch(`${API_BASE_URL}/api/rooms`);
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des rooms');
    }
    return response.json();
  }
  static async createRoom(userId: string): Promise<{ room: Room }> {
    const response = await fetch(`${API_BASE_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de la création');
    }
    return response.json();
  }
  static async joinRoom(roomCode: string, userId: string): Promise<{ room: Room }> {
    const response = await fetch(`${API_BASE_URL}/api/rooms/${roomCode}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de la jonction');
    }
    return response.json();
  }

  static async getRoomDetails(roomCode: string): Promise<{ room: Room }> {
    const response = await fetch(`${API_BASE_URL}/api/rooms/${roomCode}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Room non trouvée');
    }
    return response.json();
  }

  static async leaveRoom(roomCode: string, userId: string): Promise<{ message: string; roomDeleted: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/rooms/${roomCode}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de la sortie');
    }
    return response.json();
  }
}
