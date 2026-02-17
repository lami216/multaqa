import Session from '../models/Session.js';
import Message from '../models/Message.js';
import { cleanupSessionLifecycle, transitionSessionToEnded, transitionSessionToEndingRequested } from '../services/lifecycleService.js';

const ensureParticipant = (session, userId) => session.participants.some((p) => p.toString() === userId.toString());

const markSessionRatedByUser = async (session, userId) => {
  const now = new Date();
  const userIdText = userId.toString();
  const completedBy = new Set((session.completedBy ?? []).map((entry) => entry.toString()));
  completedBy.add(userIdText);
  session.completedBy = Array.from(completedBy);

  await session.save();

  const participants = (session.participants ?? []).map((entry) => entry.toString());
  const everyoneCompleted = participants.length > 0 && participants.every((participantId) => completedBy.has(participantId));
  if (everyoneCompleted && session.status === 'completed') {
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
    if (session.status !== 'in_progress') return res.status(400).json({ error: 'Session is not available' });

    transitionSessionToEndingRequested(session, req.user._id, new Date());
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
    if (session.status !== 'pending_confirmation') return res.status(400).json({ error: 'Session is not awaiting confirmation' });

    const currentUserId = req.user._id.toString();
    const requesterId = session.endingRequestedBy ? session.endingRequestedBy.toString() : null;
    if (!requesterId) {
      return res.status(400).json({ error: 'Session end requester is missing' });
    }
    if (requesterId === currentUserId) {
      return res.status(400).json({ error: 'Requester cannot self-confirm session end' });
    }

    const confirmedBy = new Set((session.confirmedBy ?? []).map((entry) => entry.toString()));
    if (confirmedBy.has(currentUserId)) {
      return res.status(400).json({ error: 'Session end already confirmed by user' });
    }

    confirmedBy.add(currentUserId);
    session.confirmedBy = Array.from(confirmedBy);

    let transitionedToCompleted = false;
    if (session.participants.length > 0 && confirmedBy.size >= session.participants.length) {
      transitionSessionToEnded(session, new Date());
      transitionedToCompleted = true;
    }

    await session.save();

    if (transitionedToCompleted) {
      await Message.create({
        conversationId: session.conversationId,
        senderId: req.user._id,
        text: 'تم إغلاق الجلسة.'
      });
    }

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
    const raterId = req.user._id.toString();
    const requesterId = session.endingRequestedBy ? session.endingRequestedBy.toString() : null;
    const canRateWhilePending = session.status === 'pending_confirmation' && requesterId === raterId;
    if (session.status !== 'completed' && !canRateWhilePending) {
      return res.status(400).json({ error: 'Session is not ready for rating' });
    }

    const completedBy = new Set((session.completedBy ?? []).map((entry) => entry.toString()));
    if (completedBy.has(raterId)) {
      return res.status(400).json({ error: 'Rating already submitted' });
    }

    if (!targetUserId || !ensureParticipant(session, targetUserId) || targetUserId.toString() === raterId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const normalizedScore = Number(score);
    if (!Number.isFinite(normalizedScore) || normalizedScore < 0 || normalizedScore > 5) {
      return res.status(400).json({ error: 'Invalid score' });
    }

    if (normalizedScore >= 1) {
      session.rating.set(targetUserId, {
        score: normalizedScore,
        review: typeof review === 'string' ? review.trim() : '',
        createdAt: new Date()
      });
      await session.save();
    }

    await markSessionRatedByUser(session, req.user._id);

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
