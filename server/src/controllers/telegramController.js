import User from '../models/User.js';
import {
  createTelegramLinkToken,
  getUserIdFromTelegramLinkToken,
  sendTelegramMessageToChat
} from '../utils/telegram.js';

export const generateLinkToken = async (req, res) => {
  try {
    if (req.user?.telegramLinked) {
      return res.status(409).json({ error: 'Telegram account is already connected' });
    }
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!telegramBotToken) {
      console.error('[telegram] link_token_failed reason=missing_bot_token');
      return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN is not configured' });
    }

    const token = await createTelegramLinkToken(req.user._id.toString());
    if (!token) {
      console.error('[telegram] failed to create link token', {
        userId: req.user?._id
      });
      return res.status(500).json({ error: 'Failed to create Telegram link token' });
    }

    let telegramResponse;
    try {
      telegramResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/getMe`);
    } catch (error) {
      console.error('[telegram] link_token_failed reason=get_me_network_error', error);
      return res.status(500).json({ error: 'Failed to fetch Telegram bot username' });
    }

    if (!telegramResponse.ok) {
      console.error(`[telegram] link_token_failed reason=get_me_http_error status=${telegramResponse.status}`);
      return res.status(500).json({ error: 'Failed to fetch Telegram bot username' });
    }

    let telegramData;
    try {
      telegramData = await telegramResponse.json();
    } catch (error) {
      console.error('[telegram] link_token_failed reason=get_me_invalid_json', error);
      return res.status(500).json({ error: 'Telegram getMe returned an invalid response' });
    }

    if (telegramData?.ok !== true) {
      console.error('[telegram] link_token_failed reason=get_me_invalid_response', telegramData);
      return res.status(500).json({ error: 'Telegram getMe returned an invalid response' });
    }

    const telegramUsername = telegramData?.result?.username;
    if (!telegramUsername) {
      console.error('[telegram] link_token_failed reason=missing_bot_username', telegramData?.result);
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
          const userId = await getUserIdFromTelegramLinkToken(token);

          if (!userId) {
            await sendTelegramMessageToChat(chatId, 'يرجى ربط حسابك من داخل المنصة.');
          } else {
            await User.findByIdAndUpdate(userId, {
              $set: {
                telegramChatId: String(chatId),
                telegramLinked: true
              }
            });

            const appUrl = (process.env.APP_URL || process.env.CLIENT_URL || 'https://multaqa.space').replace(/\/$/, '');
            const profileUrl = `${appUrl}/profile`;
            const successMessage = `تم ربط حسابك بملتقى بنجاح ✅\nيمكنك الآن استقبال الإشعارات على تيليغرام.\nافتح ملفك الشخصي: ${profileUrl}`;
            const sent = await sendTelegramMessageToChat(chatId, successMessage);
            if (!sent) {
              console.error('[telegram] failed to send link success message', { chatId, userId });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Telegram webhook error:', error);
  }

  return res.status(200).json({ ok: true });
};


export const disconnect = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: { telegramLinked: false },
      $unset: { telegramChatId: '' }
    });

    res.json({ message: 'Telegram disconnected' });
  } catch (error) {
    console.error('Disconnect Telegram error:', error);
    res.status(500).json({ error: 'Failed to disconnect Telegram' });
  }
};
