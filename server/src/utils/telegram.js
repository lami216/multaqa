import crypto from 'crypto';
import User from '../models/User.js';
import redis from '../config/redis.js';

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
      const saved = await redis.setIfAbsent(
        telegramLinkKey(token),
        userId.toString(),
        TELEGRAM_LINK_TOKEN_TTL_SECONDS
      );

      if (saved) {
        return token;
      }
    }

    console.error('[telegram] Redis short link code save failed after 5 attempts');
  } catch (error) {
    console.error('[telegram] Redis short link code save threw; no JWT fallback will be generated', error);
  }

  return null;
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
      body: JSON.stringify(telegramPayload),
      signal: AbortSignal.timeout(5000)
    });

    if (response.status === 403) await User.updateMany({ telegramChatId: String(chatId) }, { $set: { telegramNotificationsEnabled: false, telegramLinked: false, telegramNotificationsDisabledAt: new Date() } });
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
    const user = await User.findOne({ _id: userId, banned: { $ne: true } }).select('telegramLinked telegramChatId telegramNotificationsEnabled');
    if (!user?.telegramLinked || !user?.telegramChatId || !user.telegramNotificationsEnabled) {
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
  if (typeof token !== 'string' || !/^[A-Z0-9]{6}$/i.test(token)) return null;
  return redis.getdel(telegramLinkKey(token.toUpperCase()));
};
