import Post from '../models/Post.js';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import redis from '../config/redis.js';
import { maskContactInfo } from '../utils/contentMasking.js';
import { containsProfanity, maskProfanity } from '../utils/profanityFilter.js';

export const getPosts = async (req, res) => {
  try {
    const { 
      category, 
      faculty, 
      level, 
      tags, 
      languagePref, 
      search, 
      page = 1, 
      limit = 20 
    } = req.query;

    const query = { status: 'active' };

    if (category) query.category = category;
    if (faculty) query.faculty = faculty;
    if (level) query.level = level;
    if (languagePref) query.languagePref = languagePref;
    if (tags) {
      const tagArray = tags.split(',');
      query.tags = { $in: tagArray };
    }
    if (search) {
      query.$text = { $search: search };
    }

    const cacheKey = `posts:${JSON.stringify(query)}:${page}:${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('authorId', 'username');

    const total = await Post.countDocuments(query);

    const postsWithProfiles = await Promise.all(
      posts.map(async (post) => {
        const profile = await Profile.findOne({ userId: post.authorId._id });
        return {
          ...post.toObject(),
          author: {
            username: post.authorId.username,
            profile
          }
        };
      })
    );

    const result = {
      posts: postsWithProfiles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };

    await redis.set(cacheKey, JSON.stringify(result), 30);

    res.json(result);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

export const getPost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id).populate('authorId', 'username');
    if (!post || post.status !== 'active') {
      return res.status(404).json({ error: 'Post not found' });
    }

    const profile = await Profile.findOne({ userId: post.authorId._id });

    res.json({
      post: post.toObject(),
      author: {
        username: post.authorId.username,
        profile
      }
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

export const createPost = async (req, res) => {
  try {
    let { title, description, ...rest } = req.body;

    if (containsProfanity(title) || containsProfanity(description)) {
      title = maskProfanity(title);
      description = maskProfanity(description);
    }

    description = maskContactInfo(description);

    const post = await Post.create({
      authorId: req.user._id,
      title,
      description,
      ...rest
    });

    await redis.del('posts:*');

    res.status(201).json({ message: 'Post created successfully', post });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = req.body;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }

    if (updates.title && containsProfanity(updates.title)) {
      updates.title = maskProfanity(updates.title);
    }
    if (updates.description) {
      if (containsProfanity(updates.description)) {
        updates.description = maskProfanity(updates.description);
      }
      updates.description = maskContactInfo(updates.description);
    }

    Object.assign(post, updates);
    await post.save();

    await redis.del('posts:*');

    res.json({ message: 'Post updated successfully', post });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(id);

    await redis.del('posts:*');

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

export const reportPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, details } = req.body;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const Report = (await import('../models/Report.js')).default;
    await Report.create({
      reporterId: req.user._id,
      targetType: 'post',
      targetId: id,
      reason,
      details
    });

    res.json({ message: 'Post reported successfully' });
  } catch (error) {
    console.error('Report post error:', error);
    res.status(500).json({ error: 'Failed to report post' });
  }
};
