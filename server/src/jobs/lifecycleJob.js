import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Post from '../models/Post.js';
import JoinRequest from '../models/JoinRequest.js';
import Session from '../models/Session.js';
import { cleanupSessionLifecycle, deleteNotificationsByConversationId, deleteNotificationsByPostId, initializeSessionLifecycle, transitionSessionToEndingRequested } from '../services/lifecycleService.js';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import Notification from '../models/Notification.js';
import WeeklyDigestLog from '../models/WeeklyDigestLog.js';
import { createNotification, notificationText } from '../services/notificationService.js';
import redis from '../config/redis.js';

const ONE_MINUTE = 60 * 1000;
const WEEKLY_SUMMARY_ENABLED = process.env.WEEKLY_SUMMARY_ENABLED !== 'false';
const WEEKLY_SUMMARY_DAY = Number(process.env.WEEKLY_SUMMARY_DAY ?? 0); // 0 = Sunday
const WEEKLY_SUMMARY_HOUR = Number(process.env.WEEKLY_SUMMARY_HOUR ?? 10);
const WEEKLY_SUMMARY_WINDOW_MINUTES = Number(process.env.WEEKLY_SUMMARY_WINDOW_MINUTES ?? 15);

const getWeekKey = (date) => {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const shouldRunWeeklySummary = (now) => {
  if (!WEEKLY_SUMMARY_ENABLED) return false;
  if (now.getDay() !== WEEKLY_SUMMARY_DAY) return false;
  if (now.getHours() !== WEEKLY_SUMMARY_HOUR) return false;
  return now.getMinutes() < WEEKLY_SUMMARY_WINDOW_MINUTES;
};

const cleanupExpiredConversations = async () => {
  const now = new Date();
  const expired = await Conversation.find({ expiresAt: { $lte: now } }).select('_id postId');
  if (!expired.length) return;
  const ids = expired.map((item) => item._id);
  await Message.deleteMany({ conversationId: { $in: ids } });
  await Conversation.deleteMany({ _id: { $in: ids } });
  await Promise.all(expired.map((item) => deleteNotificationsByConversationId(item._id)));
};

const processPostAvailability = async () => {
  const now = new Date();
  const duePosts = await Post.find({
    status: 'active',
    $or: [
      { availabilityDate: { $lte: now } },
      { expiresAt: { $lte: now } }
    ]
  }).select('_id');

  for (const post of duePosts) {
    await JoinRequest.deleteMany({ postId: post._id });
    await deleteNotificationsByPostId(post._id);
    await Post.deleteOne({ _id: post._id });
  }
};

const processSessions = async () => {
  const now = new Date();

  const inProgress = await Session.find({ status: 'in_progress' });
  for (const session of inProgress) {
    initializeSessionLifecycle(session, session.startedAt ?? now);
    if (session.autoCloseAt && session.autoCloseAt <= now) {
      transitionSessionToEndingRequested(session, session.endingRequestedBy ?? null, now);
    }
    await session.save();
  }

  const dueCleanup = await Session.find({
    status: 'completed',
    completionDeadlineAt: { $lte: now }
  }).select('_id');

  for (const session of dueCleanup) {
    await cleanupSessionLifecycle(session._id);
  }
};

const processWeeklySummary = async () => {
  const now = new Date();
  if (!shouldRunWeeklySummary(now)) return;

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekKey = getWeekKey(now);
  const users = await User.find({ telegramLinked: true }).select('_id');

  for (const user of users) {
    const key = `weekly-summary:${user._id}:${weekKey}`;
    const [alreadySent, persistedDigest] = await Promise.all([
      redis.get(key),
      WeeklyDigestLog.findOne({ userId: user._id, weekKey }).select('_id')
    ]);
    if (alreadySent) continue;
    if (persistedDigest) {
      await redis.set(key, '1', 8 * 24 * 60 * 60);
      continue;
    }

    const [completedSessions, recentRatings, unreadCount, profile] = await Promise.all([
      Session.countDocuments({ participants: user._id, status: 'completed', endedAt: { $gte: weekAgo } }),
      Notification.countDocuments({ userId: user._id, type: 'new_rating', createdAt: { $gte: weekAgo } }),
      Notification.countDocuments({ userId: user._id, read: false }),
      Profile.findOne({ userId: user._id }).select('subjectCodes')
    ]);
    const summarySubjects = (profile?.subjectCodes ?? []).slice(0, 3);
    const summary = {
      completedSessions,
      newReviews: recentRatings,
      unreadNotifications: unreadCount,
      subjects: summarySubjects
    };
    await createNotification({
      userId: user._id,
      type: 'weekly_summary',
      payload: { summary, link: '/notifications' },
      telegram: {
        eventName: 'weekly_summary',
        ar: `${notificationText.weeklySummary.ar}\n✅ ${completedSessions} جلسات مكتملة\n💬 ${recentRatings} مراجعات جديدة`,
        fr: `${notificationText.weeklySummary.fr}\n✅ ${completedSessions} sessions terminées\n💬 ${recentRatings} nouveaux avis`
      }
    });
    await WeeklyDigestLog.create({ userId: user._id, weekKey, sentAt: now });
    await redis.set(key, '1', 8 * 24 * 60 * 60);
  }
};

export const startLifecycleJob = () => {
  const run = async () => {
    try {
      await processPostAvailability();
      await cleanupExpiredConversations();
      await processSessions();
      await processWeeklySummary();
    } catch (error) {
      console.error('Lifecycle job error:', error);
    }
  };

  void run();
  setInterval(run, ONE_MINUTE);
};
