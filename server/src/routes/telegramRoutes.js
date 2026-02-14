import express from 'express';
import * as telegramController from '../controllers/telegramController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/webhook', telegramController.webhook);
router.post('/link-token', authenticate, telegramController.generateLinkToken);

export default router;
