import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as conversationController from '../controllers/conversationController.js';

const router = express.Router();

router.post('/', authenticate, conversationController.createOrGetConversation);
router.get('/', authenticate, conversationController.getConversations);
router.post('/:id/messages', authenticate, conversationController.sendMessage);
router.get('/:id/messages', authenticate, conversationController.getMessages);
router.post('/:id/read', authenticate, conversationController.markRead);

export default router;
