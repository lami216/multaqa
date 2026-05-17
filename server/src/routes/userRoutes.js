import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { validate, profileSettingsUpdateSchema, profileUpdateSchema } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticate);

router.get('/id/:userId', userController.getPublicProfileById);
router.get('/:username', userController.getPublicProfile);
router.patch('/me', validate(profileUpdateSchema), userController.updateProfile);
router.patch('/me/settings', validate(profileSettingsUpdateSchema), userController.updateProfileSettings);
router.post('/avatar', userController.uploadAvatar);

export default router;
