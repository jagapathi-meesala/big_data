import { Router } from 'express';
import { getAnalyticsStats, syncLiveDisastersController } from '../controllers/analyticsController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.get('/stats', authenticateJWT, getAnalyticsStats);
router.post('/sync-live', authenticateJWT, syncLiveDisastersController);

export default router;
