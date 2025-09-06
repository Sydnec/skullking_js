import express from 'express';
import * as controller from './tricks.controller';
import { requireAuth } from '../../../common/authMiddleware';

const router = express.Router();

router.get('/', controller.listTricks);
router.get('/:id', controller.getTrick);
router.post('/', requireAuth, controller.createTrick);
router.put('/:id', requireAuth, controller.updateTrick);
router.delete('/:id', requireAuth, controller.deleteTrick);

export default router;
