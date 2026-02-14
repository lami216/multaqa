import User from '../models/User.js';
import { generateTelegramLinkToken } from '../utils/jwt.js';
import {
  getUserIdFromTelegramLinkToken,
  sendTelegramMessageToChat
} from '../utils/telegram.js';

export const generateLinkToken = async (req, res) => {
  try {
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!telegramBotToken) {
      return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN is not configured' });
    }

    const token = generateTelegramLinkToken(req.user._id.toString());

    let telegramResponse;
    try {
      telegramResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/getMe`);
    } catch (error) {
      console.error('Telegram getMe network error:', error);
      return res.status(500).json({ error: 'Failed to fetch Telegram bot username' });
    }

    const telegramData = await telegramResponse.json();

    if (telegramData?.ok !== true) {
      return res.status(500).json({ error: 'Telegram getMe returned an invalid response' });
    }

    const telegramUsername = telegramData?.result?.username;
    if (!telegramUsername) {
      return res.status(500).json({ error: 'Telegram bot username is missing from getMe response' });
    }

    res.json({ token, botUsername: telegramUsername });
  } catch (error) {
    console.error('Generate Telegram link token error:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
};

export const webhook = async (req, res) => {
  try {
    const update = req.body;

    if (update?.message) {
      const chatId = update.message.chat?.id;
      const text = update.message.text;

      if (typeof text === 'string' && text.startsWith('/start ')) {
        const token = text.slice(7).trim();

        if (!token) {
          await sendTelegramMessageToChat(chatId, 'يرجى ربط حسابك من داخل المنصة.');
        } else {
          const userId = getUserIdFromTelegramLinkToken(token);

          if (!userId) {
            await sendTelegramMessageToChat(chatId, 'يرجى ربط حسابك من داخل المنصة.');
          } else {
            await User.findByIdAndUpdate(userId, {
              $set: {
                telegramChatId: String(chatId),
                telegramLinked: true
              }
            });

            await sendTelegramMessageToChat(chatId, 'تم ربط حسابك بالمنصة بنجاح ✅');
          }
        }
      }
    }
  } catch (error) {
    console.error('Telegram webhook error:', error);
  }

  return res.status(200).json({ ok: true });
};
