import express from 'express';
import * as telegramController from '../controllers/telegramController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/webhook', telegramController.webhook);
router.get('/bot', authenticate, telegramController.botInfo);
router.post('/link-token', authenticate, telegramController.generateLinkToken);
router.delete('/link', authenticate, telegramController.disconnect);

export default router;
