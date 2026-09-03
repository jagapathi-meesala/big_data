import { Router } from 'express';
import { register, login, refresh, forgotPassword, resetPassword, recoverEmail } from '../controllers/authController';
import { registerValidator, loginValidator } from '../middlewares/validators';
import { seedDatabase } from '../config/seed';

const router = Router();

router.get('/seed', async (req, res) => {
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
