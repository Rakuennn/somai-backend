import express from 'express';
import authRouter from './modules/auth/router';
import contentRouter from './modules/content/router';

const router = express.Router();

router.use(authRouter);
router.use(contentRouter);

export default router;