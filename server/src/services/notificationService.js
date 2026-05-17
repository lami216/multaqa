import Notification from '../models/Notification.js';
import redis from '../config/redis.js';
import { sendTelegramNotificationForEvent } from '../utils/telegram.js';

const APP_BASE_URL = (process.env.APP_BASE_URL || process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || '').replace(/\/+$/, '');

export const buildAppLink = (path) => {
  if (!path || typeof path !== 'string') return '';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return APP_BASE_URL ? `${APP_BASE_URL}${normalizedPath}` : normalizedPath;
};

export const notificationText = {
  newMessage: {
    fr: 'Vous avez reçu un nouveau message.',
    ar: 'لديك رسالة جديدة داخل ملتقى.'
  },
  chatInitiated: {
    fr: 'Une nouvelle conversation a commencé.',
    ar: 'بدأت محادثة جديدة داخل ملتقى.'
  },
  joinRequestReceived: {
    fr: 'Vous avez reçu une demande pour votre post.',
    ar: 'لديك طلب انضمام جديد على منشورك.'
  },
  joinRequestAccepted: {
    fr: 'Votre demande a été acceptée.',
    ar: 'تم قبول طلبك.'
  },
  joinRequestRejected: {
    fr: 'Votre demande a été refusée.',
    ar: 'تم رفض طلبك.'
  },
  sessionEndRequested: {
    fr: 'Une demande de clôture de session vous attend.',
    ar: 'لديك طلب لإنهاء الجلسة.'
  },
  newRating: {
    fr: 'Vous avez reçu un nouvel avis.',
    ar: 'وصلتك مراجعة جديدة.'
  },
  suitablePost: {
    fr: 'Un nouveau post correspond à votre profil.',
    ar: 'هناك منشور جديد مناسب لملفك.'
  }
};

const formatTelegramMessage = ({ ar, fr, link }) => {
  const lines = [ar, fr].filter(Boolean);
  if (link) lines.push(`🔗 ${buildAppLink(link)}`);
  return lines.join('\n');
};

export const createNotification = async ({ userId, type, payload = {}, telegram }) => {
  if (!userId || !type) return null;

  const notification = await Notification.create({
    userId,
    type,
    payload
  });
  await redis.del(`notifications:unread:${userId}`);

  if (telegram) {
    await sendTelegramNotificationForEvent({
      eventName: telegram.eventName ?? type,
      recipientUserId: userId,
      message: formatTelegramMessage({ ...telegram, link: payload.link })
    });
  }

  return notification;
};

export const createNotificationsForUsers = async ({ userIds, actorId, type, payload, telegram }) => {
  const actorKey = actorId?.toString?.() ?? String(actorId ?? '');
  const uniqueRecipientIds = [...new Set((userIds ?? []).map((id) => id?.toString?.() ?? String(id)).filter(Boolean))]
    .filter((id) => id !== actorKey);

  await Promise.all(uniqueRecipientIds.map((userId) => createNotification({ userId, type, payload, telegram })));
};
