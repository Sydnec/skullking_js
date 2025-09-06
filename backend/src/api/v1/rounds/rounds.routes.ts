import express from 'express';
import * as controller from './rounds.controller';
import { requireAuth } from '../../../common/authMiddleware';

const router = express.Router();

router.get('/', controller.listRounds);
router.get('/:id', controller.getRound);
router.post('/', requireAuth, controller.createRound);
router.put('/:id', requireAuth, controller.updateRound);
router.delete('/:id', requireAuth, controller.deleteRound);

export default router;
