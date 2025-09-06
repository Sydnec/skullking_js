import express from 'express';
import * as controller from './messages.controller';
import requireAuth from '../../../common/authMiddleware';

const router = express.Router();

router.get('/', controller.listMessages);
router.get('/:id', controller.getMessage);
router.get('/room/:code', controller.listMessagesForRoom);
router.post('/', requireAuth, controller.createMessage);
router.put('/:id', requireAuth, controller.updateMessage);
router.delete('/:id', requireAuth, controller.deleteMessage);

export default router;
