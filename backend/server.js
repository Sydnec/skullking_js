import express from 'express';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { readFileSync } from 'fs';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupGameSocketHandlers } from './src/game/game-logic.js';
import { setupApiRoutes } from './src/api/routes.js';
import { logger } from './src/utils/logger.js';

// Load environment variables
dotenv.config();

const app = express();

// Create server based on environment
let server;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (NODE_ENV === 'production' && process.env.SSL_CERT_PATH && process.env.SSL_KEY_PATH) {
  // HTTPS server for production with SSL certificates
  try {
    const httpsOptions = {
      key: readFileSync(process.env.SSL_KEY_PATH),
      cert: readFileSync(process.env.SSL_CERT_PATH)
    };
    
    // Add certificate chain if provided
    if (process.env.SSL_CA_PATH) {
      httpsOptions.ca = readFileSync(process.env.SSL_CA_PATH);
    }
    
    server = createHttpsServer(httpsOptions, app);
    logger.success('HTTPS server configured with SSL certificates');
  } catch (error) {
    logger.error('Failed to load SSL certificates:', error.message);
    logger.warn('Falling back to HTTP server');
    server = createServer(app);
  }
} else {
  // HTTP server for development or production without SSL
  server = createServer(app);
  if (NODE_ENV === 'production') {
    logger.warn('Running in production mode without HTTPS. Consider adding SSL certificates.');
  }
}

// Configuration
const PORT = process.env.PORT || 3001;

// Validate environment variables in production
if (NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  logger.error('DATABASE_URL environment variable is required in production');
  process.exit(1);
}

// CORS configuration
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://skullking-pcr.vercel.app']
    : ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middlewares
// Force HTTPS in production
if (NODE_ENV === 'production' && process.env.FORCE_HTTPS === 'true') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
    environment: NODE_ENV
  });
});

// API routes
app.use('/api', setupApiRoutes());

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

logger.socket('Socket.IO server initialized');

// Setup game logic handlers
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
  const protocol = (NODE_ENV === 'production' && process.env.SSL_CERT_PATH && process.env.SSL_KEY_PATH) ? 'https' : 'http';
  logger.success(`Backend server ready on ${protocol}://0.0.0.0:${PORT}`);
  logger.info(`Environment: ${NODE_ENV}`);
  logger.info(`Protocol: ${protocol.toUpperCase()}`);
  logger.database(`Database: ${process.env.DATABASE_URL || 'Not configured'}`);
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
