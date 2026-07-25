import { Router } from 'express';
import { getAnalyticsStats } from '../controllers/analyticsController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.get('/stats', authenticateJWT, getAnalyticsStats);

export default router;
