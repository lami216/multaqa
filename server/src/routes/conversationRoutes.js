import express from 'express';
import { messageRateLimit } from '../middleware/rateLimit.js';
import { authenticate, requireVerifiedMutation } from '../middleware/auth.js';
import * as conversationController from '../controllers/conversationController.js';
import { requireActiveMajor } from '../middleware/majorAccess.js';

const router = express.Router();
router.use(authenticate, requireVerifiedMutation);

router.post(
  '/',
  requireActiveMajor,
  conversationController.createOrGetConversation
);
router.get('/', conversationController.getConversations);
router.patch('/:id/archive', conversationController.archiveConversation);
router.patch('/:id/unarchive', conversationController.unarchiveConversation);
router.patch('/:id/pin', conversationController.pinConversation);
router.patch('/:id/unpin', conversationController.unpinConversation);
router.patch(
  '/:id/delete-for-me',
  conversationController.deleteConversationForMe
);
router.post(
  '/:id/messages',
  messageRateLimit,
  conversationController.sendMessage
);
router.get('/:id/messages', conversationController.getMessages);
router.get(
  '/:id/message-status-changes',
  conversationController.getMessageStatusChanges
);
router.post('/:id/read', conversationController.markRead);
router.post('/:id/extend', conversationController.extendConversation);

export default router;
