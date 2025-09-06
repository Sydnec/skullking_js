import express from 'express';
import * as controller from './cards.controller';
import { requireAuth } from '../../../common/authMiddleware';

const router = express.Router();

router.get('/', controller.listCards);
router.get('/:id', controller.getCard);
router.post('/', requireAuth, controller.createCard);
router.put('/:id', requireAuth, controller.updateCard);
router.delete('/:id', requireAuth, controller.deleteCard);

export default router;
