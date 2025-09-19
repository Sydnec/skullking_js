import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import apiRouter from './api';
import prisma from './common/prisma';
import { createServer } from 'http';
import { Server as IOServer } from 'socket.io';
import { setSocketServer } from './common/socket';

dotenv.config();

async function start() {
  const app = express();
  
  // parse allowed origins from env and trim spaces
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map(s => s.trim()).filter(Boolean)
    : ['*'];

  // Configuration CORS cohérente pour Express et Socket.IO
  const corsOptions = {
    origin: allowedOrigins.length === 1 && allowedOrigins[0] === '*' ? '*' : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };

  app.use(cors(corsOptions));
  app.use(express.json());

  // Debug middleware pour CORS
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    console.log(`🌐 Request from origin: ${origin}`);
    if (origin) {
      const allowed = corsOptions.origin === '*' ? ['*'] : Array.isArray(corsOptions.origin) ? corsOptions.origin : [corsOptions.origin];
      if (allowed[0] !== '*' && !allowed.includes(origin)) {
        console.log(`❌ Origin ${origin} not in allowed list: ${allowed.join(', ')}`);
      } else {
        console.log(`✅ Origin ${origin} is allowed`);
      }
    }
    next();
  });

  const httpServer = createServer(app);
  
  // Configuration Socket.IO CORS très permissive pour debug
  console.log('🔧 Initializing Socket.IO with CORS config...');
  console.log('🌐 ALLOWED_ORIGINS:', process.env.ALLOWED_ORIGINS);
  
  const io = new IOServer(httpServer, {
    cors: {
      // reuse the parsed allowed origins for Socket.IO
      origin: allowedOrigins.length === 1 && allowedOrigins[0] === '*' ? '*' : allowedOrigins,
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true
    },
    allowEIO3: true,
    transports: ['polling', 'websocket']
  });

  // Expose socket server reference
  setSocketServer(io);

  // In-memory presence tracking: roomCode -> Set of userIds
  const roomPresence: Record<string, Set<string>> = {};
  // socketId -> { code, userId }
  const socketMeta: Record<string, { code?: string, userId?: string }> = {};

  io.on('connection', (socket) => {
    // client announces they are viewing/joining a room
    socket.on('join-room', (payload: any) => {
      try {
        const { code, userId } = payload || {};
        if (!code) return;
        socket.join(code);
        socketMeta[socket.id] = { code, userId };
        if (!roomPresence[code]) roomPresence[code] = new Set();
        if (userId) roomPresence[code].add(userId);
        // emit presence update to room
        io.to(code).emit('presence-updated', { presentUserIds: Array.from(roomPresence[code]) });
      } catch (e) { /* ignore */ }
    });

    socket.on('disconnect', () => {
      const meta = socketMeta[socket.id];
      if (meta && meta.code) {
        const { code, userId } = meta;
        if (roomPresence[code] && userId) {
          // remove this user's presence, but only if no other sockets of same user remain
          roomPresence[code].delete(userId);
          io.to(code).emit('presence-updated', { presentUserIds: Array.from(roomPresence[code]) });
        }
      }
      delete socketMeta[socket.id];
    });
  });

  app.get('/health', async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true });
    } catch (e) {
      console.error('health check error', e);
      res.status(500).json({ ok: false, error: 'Erreur base de données' });
    }
  });

  // mount api
  app.use('/api', apiRouter);

  // swagger UI (optional)
  const openapiPath = path.join(__dirname, '../openapi.json');
  try {
    const swaggerMod = await import('swagger-ui-express');
    const swaggerUi = (swaggerMod as any).default ?? swaggerMod;
    if (fs.existsSync(openapiPath)) {
      const openapi = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
      app.use('/api-docs', (swaggerUi as any).serve, (swaggerUi as any).setup(openapi));
    }
  } catch (e) {
    // swagger not available — ignore
  }

  // error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(err?.status || 500).json({ error: err?.message || 'Erreur interne du serveur' });
  });

  const port = process.env.PORT || 3001;
  httpServer.listen(port, () => console.log(`API SkullKing démarrée sur http://localhost:${port}`));
}

start();
