import { Router } from 'express';
import { getNotifications, createNotification } from '../controllers/notificationController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.get('/', authenticateJWT, getNotifications);
router.post('/', authenticateJWT, createNotification);

export default router;
