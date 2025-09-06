import express from 'express';
import * as controller from './handcards.controller';
import { requireAuth } from '../../../common/authMiddleware';

const router = express.Router();

router.get('/', controller.listHandCards);
router.get('/:id', controller.getHandCard);
router.post('/', requireAuth, controller.createHandCard);
router.put('/:id', requireAuth, controller.updateHandCard);
router.delete('/:id', requireAuth, controller.deleteHandCard);

export default router;
