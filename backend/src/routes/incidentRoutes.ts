import { Router } from 'express';
import { createIncident, getIncidents, updateIncident, deleteIncident, uploadImage, updateIncidentStatus } from '../controllers/incidentController';
import { protect, restrictTo } from '../middlewares/auth';
import { UserRole } from '../models/User';
import { incidentValidator } from '../middlewares/validators';

const router = Router();

router.use(protect);

router.post('/upload-image', uploadImage);

router.route('/')
  .post(incidentValidator, createIncident)
  .get(getIncidents);

router.patch('/:id/status', updateIncidentStatus);

router.route('/:id')
  .put(incidentValidator, updateIncident)
  .delete(restrictTo(UserRole.ADMIN, UserRole.DISASTER_OFFICER), deleteIncident);

export default router;
