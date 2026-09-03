import { Router } from 'express';
import { getUsers, getUserById, updateProfile, updateUserStatus, assignRole, deleteUser, changePassword } from '../controllers/userController';
import { protect, restrictTo } from '../middlewares/auth';
import { UserRole } from '../models/User';

const router = Router();

router.use(protect);

router.put('/profile', updateProfile);
router.put('/change-password', changePassword);

router.route('/')
  .get(restrictTo(UserRole.ADMIN, UserRole.DISASTER_OFFICER), getUsers);

router.route('/:id')
  .get(restrictTo(UserRole.ADMIN, UserRole.DISASTER_OFFICER), getUserById)
  .delete(restrictTo(UserRole.ADMIN), deleteUser);

router.patch('/:id/status', restrictTo(UserRole.ADMIN, UserRole.DISASTER_OFFICER), updateUserStatus);
router.patch('/:id/role', restrictTo(UserRole.ADMIN), assignRole);

export default router;
