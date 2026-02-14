import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Post from '../models/Post.js';
import JoinRequest from '../models/JoinRequest.js';

const ONE_MINUTE = 60 * 1000;

const cleanupExpiredConversations = async () => {
  const now = new Date();
  const expired = await Conversation.find({ expiresAt: { $lte: now } }).select('_id');
  if (!expired.length) return;
  const ids = expired.map((item) => item._id);
  await Message.deleteMany({ conversationId: { $in: ids } });
  await Conversation.deleteMany({ _id: { $in: ids } });
};

const processPostAvailability = async () => {
  const now = new Date();
  const duePosts = await Post.find({ status: { $in: ['active', 'matched'] }, availabilityDate: { $lte: now } });

  for (const post of duePosts) {
    const acceptedCount = post.acceptedUserIds?.length ?? 0;
    const matched = post.status === 'matched' || acceptedCount > 0;

    if (post.category === 'project_team') {
      await JoinRequest.deleteMany({ postId: post._id });
      await Post.deleteOne({ _id: post._id });
      continue;
    }

    if (!matched) {
      await JoinRequest.deleteMany({ postId: post._id });
      await Post.deleteOne({ _id: post._id });
      continue;
    }

    post.status = 'closed';
    post.closedAt = now;
    post.closeReason = post.closeReason || 'availability_date_reached';
    await post.save();
  }
};

export const startLifecycleJob = () => {
  const run = async () => {
    try {
      await processPostAvailability();
      await cleanupExpiredConversations();
    } catch (error) {
      console.error('Lifecycle job error:', error);
    }
  };

  void run();
  setInterval(run, ONE_MINUTE);
};
