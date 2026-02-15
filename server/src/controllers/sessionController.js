import Session from '../models/Session.js';
import User from '../models/User.js';
import Post from '../models/Post.js';

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

const ensureParticipant = (session, userId) => session.participants.some((p) => p.toString() === userId.toString());

const updateUserRatingStats = async (targetUserId) => {
  const sessions = await Session.find({
    participants: targetUserId,
    status: 'completed',
    [`rating.${targetUserId}`]: { $exists: true }
  }).select('rating');

  const ratings = sessions
    .map((entry) => entry.rating?.get(targetUserId.toString())?.score)
    .filter((score) => Number.isFinite(score));

  const totalReviews = ratings.length;
  const averageRating = totalReviews ? (ratings.reduce((sum, score) => sum + score, 0) / totalReviews) : 0;

  const sessionsCount = await Session.countDocuments({
    participants: targetUserId,
    status: 'completed'
  });

  await User.updateOne(
    { _id: targetUserId },
    { $set: { averageRating, totalReviews, sessionsCount } }
  );
};

const finalizeSessionPost = async (session) => {
  if (!session?.postId) return;
  await Post.deleteOne({ _id: session.postId });
};

const markSessionCompletedByUser = async (session, userId) => {
  const userIdText = userId.toString();
  const completedBy = (session.completedBy ?? []).map((entry) => entry.toString());
  if (!completedBy.includes(userIdText)) {
    session.completedBy = [...(session.completedBy ?? []), userId];
  }

  if (session.status !== 'completed') {
    session.status = 'completed';
    session.endedAt = new Date();
  }

  const completedUnique = Array.from(new Set((session.completedBy ?? []).map((entry) => entry.toString())));
  if (completedUnique.length >= 2) {
    session.completionDeadlineAt = null;
    session.autoCloseAt = null;
  } else if (!session.completionDeadlineAt) {
    const deadline = new Date(Date.now() + FORTY_EIGHT_HOURS_MS);
    session.completionDeadlineAt = deadline;
    session.autoCloseAt = deadline;
  }

  await session.save();

  if (completedUnique.length >= 2) {
    await finalizeSessionPost(session);
  }

  return session;
};

export const getSessionByConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const session = await Session.findOne({ conversationId });
    if (!session) return res.json({ session: null });
    if (!ensureParticipant(session, req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to access this session' });
    }
    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
};

export const requestSessionEnd = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findById(id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (!ensureParticipant(session, req.user._id)) return res.status(403).json({ error: 'Not authorized' });
    if (session.status !== 'in_progress' && session.status !== 'completed') return res.status(400).json({ error: 'Session is not available' });

    const now = new Date();
    session.endRequestedBy = req.user._id;
    session.endRequestedAt = now;
    if (session.status !== 'completed') {
      session.status = 'completed';
      session.endedAt = now;
    }
    if (!session.completionDeadlineAt) {
      const deadline = new Date(now.getTime() + FORTY_EIGHT_HOURS_MS);
      session.completionDeadlineAt = deadline;
      session.autoCloseAt = deadline;
    }
    await session.save();

    res.json({ session });
  } catch (error) {
    console.error('Request session end error:', error);
    res.status(500).json({ error: 'Failed to request session end' });
  }
};

export const confirmSessionEnd = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findById(id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (!ensureParticipant(session, req.user._id)) return res.status(403).json({ error: 'Not authorized' });

    await markSessionCompletedByUser(session, req.user._id);
    res.json({ session });
  } catch (error) {
    console.error('Confirm session end error:', error);
    res.status(500).json({ error: 'Failed to complete session' });
  }
};

export const submitSessionRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetUserId, score, review } = req.body;

    const session = await Session.findById(id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (!ensureParticipant(session, req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const hasScore = Number.isFinite(Number(score)) && Number(score) >= 1;
    if (hasScore) {
      if (!targetUserId || !ensureParticipant(session, targetUserId)) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      session.rating.set(targetUserId, {
        score: Number(score),
        review: typeof review === 'string' ? review.trim() : '',
        createdAt: new Date()
      });
      await session.save();
      await updateUserRatingStats(targetUserId);
    }

    await markSessionCompletedByUser(session, req.user._id);

    res.json({ session });
  } catch (error) {
    console.error('Submit session rating error:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
};
