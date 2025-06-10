'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

function SocketTestPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [roomId, setRoomId] = useState('TEST_ROOM');
  const [username, setUsername] = useState('TestUser');

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io('http://localhost:3001', {
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      addLog('✅ Connected to socket server');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      addLog('🔌 Disconnected from socket server');
      setConnected(false);
    });

    socketInstance.on('game-updated', (gameState) => {
      addLog(`🎮 Game state updated: ${JSON.stringify(gameState, null, 2)}`);
    });

    socketInstance.on('player-joined', (data) => {
      addLog(`👤 Player joined: ${JSON.stringify(data)}`);
    });

    socketInstance.on('error', (error) => {
      addLog(`❌ Error: ${error}`);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, []);

  const joinGame = () => {
    if (socket && connected) {
      addLog(`📨 Sending join-game event for room: ${roomId}`);
      socket.emit('join-game', {
        roomId,
        userId: `user-${Date.now()}`,
        username
      });
    }
  };

  const leaveGame = () => {
    if (socket && connected) {
      addLog(`📤 Sending leave-game event for room: ${roomId}`);
      socket.emit('leave-game', {
        roomId,
        userId: `user-${Date.now()}`
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Socket.IO Test Page</h1>
        
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            {connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Room ID</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={joinGame}
              disabled={!connected}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Join Game
            </button>
            <button
              onClick={leaveGame}
              disabled={!connected}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Leave Game
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Event Log</h2>
          <div className="bg-gray-50 rounded-md p-4 h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No events logged yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-2 text-sm font-mono">
                  {log}
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => setLogs([])}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Clear Log
          </button>
        </div>
      </div>    </div>
  );
}

export default SocketTestPage;
