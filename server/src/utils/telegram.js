import User from '../models/User.js';
import { verifyTelegramLinkToken } from './jwt.js';

export const sendTelegramMessageToChat = async (chatId, message) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken || !chatId || !message) {
      return false;
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message
      })
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

    const sent = await sendTelegramMessageToChat(user.telegramChatId, message);
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

export const getUserIdFromTelegramLinkToken = (token) => {
  const decoded = verifyTelegramLinkToken(token);
  if (!decoded || decoded.purpose !== 'telegram_link' || !decoded.userId) {
    return null;
  }

  return decoded.userId;
};
