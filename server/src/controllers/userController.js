import User from '../models/User.js';
import Profile from '../models/Profile.js';
import Post from '../models/Post.js';
import redis from '../config/redis.js';
import { maybeActivateMajor, getMajorAvailability } from '../services/academicSettingsService.js';

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
    const posts = await Post.find({
      authorId: user._id,
      status: 'active'
    })
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
    const { profileLocked: _ignored, ...updates } = req.body;
    const updateKeys = Object.keys(updates);
    const isRemainingSubjectsOnlyUpdate =
      updateKeys.length === 1 &&
      updateKeys[0] === 'remainingSubjects' &&
      Array.isArray(updates.remainingSubjects);

    if (isRemainingSubjectsOnlyUpdate) {
      const currentUser = await User.findById(req.user._id).select('remainingSubjectsConfirmed');
      if (currentUser?.remainingSubjectsConfirmed) {
        return res.status(409).json({ error: 'Remaining subjects are already confirmed' });
      }

      const profile = await Profile.findOneAndUpdate(
        { userId: req.user._id },
        {
          $set: { remainingSubjects: updates.remainingSubjects },
          $setOnInsert: { userId: req.user._id }
        },
        { new: true, runValidators: true, upsert: true, setDefaultsOnInsert: true }
      );

      await User.findByIdAndUpdate(req.user._id, {
        $set: {
          remainingSubjects: updates.remainingSubjects.map((item) => item.subjectCode),
          remainingSubjectsConfirmed: true
        }
      });

      await redis.del(`profile:${req.user.username}`);
      return res.json({ message: 'Profile updated successfully', profile });
    }

    const hasRequiredFields = Boolean(
      updates.facultyId &&
        updates.majorId &&
        updates.level &&
        updates.semesterId &&
        Array.isArray(updates.subjectCodes) &&
        updates.subjectCodes.length
    );
    const nextUpdates =
      hasRequiredFields
        ? { ...updates, profileLocked: true }
        : updates;

    const profile = await Profile.findOneAndUpdate(
      { userId: req.user._id, profileLocked: { $ne: true } },
      {
        $set: nextUpdates,
        $setOnInsert: { userId: req.user._id }
      },
      { new: true, runValidators: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (!profile) {
      return res.status(409).json({ error: 'Profile is locked' });
    }

    await redis.del(`profile:${req.user.username}`);

    await maybeActivateMajor(profile.facultyId, profile.level, profile.majorId);
    const majorAvailability = await getMajorAvailability(profile.facultyId, profile.level, profile.majorId);

    res.json({ message: 'Profile updated successfully', profile, majorAvailability });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'Profile is locked' });
    }
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
