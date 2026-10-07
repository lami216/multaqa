import express from 'express';
import { authenticate, requireVerifiedMutation } from '../middleware/auth.js';
import * as sessionController from '../controllers/sessionController.js';

const router = express.Router();

router.use(authenticate, requireVerifiedMutation);
router.get(
  '/by-conversation/:conversationId',
  sessionController.getSessionByConversation
);
router.post('/:id/end-request', sessionController.requestSessionEnd);
router.post('/:id/confirm-end', sessionController.confirmSessionEnd);
router.post('/:id/rate', sessionController.submitSessionRating);

export default router;
