import User from '../models/User.js';
import { timingSafeEqual } from 'node:crypto';
import {
  consentPredicate,
  consentMarker
} from '../services/telegramConsentService.js';
import {
  createTelegramLinkToken,
  getUserIdFromTelegramLinkToken,
  sendTelegramMessageToChat
} from '../utils/telegram.js';

export async function botInfo(req, res) {
  const username = process.env.TELEGRAM_BOT_USERNAME;
  if (!username || !/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(username))
    return res
      .status(503)
      .json({ error: 'Bot notifications are not configured' });
  return res.json({
    botUsername: username,
    url: `https://t.me/${username}?start=notifications`
  });
}
export async function generateLinkToken(req, res) {
  try {
    if (req.user.telegramLinked)
      return res
        .status(409)
        .json({ error: 'Telegram account is already connected' });
    if (req.user.telegramSub) return botInfo(req, res);
    if (!process.env.TELEGRAM_BOT_TOKEN)
      return res.status(503).json({ error: 'Bot is not configured' });
    const result = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await result.json();
    const username = data?.result?.username;
    if (
      !result.ok ||
      !data.ok ||
      typeof username !== 'string' ||
      !/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(username)
    )
      return res.status(503).json({ error: 'Bot unavailable' });
    const token = await createTelegramLinkToken(req.user._id.toString());
    if (!token) return res.status(503).json({ error: 'Cannot create link' });
    return res.json({ token, botUsername: username });
  } catch {
    return res.status(503).json({ error: 'Bot unavailable' });
  }
}
export async function webhook(req, res) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET,
    supplied = req.headers['x-telegram-bot-api-secret-token'];
  if (
    !expected ||
    typeof supplied !== 'string' ||
    Buffer.byteLength(expected) !== Buffer.byteLength(supplied) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
  )
    return res.status(403).json({ error: 'Invalid webhook secret' });
  try {
    const blocked = req.body?.my_chat_member;
    if (
      blocked?.chat?.type === 'private' &&
      blocked.new_chat_member?.status === 'kicked'
    ) {
      const order = consentPredicate(req.body, blocked);
      if (order)
        await User.updateMany(
          { telegramChatId: String(blocked.chat.id), ...order },
          {
            $set: {
              telegramNotificationsEnabled: false,
              telegramLinked: false,
              telegramNotificationsDisabledAt: new Date(),
              ...consentMarker(req.body, blocked)
            }
          }
        );
    }
    const message = req.body?.message;
    if (
      !message ||
      message.chat?.type !== 'private' ||
      !Number.isSafeInteger(message.from?.id) ||
      message.from.id <= 0 ||
      message.chat.id !== message.from.id
    )
      return res.json({ ok: true });
    const order = consentPredicate(req.body, message);
    if (!order) return res.json({ ok: true });
    const marker = consentMarker(req.body, message);
    const id = String(message.from.id);
    const text = typeof message.text === 'string' ? message.text.trim() : '';
    if (/^\/stop(?:\s|$)/.test(text)) {
      const stopped = await User.updateMany(
        { $or: [{ telegramUserId: id }, { telegramChatId: id }], ...order },
        {
          $set: {
            telegramNotificationsEnabled: false,
            telegramLinked: false,
            telegramNotificationsDisabledAt: new Date(),
            ...marker
          }
        }
      );
      if (stopped.modifiedCount)
        await sendTelegramMessageToChat(
          id,
          'تم إيقاف الإشعارات. دخولك بتيليغرام ما زال متاحًا. لإعادة تفعيلها أرسل /start'
        );
      return res.json({ ok: true });
    }
    const start = /^\/start(?:\s|$)/.test(text);
    const user = await User.findOneAndUpdate(
      {
        $or: [
          { telegramUserId: id, telegramSub: { $type: 'string' } },
          ...(start
            ? [{
                telegramOwnerId: id,
                telegramChatId: id,
                telegramSub: null,
                telegramUserId: null
              }]
            : [])
        ],
        banned: { $ne: true },
        ...order,
        ...(start
          ? {}
          : {
              telegramNotificationsDisabledAt: null,
              telegramNotificationsEnabled: { $ne: true }
            })
      },
      {
        $set: {
          telegramOwnerId: id,
          telegramChatId: id,
          telegramLinked: true,
          telegramNotificationsEnabled: true,
          ...marker
        },
        $unset: { telegramNotificationsDisabledAt: '' }
      },
      { new: true }
    );
    if (user) {
      await sendTelegramMessageToChat(
        id,
        'تم تفعيل إشعارات ملتقى ✅ لإيقافها أرسل /stop أو عطّلها من إعدادات الحساب.'
      );
      return res.json({ ok: true });
    }
    // Backwards-compatible notification links never grant a login identity.
    const match = /^\/start ([A-Z0-9]{6})$/.exec(text);
    if (match) {
      const userId = await getUserIdFromTelegramLinkToken(match[1]);
      if (userId) {
        const owner = await User.exists({
          telegramUserId: id,
          _id: { $ne: userId }
        });
        if (!owner) {
          const linked = await User.findOneAndUpdate(
            {
              _id: userId,
              banned: { $ne: true },
              telegramOwnerId: { $in: [null, id] },
              $or: [{ telegramUserId: null }, { telegramUserId: id }],
              ...order
            },
            {
              $set: {
                telegramOwnerId: id,
                telegramChatId: id,
                telegramLinked: true,
                telegramNotificationsEnabled: true,
                ...marker
              },
              $unset: { telegramNotificationsDisabledAt: '' }
            },
            { new: true }
          );
          if (linked)
            await sendTelegramMessageToChat(
              id,
              'تم ربط إشعارات ملتقى ✅ الربط بالإشعارات لا يضيف وسيلة تسجيل دخول.'
            );
        }
      }
    } else if (start)
      await sendTelegramMessageToChat(
        id,
        'سجّل أو اربط تيليغرام من إعدادات حساب ملتقى، ثم أرسل /start لتفعيل الإشعارات.'
      );
  } catch (error) {
    if (error.code !== 11000) {
      console.error('Telegram webhook processing unavailable');
      return res.status(503).json({ error: 'Temporarily unavailable' });
    }
  }
  return res.json({ ok: true });
}
export async function disconnect(req, res) {
  try {
    const disable = {
      $set: {
        telegramLinked: false,
        telegramNotificationsEnabled: false,
        telegramNotificationsDisabledAt: new Date()
      }
    };
    const legacy = await User.findOneAndUpdate(
      { _id: req.user._id, telegramSub: null },
      { ...disable, $unset: { telegramOwnerId: '', telegramChatId: '' } }
    );
    if (!legacy) await User.findByIdAndUpdate(req.user._id, disable);
    res.json({
      message: 'Notifications disabled. Telegram login is unchanged.'
    });
  } catch {
    res.status(503).json({ error: 'Could not disable notifications' });
  }
}
