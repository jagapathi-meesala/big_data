import { Router } from 'express';
import { getLiveWeather } from '../controllers/weatherController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.get('/live', authenticateJWT, getLiveWeather);

export default router;
