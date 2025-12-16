import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { validate, profileSchema } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticate);

router.get('/:username', userController.getPublicProfile);
router.patch('/me', validate(profileSchema), userController.updateProfile);
router.post('/avatar', userController.uploadAvatar);

export default router;
