import Post from '../models/Post.js';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import JoinRequest from '../models/JoinRequest.js';
import Event from '../models/Event.js';
import redis from '../config/redis.js';
import { maskContactInfo } from '../utils/contentMasking.js';
import { containsProfanity, maskProfanity } from '../utils/profanityFilter.js';

const expirePosts = async () => {
  const now = new Date();
  await Post.updateMany(
    { status: 'active', expiresAt: { $lte: now } },
    { $set: { status: 'expired' } }
  );
};

const buildStudyPartnerTitle = (subjectCodes) => `Study partner • ${subjectCodes.join(' & ')}`;

const maxAcceptedForRole = (studentRole) => {
  if (studentRole === 'helper') return 3;
  return 1;
};

const normalizeValue = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const buildSubjectSet = (subjects = []) => new Set(subjects.map((subject) => normalizeValue(subject)).filter(Boolean));

const countSharedSubjects = (userSubjects, postSubjects) => {
  if (!userSubjects.length || !postSubjects.length) return 0;
  const userSet = buildSubjectSet(userSubjects);
  let count = 0;
  postSubjects.forEach((subject) => {
    const normalized = normalizeValue(subject);
    if (normalized && userSet.has(normalized)) {
      count += 1;
    }
  });
  return count;
};

const calculateMatchScore = ({
  userProfile,
  authorProfile,
  post,
  userSubjects,
  postSubjects
}) => {
  const sameInstitute =
    Boolean(userProfile?.facultyId && authorProfile?.facultyId) &&
    normalizeValue(userProfile?.facultyId) === normalizeValue(authorProfile?.facultyId);
  const sameFaculty =
    Boolean(userProfile?.faculty && (post?.faculty || authorProfile?.faculty)) &&
    normalizeValue(userProfile?.faculty) === normalizeValue(post?.faculty || authorProfile?.faculty);
  const sameSpecialty =
    Boolean(userProfile?.major || userProfile?.majorId) &&
    Boolean(authorProfile?.major || authorProfile?.majorId) &&
    normalizeValue(userProfile?.majorId ?? userProfile?.major) ===
      normalizeValue(authorProfile?.majorId ?? authorProfile?.major);
  const sameLevel =
    Boolean(userProfile?.level && (post?.level || authorProfile?.level)) &&
    normalizeValue(userProfile?.level) === normalizeValue(post?.level || authorProfile?.level);
  const sharedSubjectsCount = countSharedSubjects(userSubjects, postSubjects);
  const overlapPoints = sharedSubjectsCount
    ? Math.round((30 * sharedSubjectsCount) / Math.min(userSubjects.length, postSubjects.length))
    : 0;

  const rawScore =
    (sameInstitute ? 20 : 0) +
    (sameFaculty ? 20 : 0) +
    (sameSpecialty ? 20 : 0) +
    (sameLevel ? 10 : 0) +
    overlapPoints;

  return Math.min(100, rawScore);
};

const resolveIntentBoost = (intent, post) => {
  if (!intent) return 0;
  if (intent === 'NEED_HELP') {
    if (post.category === 'tutor_offer') return 2;
    if (post.category === 'study_partner' && post.studentRole === 'helper') return 2;
    return 0;
  }
  if (intent === 'STUDY_TOGETHER') {
    if (post.category === 'study_partner' && post.studentRole === 'partner') return 2;
    return 0;
  }
  if (intent === 'I_CAN_HELP') {
    if (post.category === 'study_partner' && post.studentRole === 'learner') return 2;
    return 0;
  }
  return 0;
};

const extractQueryArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => item.split(',')).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const recordEvent = async ({ action, actorId, postId, meta }) => {
  try {
    await Event.create({ action, actorId, postId, meta });
  } catch (error) {
    console.error('Event log error:', error);
  }
};

export const getPosts = async (req, res) => {
  try {
    const {
      category,
      faculty,
      level,
      tags,
      languagePref,
      searchText,
      search,
      intent,
      selectedSubjects,
      broader,
      page = 1,
      limit = 20
    } = req.query;

    await expirePosts();
    const now = new Date();

    const query = {
      status: 'active',
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }]
    };

    if (category) query.category = category;
    if (faculty) query.faculty = faculty;
    if (level) query.level = level;
    if (languagePref) query.languagePref = languagePref;
    if (tags) {
      const tagArray = tags.split(',');
      query.tags = { $in: tagArray };
    }
    const resolvedSearch = searchText ?? search;
    if (resolvedSearch) {
      query.$text = { $search: resolvedSearch };
    }

    const userId = req.user?._id?.toString() ?? 'anonymous';
    const selectedSubjectList = extractQueryArray(selectedSubjects);
    const broaderResults = broader === 'true' || broader === true;
    const cacheKey = `posts:${userId}:${JSON.stringify({
      query,
      intent,
      selectedSubjects: selectedSubjectList,
      broaderResults,
      page,
      limit
    })}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .populate('authorId', 'username');

    const userProfile = req.user?._id ? await Profile.findOne({ userId: req.user._id }) : null;
    const fallbackSubjects = selectedSubjectList.length
      ? selectedSubjectList
      : userProfile?.subjectCodes ?? [];

    const postsWithProfiles = await Promise.all(
      posts.map(async (post) => {
        const profile = await Profile.findOne({ userId: post.authorId._id });
        const isAuthor = userId !== 'anonymous' && post.authorId._id.toString() === userId;
        let pendingJoinRequestsCount = 0;
        let unreadPostMessagesCount = 0;

        if (isAuthor) {
          pendingJoinRequestsCount = await JoinRequest.countDocuments({
            postId: post._id,
            status: 'pending'
          });

          const conversations = await Conversation.find({ type: 'post', postId: post._id }).select('_id');
          const conversationIds = conversations.map((conversation) => conversation._id);
          if (conversationIds.length) {
            unreadPostMessagesCount = await Message.countDocuments({
              conversationId: { $in: conversationIds },
              senderId: { $ne: userId },
              readAt: null
            });
          }
        }

        const postSubjects = post.subjectCodes?.length
          ? post.subjectCodes
          : profile?.subjectCodes ?? [];
        const sharedSubjectsCount = countSharedSubjects(fallbackSubjects, postSubjects);
        const hasSharedSubject = sharedSubjectsCount > 0;
        const sameFaculty =
          Boolean(userProfile?.faculty && (post.faculty || profile?.faculty)) &&
          normalizeValue(userProfile?.faculty) === normalizeValue(post.faculty || profile?.faculty);
        const hasFacultyContext = Boolean(userProfile?.faculty);
        const shouldHideForScope = !broaderResults && hasFacultyContext && !sameFaculty && !hasSharedSubject;
        const shouldHideForSubjects =
          !broaderResults && selectedSubjectList.length > 0 && !hasSharedSubject;
        if (shouldHideForScope || shouldHideForSubjects) {
          return null;
        }

        const matchScore = calculateMatchScore({
          userProfile,
          authorProfile: profile,
          post,
          userSubjects: fallbackSubjects,
          postSubjects
        });
        const intentBoost = resolveIntentBoost(intent, post);

        return {
          ...post.toObject(),
          matchScore,
          intentBoost,
          pendingJoinRequestsCount,
          unreadPostMessagesCount,
          author: {
            username: post.authorId.username,
            profile
          }
        };
      })
    );

    const visiblePosts = postsWithProfiles.filter(Boolean);
    visiblePosts.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      if (b.intentBoost !== a.intentBoost) return b.intentBoost - a.intentBoost;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pagedPosts = visiblePosts.slice(skip, skip + parseInt(limit)).map((post) => {
      const { intentBoost, ...rest } = post;
      return rest;
    });

    const result = {
      posts: pagedPosts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: visiblePosts.length,
        pages: Math.ceil(visiblePosts.length / parseInt(limit))
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
    const now = new Date();

    const post = await Post.findById(id).populate('authorId', 'username');
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const isAuthor = post.authorId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (post.expiresAt && post.expiresAt <= now && post.status === 'active') {
      post.status = 'expired';
      await post.save();
    }

    if (!isAuthor && !isAdmin && post.status !== 'active') {
      return res.status(404).json({ error: 'Post not found' });
    }

    const profile = await Profile.findOne({ userId: post.authorId._id });
    let pendingJoinRequestsCount = 0;
    let unreadPostMessagesCount = 0;
    let myJoinRequestStatus = 'none';

    if (req.user?._id) {
      const myJoinRequest = await JoinRequest.findOne({
        postId: post._id,
        requesterId: req.user._id
      }).select('status');
      if (myJoinRequest?.status) {
        myJoinRequestStatus = myJoinRequest.status;
      }
    }

    if (isAuthor) {
      pendingJoinRequestsCount = await JoinRequest.countDocuments({
        postId: post._id,
        status: 'pending'
      });

      const conversations = await Conversation.find({ type: 'post', postId: post._id }).select('_id');
      const conversationIds = conversations.map((conversation) => conversation._id);
      if (conversationIds.length) {
        unreadPostMessagesCount = await Message.countDocuments({
          conversationId: { $in: conversationIds },
          senderId: { $ne: req.user._id },
          readAt: null
        });
      }
    }

    res.json({
      post: {
        ...post.toObject(),
        pendingJoinRequestsCount,
        unreadPostMessagesCount,
        myJoinRequestStatus
      },
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
    const { category } = req.body;

    if (category === 'study_partner') {
      const { subjectCodes, studentRole, durationHours, description } = req.body;
      const profile = await Profile.findOne({ userId: req.user._id });

      if (!profile?.subjectCodes?.length) {
        return res.status(400).json({ error: 'Profile subject codes are required for study partner posts.' });
      }

      const normalizedCodes = subjectCodes.map((code) => code.trim()).filter(Boolean);
      if (normalizedCodes.length < 1 || normalizedCodes.length > 2) {
        return res.status(400).json({ error: 'Select between 1 and 2 subjects for study partner posts.' });
      }

      const allowedCodes = new Set(profile.subjectCodes.map((code) => code.trim()));
      const invalidCodes = normalizedCodes.filter((code) => !allowedCodes.has(code));
      if (invalidCodes.length) {
        return res.status(400).json({ error: 'Selected subjects must exist in your profile.' });
      }

      let sanitizedDescription = description?.trim() ?? '';
      if (sanitizedDescription) {
        if (containsProfanity(sanitizedDescription)) {
          sanitizedDescription = maskProfanity(sanitizedDescription);
        }
        sanitizedDescription = maskContactInfo(sanitizedDescription);
      }

      const title = buildStudyPartnerTitle(normalizedCodes);
      const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

      const post = await Post.create({
        authorId: req.user._id,
        title,
        description: sanitizedDescription,
        category,
        subjectCodes: normalizedCodes,
        studentRole,
        expiresAt,
        faculty: profile.faculty,
        level: profile.level,
        languagePref: profile.languages?.[0]
      });

      await recordEvent({
        action: 'post_created',
        actorId: req.user._id,
        postId: post._id,
        meta: { category }
      });

      await redis.del('posts:*');

      return res.status(201).json({ message: 'Post created successfully', post });
    }

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

    await recordEvent({
      action: 'post_created',
      actorId: req.user._id,
      postId: post._id,
      meta: { category: post.category }
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
    const updates = { ...req.body };

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }

    if (post.status === 'closed') {
      return res.status(400).json({ error: 'Closed posts cannot be edited.' });
    }

    if (post.category === 'study_partner') {
      const allowedFields = ['description', 'subjectCodes', 'studentRole', 'status', 'extendHours'];
      const invalidFields = Object.keys(updates).filter((key) => !allowedFields.includes(key));
      if (invalidFields.length) {
        return res.status(400).json({ error: 'Study partner posts accept only subjects, role, status, and duration updates.' });
      }

      if (post.status === 'matched' && updates.status !== 'matched') {
        return res.status(400).json({ error: 'Matched study partner posts are read-only.' });
      }

      if (updates.subjectCodes) {
        const profile = await Profile.findOne({ userId: req.user._id });
        if (!profile?.subjectCodes?.length) {
          return res.status(400).json({ error: 'Profile subject codes are required for study partner posts.' });
        }
        const normalizedCodes = updates.subjectCodes.map((code) => code.trim()).filter(Boolean);
        if (normalizedCodes.length < 1 || normalizedCodes.length > 2) {
          return res.status(400).json({ error: 'Select between 1 and 2 subjects for study partner posts.' });
        }
        const allowedCodes = new Set(profile.subjectCodes.map((code) => code.trim()));
        const invalidCodes = normalizedCodes.filter((code) => !allowedCodes.has(code));
        if (invalidCodes.length) {
          return res.status(400).json({ error: 'Selected subjects must exist in your profile.' });
        }
        updates.subjectCodes = normalizedCodes;
        updates.title = buildStudyPartnerTitle(normalizedCodes);
      }

      if (updates.description !== undefined) {
        if (updates.description && containsProfanity(updates.description)) {
          updates.description = maskProfanity(updates.description);
        }
        updates.description = updates.description ? maskContactInfo(updates.description) : '';
      }

      if (updates.extendHours !== undefined) {
        const extendHoursValue = Number(updates.extendHours);
        if (!Number.isFinite(extendHoursValue) || extendHoursValue <= 0) {
          return res.status(400).json({ error: 'Extend hours must be a positive number.' });
        }
        const now = new Date();
        const base = post.expiresAt && post.expiresAt > now ? post.expiresAt : now;
        post.expiresAt = new Date(base.getTime() + extendHoursValue * 60 * 60 * 1000);
        post.status = 'active';
        delete updates.extendHours;
      }

      if (updates.status) {
        if (updates.status !== 'matched') {
          return res.status(400).json({ error: 'Study partner posts can only be marked as matched.' });
        }
      }
    } else {
      if (updates.title && containsProfanity(updates.title)) {
        updates.title = maskProfanity(updates.title);
      }
      if (updates.description) {
        if (containsProfanity(updates.description)) {
          updates.description = maskProfanity(updates.description);
        }
        updates.description = maskContactInfo(updates.description);
      }
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

    const conversations = await Conversation.find({ type: 'post', postId: id }).select('_id');
    const conversationIds = conversations.map((conversation) => conversation._id);
    if (conversationIds.length) {
      await Message.deleteMany({ conversationId: { $in: conversationIds } });
      await Conversation.deleteMany({ _id: { $in: conversationIds } });
    }

    await Post.findByIdAndDelete(id);

    await recordEvent({
      action: 'post_deleted',
      actorId: req.user._id,
      postId: id,
      meta: { category: post.category }
    });

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

export const createJoinRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.category !== 'study_partner') {
      return res.status(400).json({ error: 'Join requests are only available for study partner posts.' });
    }

    if (post.authorId.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot request to join your own post.' });
    }

    const now = new Date();
    if (post.expiresAt && post.expiresAt <= now && post.status === 'active') {
      post.status = 'expired';
      await post.save();
    }

    if (post.status !== 'active') {
      return res.status(400).json({ error: 'Post is not accepting join requests.' });
    }

    const acceptedCount = post.acceptedUserIds?.length ?? 0;
    const maxAccepted = maxAcceptedForRole(post.studentRole);
    if (acceptedCount >= maxAccepted) {
      return res.status(400).json({ error: 'Capacity reached for this post.' });
    }

    const joinRequest = await JoinRequest.create({
      postId: post._id,
      requesterId: req.user._id,
      status: 'pending'
    });

    await recordEvent({
      action: 'join_requested',
      actorId: req.user._id,
      postId: post._id,
      meta: { studentRole: post.studentRole }
    });

    await redis.del('posts:*');

    res.status(201).json({ joinRequest });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ error: 'Join request already exists.' });
    }
    console.error('Create join request error:', error);
    res.status(500).json({ error: 'Failed to create join request' });
  }
};

export const getJoinRequests = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const isAuthor = post.authorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to view join requests' });
    }

    const joinRequests = await JoinRequest.find({ postId: id })
      .sort({ createdAt: -1 })
      .populate('requesterId', 'username');

    res.json({ joinRequests });
  } catch (error) {
    console.error('Get join requests error:', error);
    res.status(500).json({ error: 'Failed to fetch join requests' });
  }
};

export const acceptJoinRequest = async (req, res) => {
  try {
    const { id, requestId } = req.params;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to accept join requests' });
    }

    const joinRequest = await JoinRequest.findOne({ _id: requestId, postId: id });
    if (!joinRequest) {
      return res.status(404).json({ error: 'Join request not found' });
    }

    if (joinRequest.status === 'accepted') {
      return res.status(400).json({ error: 'Join request already accepted.' });
    }

    if (joinRequest.status === 'rejected') {
      return res.status(400).json({ error: 'Join request already rejected.' });
    }

    const acceptedCount = post.acceptedUserIds?.length ?? 0;
    const maxAccepted = maxAcceptedForRole(post.studentRole);
    if (acceptedCount >= maxAccepted) {
      return res.status(400).json({ error: 'Capacity reached for this post.' });
    }

    joinRequest.status = 'accepted';
    await joinRequest.save();
    await joinRequest.populate('requesterId', 'username');

    post.acceptedUserIds = post.acceptedUserIds ?? [];
    post.acceptedUserIds.addToSet(joinRequest.requesterId);
    if (post.category === 'study_partner' && post.acceptedUserIds.length >= 1) {
      post.status = 'matched';
    }
    await post.save();

    await recordEvent({
      action: 'join_accepted',
      actorId: req.user._id,
      postId: post._id,
      meta: { requesterId: joinRequest.requesterId }
    });

    await redis.del('posts:*');

    res.json({ joinRequest, post });
  } catch (error) {
    console.error('Accept join request error:', error);
    res.status(500).json({ error: 'Failed to accept join request' });
  }
};

export const rejectJoinRequest = async (req, res) => {
  try {
    const { id, requestId } = req.params;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to reject join requests' });
    }

    const joinRequest = await JoinRequest.findOne({ _id: requestId, postId: id });
    if (!joinRequest) {
      return res.status(404).json({ error: 'Join request not found' });
    }

    joinRequest.status = 'rejected';
    await joinRequest.save();
    await joinRequest.populate('requesterId', 'username');

    await recordEvent({
      action: 'join_rejected',
      actorId: req.user._id,
      postId: post._id,
      meta: { requesterId: joinRequest.requesterId }
    });

    await redis.del('posts:*');

    res.json({ joinRequest });
  } catch (error) {
    console.error('Reject join request error:', error);
    res.status(500).json({ error: 'Failed to reject join request' });
  }
};

export const closePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { closeReason } = req.body;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to close this post' });
    }

    if (post.status === 'closed') {
      return res.status(400).json({ error: 'Post already closed.' });
    }

    post.status = 'closed';
    post.closedAt = new Date();
    post.closeReason = closeReason?.trim() || '';
    await post.save();

    await recordEvent({
      action: 'post_closed',
      actorId: req.user._id,
      postId: post._id,
      meta: { closeReason: post.closeReason }
    });

    await redis.del('posts:*');

    res.json({ message: 'Post closed successfully', post });
  } catch (error) {
    console.error('Close post error:', error);
    res.status(500).json({ error: 'Failed to close post' });
  }
};
