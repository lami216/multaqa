import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Post from '../models/Post.js';
import JoinRequest from '../models/JoinRequest.js';
import Session from '../models/Session.js';

const ONE_MINUTE = 60 * 1000;

const cleanupExpiredConversations = async () => {
  const now = new Date();
  const expired = await Conversation.find({ expiresAt: { $lte: now } }).select('_id');
  if (!expired.length) return;
  const ids = expired.map((item) => item._id);
  await Message.deleteMany({ conversationId: { $in: ids } });
  await Conversation.deleteMany({ _id: { $in: ids } });
};

const autoClosePendingSessions = async () => {
  const now = new Date();
  const dueSessions = await Session.find({
    status: 'completed',
    completionDeadlineAt: { $lte: now }
  });

  for (const session of dueSessions) {
    session.completionDeadlineAt = null;
    session.autoCloseAt = null;
    await session.save();
    if (session.postId) {
      await Post.deleteOne({ _id: session.postId });
    }
  }
};

const processPostAvailability = async () => {
  const now = new Date();
  const duePosts = await Post.find({ status: 'active', availabilityDate: { $lte: now } });

  for (const post of duePosts) {
    if (post.category === 'project_team') {
      await JoinRequest.deleteMany({ postId: post._id });
      await Post.deleteOne({ _id: post._id });
      continue;
    }

    await JoinRequest.deleteMany({ postId: post._id });
    await Post.deleteOne({ _id: post._id });
  }
};

export const startLifecycleJob = () => {
  const run = async () => {
    try {
      await processPostAvailability();
      await cleanupExpiredConversations();
      await autoClosePendingSessions();
    } catch (error) {
      console.error('Lifecycle job error:', error);
    }
  };

  void run();
  setInterval(run, ONE_MINUTE);
};
