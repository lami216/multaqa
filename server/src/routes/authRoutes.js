import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../middleware/validation.js';
import rateLimit, { loginRateLimit, registerRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

router.post('/register', registerRateLimit, validate(registerSchema), authController.register);
router.post('/login', loginRateLimit, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', rateLimit({ windowMs: 3600000, max: 3, keyGenerator: req => `ratelimit:reset-request:${req.ip}` }), validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', rateLimit({ windowMs: 3600000, max: 10, keyGenerator: req => `ratelimit:reset-submit:${req.ip}` }), validate(resetPasswordSchema), authController.resetPassword);
router.get('/me', authenticate, authController.getMe);

export default router;
