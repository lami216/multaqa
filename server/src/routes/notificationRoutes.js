import express from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, notificationController.getNotifications);
router.post('/read', authenticate, notificationController.markAsRead);
router.get('/unread-count', authenticate, notificationController.getUnreadCount);

export default router;
