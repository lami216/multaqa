import Notification from '../models/Notification.js';
import redis from '../config/redis.js';

export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments({ userId: req.user._id });
    const unread = await Notification.countDocuments({ 
      userId: req.user._id, 
      read: false 
    });

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      unread
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (notificationIds && Array.isArray(notificationIds)) {
      await Notification.updateMany(
        { _id: { $in: notificationIds }, userId: req.user._id },
        { $set: { read: true } }
      );
    } else {
      await Notification.updateMany(
        { userId: req.user._id, read: false },
        { $set: { read: true } }
      );
    }

    await redis.del(`notifications:unread:${req.user._id}`);

    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const cacheKey = `notifications:unread:${req.user._id}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json({ unread: parseInt(cached) });
    }

    const unread = await Notification.countDocuments({
      userId: req.user._id,
      read: false
    });

    await redis.set(cacheKey, unread.toString(), 30);

    res.json({ unread });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};
