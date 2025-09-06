import express from 'express';
import * as controller from './hands.controller';
import { requireAuth } from '../../../common/authMiddleware';

const router = express.Router();

router.get('/', controller.listHands);
router.get('/:id', controller.getHand);
router.post('/', requireAuth, controller.createHand);
router.put('/:id', requireAuth, controller.updateHand);
router.delete('/:id', requireAuth, controller.deleteHand);

export default router;
