import { Server as IOServer } from 'socket.io';

let io: IOServer | null = null;

export function setSocketServer(server: IOServer) {
  io = server;
}

export function getSocketServer(): IOServer | null {
  return io;
}
