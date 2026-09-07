import { Router } from 'express';
import {
  getDdrpsRanking,
  getValidationSummary,
  getModelMetrics,
  getLiveAlerts
} from '../controllers/researchController';

// Public read-only research outputs of the RADAR pipeline (no PII).
const router = Router();

router.get('/ddrps-ranking', getDdrpsRanking);
router.get('/validation-summary', getValidationSummary);
router.get('/model-metrics', getModelMetrics);
router.get('/live-alerts', getLiveAlerts);

export default router;
