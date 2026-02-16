import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Post from '../models/Post.js';
import JoinRequest from '../models/JoinRequest.js';
import Session from '../models/Session.js';
import { cleanupSessionLifecycle, deleteNotificationsByConversationId, deleteNotificationsByPostId, initializeSessionLifecycle, transitionSessionToRating } from '../services/lifecycleService.js';

const ONE_MINUTE = 60 * 1000;

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
      transitionSessionToRating(session, null, now);
    }
    await session.save();
  }

  const pendingClose = await Session.find({ status: 'pending_close' });
  for (const session of pendingClose) {
    if (session.completionDeadlineAt && session.completionDeadlineAt <= now) {
      session.status = 'completed';
      session.endedAt = session.endedAt ?? now;
      await session.save();
    }
  }

  const dueCleanup = await Session.find({
    status: 'completed',
    completionDeadlineAt: { $lte: now }
  }).select('_id');

  for (const session of dueCleanup) {
    await cleanupSessionLifecycle(session._id);
  }
};

export const startLifecycleJob = () => {
  const run = async () => {
    try {
      await processPostAvailability();
      await cleanupExpiredConversations();
      await processSessions();
    } catch (error) {
      console.error('Lifecycle job error:', error);
    }
  };

  void run();
  setInterval(run, ONE_MINUTE);
};
