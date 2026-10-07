import express from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { authenticate, requireVerifiedMutation } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate, requireVerifiedMutation);

router.get('/', notificationController.getNotifications);
router.post('/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllNotificationsRead);
router.patch('/:id/read', notificationController.markNotificationRead);
router.get('/unread-count', notificationController.getUnreadCount);

export default router;
