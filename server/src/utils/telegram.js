import User from '../models/User.js';
import { verifyTelegramLinkToken } from './jwt.js';

export const sendTelegramMessageToChat = async (chatId, message) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken || !chatId || !message) {
      return;
    }

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message
      })
    });
  } catch {
    // silent
  }
};

export const sendTelegramNotification = async (userId, message) => {
  try {
    const user = await User.findById(userId).select('telegramLinked telegramChatId');
    if (!user?.telegramLinked || !user?.telegramChatId) {
      console.info(`[telegram] skipped user=${userId} reason=not_linked`);
      return false;
    }

    await sendTelegramMessageToChat(user.telegramChatId, message);
    console.info(`[telegram] sent user=${userId}`);
    return true;
  } catch {
    console.error(`[telegram] failed user=${userId}`);
    return false;
  }
};

export const getUserIdFromTelegramLinkToken = (token) => {
  const decoded = verifyTelegramLinkToken(token);
  if (!decoded || decoded.purpose !== 'telegram_link' || !decoded.userId) {
    return null;
  }

  return decoded.userId;
};
