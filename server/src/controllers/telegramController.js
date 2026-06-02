import User from '../models/User.js';
import {
  createTelegramLinkToken,
  getUserIdFromTelegramLinkToken,
  sendTelegramMessageToChat
} from '../utils/telegram.js';

const TELEGRAM_ALREADY_LINKED_MESSAGE =
  'هذا حساب تيليغرام مربوط بالفعل بحساب آخر في ملتقى. افصل الربط من الحساب القديم أولاً ثم حاول مرة أخرى.';
const TELEGRAM_ALREADY_LINKED_TO_USER_MESSAGE = 'حسابك مربوط بالفعل بملتقى ✅';

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

      if (typeof text === 'string' && text.startsWith('/start')) {
        if (text === '/start' || !text.startsWith('/start ')) {
          await sendTelegramMessageToChat(
            chatId,
            'لربط حسابك، افتح ملتقى واضغط ربط تيليغرام للحصول على كود جديد.'
          );
        } else {
          const token = text.slice(7).trim();

          if (!token) {
            await sendTelegramMessageToChat(
              chatId,
              'لربط حسابك، افتح ملتقى واضغط ربط تيليغرام للحصول على كود جديد.'
            );
          } else {
            const userId = await getUserIdFromTelegramLinkToken(token);

            if (!userId) {
              await sendTelegramMessageToChat(
                chatId,
                'الكود غير صالح أو منتهي. افتح ملتقى واضغط ربط تيليغرام للحصول على كود جديد.'
              );
            } else {
              const telegramChatId = String(chatId);
              const existingLinkedUser = await User.findOne({
                telegramChatId,
                telegramLinked: true
              }).select('_id');

              if (existingLinkedUser && existingLinkedUser._id.toString() !== userId.toString()) {
                const sent = await sendTelegramMessageToChat(chatId, TELEGRAM_ALREADY_LINKED_MESSAGE);
                if (!sent) {
                  console.error('[telegram] failed to send duplicate link warning message', {
                    chatId,
                    userId,
                    existingUserId: existingLinkedUser._id
                  });
                }
              } else if (existingLinkedUser) {
                const sent = await sendTelegramMessageToChat(chatId, TELEGRAM_ALREADY_LINKED_TO_USER_MESSAGE);
                if (!sent) {
                  console.error('[telegram] failed to send already linked message', { chatId, userId });
                }
              } else {
                try {
                  await User.findByIdAndUpdate(userId, {
                    $set: {
                      telegramChatId,
                      telegramLinked: true
                    }
                  });
                } catch (error) {
                  if (error?.code === 11000) {
                    const sent = await sendTelegramMessageToChat(chatId, TELEGRAM_ALREADY_LINKED_MESSAGE);
                    if (!sent) {
                      console.error('[telegram] failed to send duplicate link warning message after unique index conflict', {
                        chatId,
                        userId
                      });
                    }
                    return res.status(200).json({ ok: true });
                  }
                  throw error;
                }

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
