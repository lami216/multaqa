import crypto from 'crypto';
import User from '../models/User.js';
import redis from '../config/redis.js';
import { generateTelegramLinkToken, verifyTelegramLinkToken } from './jwt.js';

const TELEGRAM_LINK_TOKEN_TTL_SECONDS = 10 * 60;
const telegramLinkKey = (token) => `telegram:link:${token}`;

const generateShortCode = () => {
  let code = '';

  while (code.length < 6) {
    code += crypto
      .randomBytes(4)
      .toString('base64url')
      .replace(/[^A-Z0-9]/gi, '')
      .toUpperCase();
  }

  return code.slice(0, 6);
};

export const createTelegramLinkToken = async (userId) => {
  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const token = generateShortCode();
      const existingUserId = await redis.get(telegramLinkKey(token));

      if (existingUserId) {
        continue;
      }

      const saved = await redis.set(
        telegramLinkKey(token),
        userId.toString(),
        TELEGRAM_LINK_TOKEN_TTL_SECONDS
      );

      if (saved) {
        return token;
      }
    }

    console.warn('[telegram] Redis short link code save failed, falling back to JWT token');
  } catch (error) {
    console.warn('[telegram] Redis short link code save threw, falling back to JWT token', error);
  }

  return generateTelegramLinkToken(userId.toString());
};

export const sendTelegramMessageToChat = async (chatId, message, options = {}) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken || !chatId || !message) {
      return false;
    }

    const telegramPayload = {
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true
    };
    if (options.parseMode) {
      telegramPayload.parse_mode = options.parseMode;
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(telegramPayload)
    });

    if (!response.ok) {
      console.error(`[telegram] api_error status=${response.status} chatId=${chatId}`);
      return false;
    }

    const payload = await response.json().catch(() => null);
    if (payload?.ok !== true) {
      console.error(`[telegram] api_rejected chatId=${chatId}`);
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

export const sendTelegramNotification = async (userId, message) => {
  try {
    const user = await User.findById(userId).select('telegramLinked telegramChatId');
    if (!user?.telegramLinked || !user?.telegramChatId) {
      console.info(`[telegram] skipped user=${userId} reason=not_linked`);
      return false;
    }

    const sent = await sendTelegramMessageToChat(user.telegramChatId, message, { parseMode: 'HTML' });
    if (sent) {
      console.info(`[telegram] sent user=${userId}`);
      return true;
    }
    console.error(`[telegram] failed user=${userId} reason=send_failed`);
    return false;
  } catch {
    console.error(`[telegram] failed user=${userId}`);
    return false;
  }
};

export const sendTelegramNotificationForEvent = async ({ eventName, recipientUserId, message }) => {
  console.info(`[telegram] event_happened event=${eventName} recipient=${recipientUserId}`);
  console.info(`[telegram] attempt_immediate_send event=${eventName} recipient=${recipientUserId}`);
  const sent = await sendTelegramNotification(recipientUserId, message);
  if (sent) {
    console.info(`[telegram] event_send_result event=${eventName} recipient=${recipientUserId} result=sent`);
  } else {
    console.info(`[telegram] event_send_result event=${eventName} recipient=${recipientUserId} result=skipped_or_failed`);
  }
  return sent;
};

export const getUserIdFromTelegramLinkToken = async (token) => {
  if (!token) return null;

  const redisToken = /^[A-Z0-9]{6}$/i.test(token) ? token.toUpperCase() : token;
  const linkedUserId = await redis.get(telegramLinkKey(redisToken));
  if (linkedUserId) {
    await redis.del(telegramLinkKey(redisToken));
    return linkedUserId;
  }

  const decoded = verifyTelegramLinkToken(token);
  if (!decoded || decoded.purpose !== 'telegram_link' || !decoded.userId) {
    return null;
  }

  return decoded.userId;
};
