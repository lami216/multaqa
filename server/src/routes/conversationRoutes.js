import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as conversationController from '../controllers/conversationController.js';

const router = express.Router();

router.post('/', authenticate, conversationController.createOrGetConversation);
router.get('/', authenticate, conversationController.getConversations);
router.patch('/:id/archive', authenticate, conversationController.archiveConversation);
router.patch('/:id/unarchive', authenticate, conversationController.unarchiveConversation);
router.patch('/:id/pin', authenticate, conversationController.pinConversation);
router.patch('/:id/unpin', authenticate, conversationController.unpinConversation);
router.patch('/:id/delete-for-me', authenticate, conversationController.deleteConversationForMe);
router.post('/:id/messages', authenticate, conversationController.sendMessage);
router.get('/:id/messages', authenticate, conversationController.getMessages);
router.post('/:id/read', authenticate, conversationController.markRead);
router.post('/:id/extend', authenticate, conversationController.extendConversation);

export default router;
