import express from 'express';
import * as chatController from '../controllers/chatController.js';
import { authenticate } from '../middleware/auth.js';
import { validate, messageSchema, reportSchema } from '../middleware/validation.js';
import { messageRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

router.get('/', authenticate, chatController.getChats);
router.post('/', authenticate, chatController.createOrGetChat);
router.get('/:chatId/messages', authenticate, chatController.getMessages);
router.post('/:chatId/messages', authenticate, messageRateLimit, validate(messageSchema), chatController.sendMessage);
router.post('/:chatId/report', authenticate, validate(reportSchema), chatController.reportChat);

export default router;
