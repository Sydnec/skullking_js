import express from 'express';
import * as controller from './plays.controller';
import { requireAuth } from '../../../common/authMiddleware';

const router = express.Router();

router.get('/', controller.listPlays);
router.get('/:id', controller.getPlay);
router.post('/', requireAuth, controller.createPlay);
router.put('/:id', requireAuth, controller.updatePlay);
router.delete('/:id', requireAuth, controller.deletePlay);

export default router;
