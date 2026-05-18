import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import { containsProfanity, maskProfanity } from '../utils/profanityFilter.js';
import { createNotification, notificationText } from '../services/notificationService.js';

export const getChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id
    })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'username');

    const chatsWithDetails = await Promise.all(
      chats.map(async (chat) => {
        const otherParticipant = chat.participants.find(
          p => p._id.toString() !== req.user._id.toString()
        );

        const profile = await Profile.findOne({ userId: otherParticipant._id });

        const lastMessage = await Message.findOne({ chatId: chat._id })
          .sort({ createdAt: -1 });

        const unreadCount = await Message.countDocuments({
          chatId: chat._id,
          senderId: { $ne: req.user._id },
          read: false
        });

        return {
          ...chat.toObject(),
          otherParticipant: {
            id: otherParticipant._id,
            username: otherParticipant.username,
            profile
          },
          lastMessage,
          unreadCount
        };
      })
    );

    res.json({ chats: chatsWithDetails });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

export const createOrGetChat = async (req, res) => {
  try {
    const { otherUserId, postId } = req.body;

    if (otherUserId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot chat with yourself' });
    }

    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    let chat = await Chat.findOne({
      participants: { $all: [req.user._id, otherUserId] }
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [req.user._id, otherUserId],
        relatedPostId: postId || null
      });

      await createNotification({
        userId: otherUserId,
        actorId: req.user._id,
        type: 'chat_initiated',
        payload: {
          chatId: chat._id,
          conversationId: chat._id,
          initiatorId: req.user._id,
          initiatorUsername: req.user.username,
          link: `/messages/${chat._id}`,
          message: notificationText.chatInitiated.ar
        },
        telegram: {
          eventName: 'new_conversation_created',
          ar: notificationText.chatInitiated.ar,
          fr: notificationText.chatInitiated.fr
        }
      });
    }

    res.json({ chat });
  } catch (error) {
    console.error('Create/get chat error:', error);
    res.status(500).json({ error: 'Failed to create or retrieve chat' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!chat.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ error: 'Not authorized to view this chat' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find({ chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('senderId', 'username');

    const total = await Message.countDocuments({ chatId });

    await Message.updateMany(
      { chatId, senderId: { $ne: req.user._id }, read: false },
      { $set: { read: true } }
    );

    res.json({
      messages: messages.reverse(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    let { body } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!chat.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ error: 'Not authorized to send messages in this chat' });
    }

    if (containsProfanity(body)) {
      body = maskProfanity(body);
    }

    const message = await Message.create({
      chatId,
      senderId: req.user._id,
      body
    });

    chat.lastMessageAt = new Date();
    await chat.save();

    const recipientId = chat.participants.find(
      p => p.toString() !== req.user._id.toString()
    );

    await createNotification({
      userId: recipientId,
      actorId: req.user._id,
      type: 'new_message',
      payload: {
        chatId,
        conversationId: chat._id,
        messageId: message._id,
        senderId: req.user._id,
        senderUsername: req.user.username,
        link: `/messages/${chat._id}`,
        message: notificationText.newMessage.ar
      },
      telegram: {
        eventName: 'new_message_sent',
        ar: notificationText.newMessage.ar,
        fr: notificationText.newMessage.fr
      }
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const reportChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { reason, details } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!chat.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const Report = (await import('../models/Report.js')).default;
    await Report.create({
      reporterId: req.user._id,
      targetType: 'chat',
      targetId: chatId,
      reason,
      details
    });

    res.json({ message: 'Chat reported successfully' });
  } catch (error) {
    console.error('Report chat error:', error);
    res.status(500).json({ error: 'Failed to report chat' });
  }
};
