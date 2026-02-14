import User from '../models/User.js';
import { generateTelegramLinkToken } from '../utils/jwt.js';
import {
  getUserIdFromTelegramLinkToken,
  sendTelegramMessageToChat
} from '../utils/telegram.js';

export const generateLinkToken = async (req, res) => {
  try {
    const token = generateTelegramLinkToken(req.user._id.toString());
    res.json({ token });
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
