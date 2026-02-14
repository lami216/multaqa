import Profile from '../models/Profile.js';
import { getMajorAvailability } from '../services/academicSettingsService.js';

const blockedMessage = 'تخصصك موجود لكنه غير مُفعّل بعد.';

export const requireActiveMajor = async (req, res, next) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id }).select('facultyId level majorId');
    if (!profile?.facultyId || !profile?.level || !profile?.majorId) {
      return res.status(403).json({
        error: blockedMessage,
        code: 'MAJOR_NOT_ACTIVE',
        status: 'collecting',
        threshold: 0,
        registeredCount: 0
      });
    }

    const availability = await getMajorAvailability(profile.facultyId, profile.level, profile.majorId);

    if (availability.status !== 'active') {
      return res.status(403).json({
        error: blockedMessage,
        code: 'MAJOR_NOT_ACTIVE',
        status: availability.status,
        threshold: availability.threshold,
        registeredCount: availability.registeredCount
      });
    }

    return next();
  } catch (error) {
    console.error('Major access check error:', error);
    return res.status(500).json({ error: 'Failed to validate major access' });
  }
};
