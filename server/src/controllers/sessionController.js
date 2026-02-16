import Session from '../models/Session.js';
import { cleanupSessionLifecycle, transitionSessionToRating } from '../services/lifecycleService.js';

const ensureParticipant = (session, userId) => session.participants.some((p) => p.toString() === userId.toString());

const markSessionCompletedByUser = async (session, userId) => {
  const now = new Date();
  const userIdText = userId.toString();
  const completedBy = new Set((session.completedBy ?? []).map((entry) => entry.toString()));
  completedBy.add(userIdText);
  session.completedBy = Array.from(completedBy);

  transitionSessionToRating(session, session.endRequestedBy ?? null, now);
  await session.save();

  if (session.status === 'completed' && session.completionDeadlineAt && session.completionDeadlineAt <= now) {
    await cleanupSessionLifecycle(session._id);
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
    if (session.status !== 'in_progress' && session.status !== 'pending_close') return res.status(400).json({ error: 'Session is not available' });

    transitionSessionToRating(session, req.user._id, new Date());
    await session.save();

    if (session.status === 'completed') {
      await cleanupSessionLifecycle(session._id);
    }

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
    }

    await markSessionCompletedByUser(session, req.user._id);

    res.json({ session });
  } catch (error) {
    console.error('Submit session rating error:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
};

export const runSessionCleanup = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findById(id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (!ensureParticipant(session, req.user._id)) return res.status(403).json({ error: 'Not authorized' });

    if (!session.completionDeadlineAt || session.completionDeadlineAt > new Date()) {
      return res.status(400).json({ error: 'Session cleanup window has not ended yet' });
    }

    await cleanupSessionLifecycle(session._id);
    return res.json({ ok: true });
  } catch (error) {
    console.error('Run session cleanup error:', error);
    return res.status(500).json({ error: 'Failed to cleanup session' });
  }
};
