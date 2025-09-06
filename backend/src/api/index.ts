import v1 from './v1';
import express from 'express';

const apiRouter = express.Router();

apiRouter.use('/v1', v1);

export default apiRouter;