import { Router } from 'express';
import { generatePdfReport } from '../controllers/reportController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.get('/pdf', authenticateJWT, generatePdfReport);

export default router;
