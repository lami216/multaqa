import Report from '../models/Report.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Faculty from '../models/Faculty.js';
import Major from '../models/Major.js';
import Subject from '../models/Subject.js';
import Event from '../models/Event.js';
import Profile from '../models/Profile.js';
import AcademicSetting from '../models/AcademicSetting.js';
import redis from '../config/redis.js';
import { getAcademicSettingsPayload } from '../services/academicSettingsService.js';

export const getReports = async (req, res) => {
  try {
    const { status, targetType, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (targetType) query.targetType = targetType;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('reporterId', 'username')
      .populate('targetId');

    const total = await Report.countDocuments(query);

    res.json({
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

export const resolveReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findByIdAndUpdate(
      id,
      { status: 'resolved' },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ message: 'Report resolved successfully', report });
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ error: 'Failed to resolve report' });
  }
};

export const deletePostAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findByIdAndDelete(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await Event.create({
      action: 'post_deleted',
      actorId: req.user._id,
      postId: id,
      meta: { category: post.category }
    });

    await redis.del('posts:*');

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post admin error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const { action, limit = 10 } = req.query;
    const activePosts = await Post.countDocuments({
      status: 'active'
    });

    const expiredPosts = await Post.countDocuments({ status: 'expired' });

    const matchedOrClosedPosts = await Post.countDocuments({
      status: { $in: ['matched', 'closed'] }
    });

    const acceptedAggregate = await Post.aggregate([
      {
        $project: {
          acceptedCount: { $size: { $ifNull: ['$acceptedUserIds', []] } }
        }
      },
      { $match: { acceptedCount: { $gt: 0 } } },
      { $count: 'count' }
    ]);
    const postsWithAccepted = acceptedAggregate[0]?.count ?? 0;

    const closedWithoutAcceptedAggregate = await Post.aggregate([
      {
        $project: {
          status: 1,
          acceptedCount: { $size: { $ifNull: ['$acceptedUserIds', []] } }
        }
      },
      { $match: { status: 'closed', acceptedCount: 0 } },
      { $count: 'count' }
    ]);
    const closedWithoutAccepted = closedWithoutAcceptedAggregate[0]?.count ?? 0;

    const userRoleCounts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    const usersByRole = userRoleCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const eventQuery = action ? { action } : {};
    const events = await Event.find(eventQuery)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 10, 50))
      .populate('actorId', 'username role')
      .populate('postId', 'title category');

    res.json({
      stats: {
        activePosts,
        matchedOrClosedPosts,
        expiredPosts,
        postsWithAccepted,
        closedWithoutAccepted,
        usersByRole
      },
      events
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

export const banUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { banned } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { banned: banned !== undefined ? banned : true },
      { new: true }
    ).select('-passwordHash -refreshToken');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: user.banned ? 'User banned successfully' : 'User unbanned successfully', 
      user 
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Failed to ban/unban user' });
  }
};


export const resetUserRemainingSubjects = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      id,
      { $set: { remainingSubjects: [], remainingSubjectsConfirmed: false } },
      { new: true }
    ).select('-passwordHash -refreshToken');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await Profile.findOneAndUpdate(
      { userId: id },
      { $set: { remainingSubjects: [] } },
      { new: true }
    );

    res.json({ message: 'Remaining subjects reset successfully', user });
  } catch (error) {
    console.error('Reset user remaining subjects error:', error);
    res.status(500).json({ error: 'Failed to reset remaining subjects' });
  }
};

export const getFaculties = async (req, res) => {
  try {
    const faculties = await Faculty.find({ active: true }).sort({ nameAr: 1 });
    res.json({ faculties });
  } catch (error) {
    console.error('Get faculties error:', error);
    res.status(500).json({ error: 'Failed to fetch faculties' });
  }
};

export const createFaculty = async (req, res) => {
  try {
    const { nameAr, nameFr } = req.body;

    const faculty = await Faculty.create({ nameAr, nameFr });

    res.status(201).json({ message: 'Faculty created successfully', faculty });
  } catch (error) {
    console.error('Create faculty error:', error);
    res.status(500).json({ error: 'Failed to create faculty' });
  }
};

export const deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await Faculty.findByIdAndUpdate(
      id,
      { active: false },
      { new: true }
    );

    if (!faculty) {
      return res.status(404).json({ error: 'Faculty not found' });
    }

    res.json({ message: 'Faculty deleted successfully' });
  } catch (error) {
    console.error('Delete faculty error:', error);
    res.status(500).json({ error: 'Failed to delete faculty' });
  }
};

export const getMajors = async (req, res) => {
  try {
    const { facultyId } = req.query;
    const query = { active: true };
    if (facultyId) {
      query.facultyId = facultyId;
    }

    const majors = await Major.find(query).sort({ nameAr: 1 }).populate('facultyId', 'nameAr nameFr');
    res.json({ majors });
  } catch (error) {
    console.error('Get majors error:', error);
    res.status(500).json({ error: 'Failed to fetch majors' });
  }
};

export const createMajor = async (req, res) => {
  try {
    const { nameAr, nameFr, facultyId } = req.body;
    const major = await Major.create({ nameAr, nameFr, facultyId });

    res.status(201).json({ message: 'Major created successfully', major });
  } catch (error) {
    console.error('Create major error:', error);
    res.status(500).json({ error: 'Failed to create major' });
  }
};

export const updateMajor = async (req, res) => {
  try {
    const { id } = req.params;
    const { nameAr, nameFr, facultyId, active } = req.body;

    const major = await Major.findByIdAndUpdate(
      id,
      { nameAr, nameFr, facultyId, active },
      { new: true }
    );

    if (!major) {
      return res.status(404).json({ error: 'Major not found' });
    }

    res.json({ message: 'Major updated successfully', major });
  } catch (error) {
    console.error('Update major error:', error);
    res.status(500).json({ error: 'Failed to update major' });
  }
};

export const deleteMajor = async (req, res) => {
  try {
    const { id } = req.params;

    const major = await Major.findByIdAndUpdate(
      id,
      { active: false },
      { new: true }
    );

    if (!major) {
      return res.status(404).json({ error: 'Major not found' });
    }

    res.json({ message: 'Major deleted successfully' });
  } catch (error) {
    console.error('Delete major error:', error);
    res.status(500).json({ error: 'Failed to delete major' });
  }
};

export const getSubjects = async (req, res) => {
  try {
    const { facultyId, majorId } = req.query;
    const query = { active: true };
    if (facultyId) query.facultyId = facultyId;
    if (majorId) query.majorId = majorId;

    const subjects = await Subject.find(query)
      .sort({ nameAr: 1 })
      .populate('facultyId', 'nameAr nameFr')
      .populate('majorId', 'nameAr nameFr');

    res.json({ subjects });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

export const createSubject = async (req, res) => {
  try {
    const { code, nameAr, nameFr, facultyId, majorId } = req.body;
    const subject = await Subject.create({ code, nameAr, nameFr, facultyId, majorId });

    res.status(201).json({ message: 'Subject created successfully', subject });
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ error: 'Failed to create subject' });
  }
};

export const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, nameAr, nameFr, facultyId, majorId, active } = req.body;

    const subject = await Subject.findByIdAndUpdate(
      id,
      { code, nameAr, nameFr, facultyId, majorId, active },
      { new: true }
    );

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json({ message: 'Subject updated successfully', subject });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
};

export const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findByIdAndUpdate(
      id,
      { active: false },
      { new: true }
    );

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
};

export const getAcademicSettings = async (req, res) => {
  try {
    const payload = await getAcademicSettingsPayload();
    res.json(payload);
  } catch (error) {
    console.error('Get academic settings error:', error);
    res.status(500).json({ error: 'Failed to fetch academic settings' });
  }
};

const normalizeIncomingAcademicSettings = (body = {}) => {
  const currentTermType = body.currentTermType ?? body.academicTermType;
  const rawFaculties = Array.isArray(body.faculties) ? body.faculties : body.settings?.faculties;

  if (!['odd', 'even'].includes(currentTermType) || !Array.isArray(rawFaculties)) {
    return null;
  }

  const faculties = rawFaculties
    .filter((faculty) => faculty?.facultyId)
    .map((faculty) => ({
      facultyId: String(faculty.facultyId),
      enabled: faculty.enabled !== false,
      levels: Array.isArray(faculty.levels)
        ? faculty.levels
            .filter((level) => level?.levelId)
            .map((level) => ({
              levelId: String(level.levelId),
              majors: Array.isArray(level.majors)
                ? level.majors
                    .filter((major) => major?.majorId)
                    .map((major) => ({
                      majorId: String(major.majorId),
                      status: major.status === 'closed' ? 'closed' : (major.status === 'collecting' ? 'collecting' : 'active'),
                      threshold:
                        major.status === 'collecting'
                          ? Math.max(1, Number.parseInt(String(major.threshold ?? 1), 10) || 1)
                          : null
                    }))
                : []
            }))
        : []
    }));

  return { currentTermType, faculties };
};

export const updateAcademicSettings = async (req, res) => {
  try {
    const normalized = normalizeIncomingAcademicSettings(req.body ?? {});
    if (!normalized) {
      return res.status(400).json({ error: 'Invalid academic settings payload' });
    }

    await AcademicSetting.findOneAndUpdate(
      { key: 'academic' },
      {
        $set: normalized,
        $setOnInsert: { key: 'academic' }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const payload = await getAcademicSettingsPayload();
    res.json(payload);
  } catch (error) {
    console.error('Update academic settings error:', error);
    res.status(500).json({ error: 'Failed to update academic settings' });
  }
};
