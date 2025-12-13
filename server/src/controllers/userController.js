import User from '../models/User.js';
import Profile from '../models/Profile.js';
import Post from '../models/Post.js';
import redis from '../config/redis.js';

export const getPublicProfile = async (req, res) => {
  try {
    const { username } = req.params;

    const cacheKey = `profile:${username}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const user = await User.findOne({ username }).select('-passwordHash -refreshToken');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profile = await Profile.findOne({ userId: user._id });
    const posts = await Post.find({ authorId: user._id, status: 'active' })
      .sort({ createdAt: -1 })
      .limit(10);

    const result = {
      user: {
        id: user._id,
        username: user.username,
        emailVerified: user.emailVerified
      },
      profile,
      posts
    };

    await redis.set(cacheKey, JSON.stringify(result), 60);

    res.json(result);
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const updates = req.body;

    const profile = await Profile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    await redis.del(`profile:${req.user.username}`);

    res.json({ message: 'Profile updated successfully', profile });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    const { avatarUrl, avatarFileId } = req.body;

    const profile = await Profile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { avatarUrl, avatarFileId } },
      { new: true }
    );

    await redis.del(`profile:${req.user.username}`);

    res.json({ message: 'Avatar uploaded successfully', profile });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
};
