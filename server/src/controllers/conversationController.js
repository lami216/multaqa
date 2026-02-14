import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import Post from '../models/Post.js';
import { containsProfanity, maskProfanity } from '../utils/profanityFilter.js';

const buildParticipantsKey = (userId, otherUserId) => {
  return [userId.toString(), otherUserId.toString()].sort().join(':');
};

const sortParticipants = (userId, otherUserId) => {
  return [userId, otherUserId].sort((a, b) => a.toString().localeCompare(b.toString()));
};

const ensureParticipant = (conversation, userId) => {
  return conversation.participants.some(
    (participant) => participant.toString() === userId.toString()
  );
};

const CONVERSATION_INITIAL_DAYS = 7;
const CONVERSATION_EXTENSION_DAYS = 7;
const CONVERSATION_MAX_DAYS = 30;

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const ensureConversationLifetime = async (conversation) => {
  if (conversation.firstOpenedAt && conversation.expiresAt && conversation.maxExpiresAt) {
    return conversation;
  }

  const firstOpenedAt = conversation.firstOpenedAt ?? new Date();
  const maxExpiresAt = conversation.maxExpiresAt ?? addDays(firstOpenedAt, CONVERSATION_MAX_DAYS);
  let expiresAt = conversation.expiresAt ?? addDays(firstOpenedAt, CONVERSATION_INITIAL_DAYS);
  if (expiresAt > maxExpiresAt) {
    expiresAt = maxExpiresAt;
  }

  conversation.firstOpenedAt = firstOpenedAt;
  conversation.expiresAt = expiresAt;
  conversation.maxExpiresAt = maxExpiresAt;
  await conversation.save();
  return conversation;
};

export const createOrGetConversation = async (req, res) => {
  try {
    const { type, postId, otherUserId } = req.body;

    if (!type || !['post', 'direct'].includes(type)) {
      return res.status(400).json({ error: 'Invalid conversation type' });
    }

    if (!otherUserId) {
      return res.status(400).json({ error: 'Other user is required' });
    }

    if (otherUserId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot start a conversation with yourself' });
    }

    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (type === 'post') {
      if (!postId) {
        return res.status(400).json({ error: 'postId is required for post conversations' });
      }

      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
    }

    const participantsKey = buildParticipantsKey(req.user._id, otherUserId);
    const participants = sortParticipants(req.user._id, otherUserId);

    let conversation = await Conversation.findOne({
      type,
      participantsKey,
      ...(type === 'post' ? { postId } : {})
    });

    if (!conversation) {
      conversation = await Conversation.create({
        type,
        participants,
        participantsKey,
        postId: type === 'post' ? postId : null,
        lastMessageAt: null
      });
    }

    res.json({ conversationId: conversation._id });
  } catch (error) {
    console.error('Create/get conversation error:', error);
    res.status(500).json({ error: 'Failed to create or retrieve conversation' });
  }
};

export const getConversations = async (req, res) => {
  try {
    const status = req.query.status ?? 'active';
    const baseQuery = {
      participants: req.user._id,
      deletedBy: { $ne: req.user._id }
    };
    const statusQuery = status === 'active'
      ? { archivedBy: { $ne: req.user._id } }
      : status === 'archived'
        ? { archivedBy: req.user._id }
        : null;

    if (!statusQuery) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }

    const conversations = await Conversation.find({
      ...baseQuery,
      ...statusQuery
    }).sort({ lastMessageAt: -1, updatedAt: -1 });

    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conversation) => {
        await ensureConversationLifetime(conversation);
        const otherParticipantId = conversation.participants.find(
          (participant) => participant.toString() !== req.user._id.toString()
        );

        const otherParticipant = otherParticipantId
          ? await User.findById(otherParticipantId).select('username')
          : null;

        const profile = otherParticipantId
          ? await Profile.findOne({ userId: otherParticipantId })
          : null;

        const lastMessage = await Message.findOne({ conversationId: conversation._id })
          .sort({ createdAt: -1 });

        const unreadCount = await Message.countDocuments({
          conversationId: conversation._id,
          senderId: { $ne: req.user._id },
          readAt: null
        });

        return {
          ...conversation.toObject(),
          otherParticipant: otherParticipant
            ? {
                id: otherParticipant._id,
                username: otherParticipant.username,
                profile
              }
            : null,
          lastMessage: lastMessage
            ? {
                text: lastMessage.text,
                createdAt: lastMessage.createdAt,
                senderId: lastMessage.senderId,
                deliveredAt: lastMessage.deliveredAt ?? null,
                readAt: lastMessage.readAt ?? null
              }
            : null,
          unreadCount
        };
      })
    );

    res.json({ conversations: conversationsWithDetails });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

export const archiveConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!ensureParticipant(conversation, req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to archive this conversation' });
    }

    await Conversation.updateOne(
      { _id: id },
      { $addToSet: { archivedBy: req.user._id } }
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Archive conversation error:', error);
    res.status(500).json({ error: 'Failed to archive conversation' });
  }
};

export const unarchiveConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!ensureParticipant(conversation, req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to unarchive this conversation' });
    }

    await Conversation.updateOne(
      { _id: id },
      { $pull: { archivedBy: req.user._id } }
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Unarchive conversation error:', error);
    res.status(500).json({ error: 'Failed to unarchive conversation' });
  }
};

export const pinConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!ensureParticipant(conversation, req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to pin this conversation' });
    }

    await Conversation.updateOne(
      { _id: id },
      { $addToSet: { pinnedBy: req.user._id } }
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Pin conversation error:', error);
    res.status(500).json({ error: 'Failed to pin conversation' });
  }
};

export const unpinConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!ensureParticipant(conversation, req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to unpin this conversation' });
    }

    await Conversation.updateOne(
      { _id: id },
      { $pull: { pinnedBy: req.user._id } }
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Unpin conversation error:', error);
    res.status(500).json({ error: 'Failed to unpin conversation' });
  }
};

export const deleteConversationForMe = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!ensureParticipant(conversation, req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to delete this conversation' });
    }

    await Conversation.updateOne(
      { _id: id },
      { $addToSet: { deletedBy: req.user._id }, $pull: { archivedBy: req.user._id } }
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Delete conversation for me error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    let { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!ensureParticipant(conversation, req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to send messages in this conversation' });
    }

    await ensureConversationLifetime(conversation);

    if (containsProfanity(text)) {
      text = maskProfanity(text);
    }

    const message = await Message.create({
      conversationId: id,
      senderId: req.user._id,
      text
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { after, limit = 30 } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10) || 30, 50);

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!ensureParticipant(conversation, req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to view this conversation' });
    }

    await ensureConversationLifetime(conversation);

    let query = { conversationId: id };
    let messages;

    if (after) {
      const afterDate = new Date(after);
      if (Number.isNaN(afterDate.getTime())) {
        return res.status(400).json({ error: 'Invalid cursor' });
      }
      query = {
        ...query,
        createdAt: { $gt: afterDate }
      };
      messages = await Message.find(query)
        .sort({ createdAt: 1 })
        .limit(parsedLimit);
    } else {
      messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(parsedLimit);
      messages = messages.reverse();
    }

    await Message.updateMany(
      { conversationId: id, senderId: { $ne: req.user._id }, deliveredAt: null },
      { $set: { deliveredAt: new Date() } }
    );

    const nextCursor = messages.length ? messages[messages.length - 1].createdAt : null;

    res.json({
      messages,
      nextCursor
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const markRead = async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!ensureParticipant(conversation, req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to mark this conversation as read' });
    }

    await ensureConversationLifetime(conversation);

    await Message.updateMany(
      { conversationId: id, senderId: { $ne: req.user._id }, readAt: null },
      { $set: { readAt: new Date() } }
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

export const extendConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    if (!ensureParticipant(conversation, req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to extend this conversation' });
    }

    await ensureConversationLifetime(conversation);

    const now = new Date();
    const remainingMs = conversation.expiresAt.getTime() - now.getTime();
    const lastTwoDaysMs = 2 * 24 * 60 * 60 * 1000;
    if (remainingMs > lastTwoDaysMs) {
      return res.status(400).json({ error: 'Extension is only available during the last 2 days.' });
    }

    let nextExpiresAt = addDays(conversation.expiresAt, CONVERSATION_EXTENSION_DAYS);
    if (nextExpiresAt > conversation.maxExpiresAt) {
      nextExpiresAt = conversation.maxExpiresAt;
    }

    if (nextExpiresAt.getTime() === conversation.expiresAt.getTime()) {
      return res.status(400).json({ error: 'Maximum conversation lifetime reached.' });
    }

    conversation.expiresAt = nextExpiresAt;
    await conversation.save();

    return res.json({ conversation });
  } catch (error) {
    console.error('Extend conversation error:', error);
    return res.status(500).json({ error: 'Failed to extend conversation' });
  }
};
