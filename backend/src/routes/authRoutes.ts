import { Router } from 'express';
import { register, login, refresh, forgotPassword, resetPassword, recoverEmail } from '../controllers/authController';
import { registerValidator, loginValidator } from '../middlewares/validators';
import { protect, restrictTo } from '../middlewares/auth';
import { UserRole } from '../models/User';
import { seedDatabase } from '../config/seed';

const router = Router();

// Destructive: wipes and reseeds users/incidents/resources/allocations.
// Admin-only AND gated behind ?confirm=yes so it can never be triggered by
// accident (it used to be a fully unauthenticated GET).
router.get('/seed', protect, restrictTo(UserRole.ADMIN), async (req, res) => {
  if (req.query.confirm !== 'yes') {
    res.status(400).json({
      message: 'Refusing to reseed. This drops all data. Call /auth/seed?confirm=yes as an ADMIN to proceed.'
    });
    return;
  }
  try {
    await seedDatabase();
    res.status(200).json({ message: 'Seeder completed successfully!' });
  } catch (error: any) {
    res.status(500).json({ message: 'Seeder failed', error: error.message || error });
  }
});

router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPassword);
router.post('/recover-email', recoverEmail);
router.put('/reset-password/:token', resetPassword);

export default router;
