import express from 'express';
import * as controller from './games.controller';
import { requireAuth } from '../../../common/authMiddleware';

const router = express.Router();

router.get('/', controller.listGames);
router.get('/:id', controller.getGame);
router.post('/', requireAuth, controller.createGame);
router.post('/:id/prediction', requireAuth, controller.submitPrediction);
router.post('/:id/play', requireAuth, controller.playCard);
router.post('/:id/collect', requireAuth, controller.collectTrick);
router.put('/:id', requireAuth, controller.updateGame);
router.delete('/:id', requireAuth, controller.deleteGame);

export default router;
