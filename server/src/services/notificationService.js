import Notification from '../models/Notification.js';
import Profile from '../models/Profile.js';
import redis from '../config/redis.js';
import { sendTelegramNotificationForEvent } from '../utils/telegram.js';

const APP_BASE_URL = (process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'https://multaqa.space').replace(/\/+$/, '');

export const buildAppLink = (path) => {
  if (!path || typeof path !== 'string') return '';
  if (/^https:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${APP_BASE_URL}${normalizedPath}`;
};

const escapeTelegramHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const isSafeHttpsUrl = (url) => {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

const getTelegramCtaLabel = (link, language) => {
  const normalizedLink = link.toLowerCase();
  if (normalizedLink.includes('/messages/')) {
    return language === 'fr' ? 'Voir le message' : 'تفقد رسالتك هنا';
  }
  if (normalizedLink.includes('/posts/')) {
    return language === 'fr' ? 'Voir le post' : 'افتح المنشور هنا';
  }
  return language === 'fr' ? 'Ouvrir dans Multaqa' : 'افتح في ملتقى';
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
  },
  importantSubjectPost: {
    fr: 'Nouveau post dans une matière importante.',
    ar: 'منشور جديد في مادة مهمة لك.'
  },
  weeklySummary: {
    fr: 'Votre résumé hebdomadaire Multaqa est prêt.',
    ar: 'ملخصك الأسبوعي في ملتقى جاهز.'
  },
  unionReviewPublished: {
    fr: 'Nouvelle révision de l’union disponible.',
    ar: 'مراجعة جديدة من الإتحاد متاحة الآن.'
  }
};

export const resolveTelegramLanguage = async (userId) => {
  const profile = await Profile.findOne({ userId }).select('languages').lean();
  return profile?.languages?.[0] === 'French' ? 'fr' : 'ar';
};

export const formatTelegramMessage = ({ ar, fr, link, language = 'ar' }) => {
  const text = language === 'fr' ? (fr || ar) : (ar || fr);
  const lines = [escapeTelegramHtml(text)].filter(Boolean);
  const appLink = buildAppLink(link);

  if (appLink && isSafeHttpsUrl(appLink)) {
    const ctaLabel = escapeTelegramHtml(getTelegramCtaLabel(appLink, language));
    lines.push(`🔗 <a href="${escapeTelegramHtml(appLink)}">${ctaLabel}</a>`);
  }

  return lines.join('\n');
};

const normalizeId = (value) => value?.toString?.() ?? String(value ?? '');

const getNotificationActorId = (payload = {}) => (
  payload.actorId ?? payload.senderId ?? payload.initiatorId ?? payload.requesterId ?? payload.receiverId
);

const getDuplicatePayloadFilter = (payload = {}) => {
  const keys = ['messageId', 'requestId', 'sessionId', 'conversationId', 'postId', 'senderId', 'initiatorId', 'score'];
  return keys.reduce((filter, key) => {
    if (payload[key] !== undefined && payload[key] !== null) {
      filter[`payload.${key}`] = payload[key];
    }
    return filter;
  }, {});
};

export const createNotification = async ({ userId, actorId, type, payload = {}, telegram }) => {
  if (!userId || !type) return null;

  const recipientKey = normalizeId(userId);
  const actorKey = normalizeId(actorId ?? getNotificationActorId(payload));
  if (actorKey && actorKey === recipientKey) return null;

  const duplicateFilter = getDuplicatePayloadFilter(payload);
  const existingNotification = Object.keys(duplicateFilter).length
    ? await Notification.findOne({
      userId,
      type,
      read: false,
      ...duplicateFilter
    })
    : null;

  if (existingNotification) return existingNotification;

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
      message: formatTelegramMessage({ ...telegram, link: payload.link, language: await resolveTelegramLanguage(userId) })
    });
  }

  return notification;
};

export const createNotificationsForUsers = async ({ userIds, actorId, type, payload, telegram }) => {
  const actorKey = normalizeId(actorId);
  const uniqueRecipientIds = [...new Set((userIds ?? []).map((id) => normalizeId(id)).filter(Boolean))]
    .filter((id) => id !== actorKey);

  await Promise.all(uniqueRecipientIds.map((userId) => createNotification({ userId, actorId, type, payload, telegram })));
};
