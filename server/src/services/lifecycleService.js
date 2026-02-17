import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import JoinRequest from '../models/JoinRequest.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import Post from '../models/Post.js';
import Session from '../models/Session.js';
import User from '../models/User.js';

export const SESSION_ACTIVE_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_END_CONFIRM_MS = 48 * 60 * 60 * 1000;
export const SESSION_RATING_MS = 48 * 60 * 60 * 1000;

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  return new mongoose.Types.ObjectId(value);
};

const withOptionalSession = (dbSession) => (dbSession ? { session: dbSession } : {});

const notificationFiltersForId = (field, id) => {
  const objectId = toObjectId(id);
  const idText = objectId.toString();
  return [{ [field]: objectId }, { [field]: idText }];
};

export const deleteNotificationsByPostId = async (postId, dbSession = null) => {
  const filters = notificationFiltersForId('payload.postId', postId);
  await Notification.deleteMany({ $or: filters }, withOptionalSession(dbSession));
};

export const deleteNotificationsByConversationId = async (conversationId, dbSession = null) => {
  const filters = notificationFiltersForId('payload.conversationId', conversationId);
  await Notification.deleteMany({ $or: filters }, withOptionalSession(dbSession));
};

export const deleteNotificationsByJoinRequestId = async (requestId, dbSession = null) => {
  const filters = notificationFiltersForId('payload.requestId', requestId);
  await Notification.deleteMany({ $or: filters }, withOptionalSession(dbSession));
};

export const initializeSessionLifecycle = (session, now = new Date()) => {
  if (!session.autoCloseAt) {
    session.autoCloseAt = new Date(now.getTime() + SESSION_ACTIVE_MS);
  }
  if (!session.startedAt) {
    session.startedAt = now;
  }
  return session;
};

export const transitionSessionToEndingRequested = (session, userId, now = new Date()) => {
  const requesterId = userId ? toObjectId(userId) : session.endingRequestedBy ?? null;
  session.status = 'pending_confirmation';
  session.endingRequestedBy = requesterId;
  session.endingRequestedAt = session.endingRequestedAt ?? now;
  session.endedAt = null;
  session.confirmedBy = requesterId ? [requesterId] : [];

  const deadline = new Date(now.getTime() + SESSION_END_CONFIRM_MS);
  session.completionDeadlineAt = deadline;
  session.autoCloseAt = deadline;
  return session;
};

export const transitionSessionToEnded = (session, now = new Date()) => {
  session.status = 'completed';
  session.endedAt = now;
  session.completionDeadlineAt = new Date(now.getTime() + SESSION_RATING_MS);
  session.autoCloseAt = session.completionDeadlineAt;
  return session;
};

const applySessionRatingSummary = async (sessionDoc, dbSession) => {
  const ratingEntries = Array.from(sessionDoc.rating?.entries?.() ?? []);
  for (const [targetUserId, rating] of ratingEntries) {
    const score = Number(rating?.score);
    if (!Number.isFinite(score) || score < 1 || score > 5) continue;

    await User.updateOne(
      { _id: targetUserId },
      [
        {
          $set: {
            totalReviews: { $add: ['$totalReviews', 1] },
            averageRating: {
              $divide: [
                {
                  $add: [
                    { $multiply: ['$averageRating', '$totalReviews'] },
                    score
                  ]
                },
                { $add: ['$totalReviews', 1] }
              ]
            }
          }
        }
      ],
      { session: dbSession }
    );
  }
};

export const cleanupSessionLifecycle = async (sessionId) => {
  const dbSession = await mongoose.startSession();
  try {
    let cleaned = false;
    await dbSession.withTransaction(async () => {
      const sessionDoc = await Session.findById(sessionId).session(dbSession);
      if (!sessionDoc) return;

      const participantIds = (sessionDoc.participants ?? []).map((entry) => toObjectId(entry));
      if (participantIds.length) {
        await User.updateMany(
          { _id: { $in: participantIds } },
          { $inc: { sessionsCount: 1 } },
          { session: dbSession }
        );
      }

      await applySessionRatingSummary(sessionDoc, dbSession);

      await Message.deleteMany(
        { conversationId: sessionDoc.conversationId },
        { session: dbSession }
      );

      await deleteNotificationsByConversationId(sessionDoc.conversationId, dbSession);

      await Conversation.deleteOne(
        { _id: sessionDoc.conversationId },
        { session: dbSession }
      );

      if (sessionDoc.postId) {
        await JoinRequest.deleteMany(
          { postId: sessionDoc.postId },
          { session: dbSession }
        );
        await deleteNotificationsByPostId(sessionDoc.postId, dbSession);
        await Post.deleteOne({ _id: sessionDoc.postId }, { session: dbSession });
      }

      await Session.deleteOne({ _id: sessionDoc._id, status: 'completed' }, { session: dbSession });
      cleaned = true;
    });

    return cleaned;
  } finally {
    await dbSession.endSession();
  }
};
