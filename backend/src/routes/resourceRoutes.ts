import { Router } from 'express';
import { createResource, getResources, updateResource, deleteResource, updateResourceLocation } from '../controllers/resourceController';
import { protect, restrictTo } from '../middlewares/auth';
import { UserRole } from '../models/User';
import { resourceValidator } from '../middlewares/validators';

const router = Router();

router.use(protect);

router.route('/')
  .post(resourceValidator, createResource)
  .get(getResources);

router.route('/:id')
  .put(resourceValidator, updateResource)
  .delete(restrictTo(UserRole.ADMIN, UserRole.DISASTER_OFFICER), deleteResource);

router.route('/:id/location')
  .put(updateResourceLocation);

export default router;
