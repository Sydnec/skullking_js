import express from 'express';
import { usersRouter } from './users.js';
import { roomsRouter } from './rooms.js';

export function setupApiRoutes() {
  const router = express.Router();

  // Mount route handlers
  router.use('/users', usersRouter);
  router.use('/rooms', roomsRouter);

  return router;
}
