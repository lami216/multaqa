import express from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, notificationController.getNotifications);
router.post('/read', authenticate, notificationController.markAsRead);
router.patch('/read-all', authenticate, notificationController.markAllNotificationsRead);
router.patch('/:id/read', authenticate, notificationController.markNotificationRead);
router.get('/unread-count', authenticate, notificationController.getUnreadCount);

export default router;
