import { Router } from 'express';
import { register, login, logout, refreshToken, forgotPassword, resetPassword, verifyEmail, googleAuth, getMe } from './auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);
router.post('/google', googleAuth);
router.get('/me', authenticate, getMe);

export default router;
