import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate, registerSchema, loginSchema } from '../middleware/validation.js';
import { loginRateLimit, registerRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

router.post('/register', registerRateLimit, validate(registerSchema), authController.register);
router.post('/login', loginRateLimit, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authenticate, authController.getMe);

export default router;
