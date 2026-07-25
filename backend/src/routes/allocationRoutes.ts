import { Router } from 'express';
import { optimizeAllocation, getActiveAllocations, updateAllocation, cancelAllocation, getAllocationHistory } from '../controllers/allocationController';
import { protect, restrictTo } from '../middlewares/auth';
import { UserRole } from '../models/User';
import { allocationValidator } from '../middlewares/validators';

const router = Router();

router.use(protect);

router.post('/optimize', restrictTo(UserRole.ADMIN, UserRole.DISASTER_OFFICER), allocationValidator, optimizeAllocation);
router.get('/active', getActiveAllocations);
router.get('/history', getAllocationHistory);

router.route('/:id')
  .put(restrictTo(UserRole.ADMIN, UserRole.DISASTER_OFFICER), updateAllocation)
  .delete(restrictTo(UserRole.ADMIN, UserRole.DISASTER_OFFICER), cancelAllocation);

export default router;
