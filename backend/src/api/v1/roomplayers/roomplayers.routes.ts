import express from 'express';
import * as controller from './roomplayers.controller';
import requireAuth from '../../../common/authMiddleware';

const router = express.Router();

router.get('/', controller.listRoomPlayers);
router.get('/:id', controller.getRoomPlayer);
router.post('/', requireAuth, controller.createRoomPlayer);
router.put('/:id', requireAuth, controller.updateRoomPlayer);
router.delete('/:id', requireAuth, controller.deleteRoomPlayer);

export default router;
