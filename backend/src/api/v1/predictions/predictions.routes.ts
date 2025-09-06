import express from 'express';
import * as controller from './predictions.controller';
import { requireAuth } from '../../../common/authMiddleware';

const router = express.Router();

router.get('/', controller.listPredictions);
router.get('/:id', controller.getPrediction);
router.post('/', requireAuth, controller.createPrediction);
router.put('/:id', requireAuth, controller.updatePrediction);
router.delete('/:id', requireAuth, controller.deletePrediction);

export default router;
