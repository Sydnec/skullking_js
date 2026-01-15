import express from 'express';
import * as controller from './rooms.controller';
import requireAuth from '../../../common/authMiddleware';

const router = express.Router();

router.get('/', controller.listRooms);
router.get('/:code/game', requireAuth, controller.getRoomGame);
router.get('/:code', controller.getRoom);
router.post('/', requireAuth, controller.createRoom);
router.put('/:code', requireAuth, controller.updateRoom);
router.delete('/:code', requireAuth, controller.deleteRoom);
router.post('/:code/join', requireAuth, controller.joinRoom);
router.post('/:code/start', requireAuth, controller.startRoom);

export default router;
