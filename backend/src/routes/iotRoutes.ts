import { Router } from 'express';
import { registerDevice, receiveTelemetry, getHealthSummary } from '../controllers/iotController';

const router = Router();

router.post('/register', registerDevice);
router.post('/telemetry', receiveTelemetry);
router.get('/health', getHealthSummary);

export default router;
