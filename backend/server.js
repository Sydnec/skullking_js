import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupGameSocketHandlers } from './src/game/game-logic.js';
import { setupApiRoutes } from './src/api/routes.js';
import { logger } from './src/utils/logger.js';

// Load environment variables
dotenv.config();

const app = express();
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3001;

// Validate environment variables in production
if (NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  logger.error('DATABASE_URL environment variable is required in production');
  process.exit(1);
}

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allowed origins list
    const allowedOrigins = NODE_ENV === 'production' 
      ? (process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [
          'https://skullking-pcr.vercel.app',
          'https://skullking-api.duckdns.org'
        ])
      : [
          'http://localhost:3000', 
          'http://localhost:3001',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001'
        ];

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      logger.info(`CORS: Allowing origin ${origin}`);
      return callback(null, true);
    } else {
      logger.warn(`CORS: Blocking origin ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
      return callback(new Error(`CORS policy: Origin ${origin} not allowed`), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middlewares
// Force HTTPS redirect in production (only when behind nginx)
if (NODE_ENV === 'production' && process.env.FORCE_HTTPS === 'true') {
  app.use((req, res, next) => {
    // Check if request comes from nginx (X-Forwarded-Proto header)
    if (req.header('x-forwarded-proto') && req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS debugging middleware (only in development)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path} - Origin: ${req.get('Origin') || 'No origin'}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (_req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime)}s`,
    memory: {
      used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
    },
    environment: NODE_ENV,
    ssl: 'handled by nginx'
  });
});

// API routes
app.use('/api', setupApiRoutes());

// Create HTTP server (SSL is handled by nginx)
const server = createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6, // 1MB
  allowEIO3: true
});

logger.info('Setting up Socket.IO game handlers...');
setupGameSocketHandlers(io);

// Error handling middleware
app.use((err, _req, res, next) => {
  logger.error('Express middleware error:', { error: err.message });
  res.status(500).json({ 
    error: NODE_ENV === 'production' ? 'Internal Server Error' : err.message 
  });
});

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  logger.success(`Backend server ready on http://0.0.0.0:${PORT}`);
  logger.info(`Environment: ${NODE_ENV}`);
  logger.info(`Protocol: HTTP (SSL handled by nginx)`);
  if (NODE_ENV === 'production') {
    logger.info('Production mode: HTTPS termination handled by nginx reverse proxy');
  }
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.warn(`${signal} received, shutting down gracefully`);
  server.close(() => {
    logger.success('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
