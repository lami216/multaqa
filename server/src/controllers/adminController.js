import Report from '../models/Report.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Faculty from '../models/Faculty.js';
import redis from '../config/redis.js';

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

    await redis.del('posts:*');

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post admin error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
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
