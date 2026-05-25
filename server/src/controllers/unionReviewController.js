import Profile from '../models/Profile.js';
import UnionReview from '../models/UnionReview.js';
import UnionReviewAttendance from '../models/UnionReviewAttendance.js';
import UnionReviewView from '../models/UnionReviewView.js';
import User from '../models/User.js';
import { createNotificationsForUsers } from '../services/notificationService.js';

const isExpired = (startsAt) => Date.now() >= (new Date(startsAt).getTime() + 60 * 60 * 1000);

export const createUnionReview = async (req, res) => {
  try {
    const { organizer, facultyId, level, majorId, subjectCode, subjectNameAr, subjectNameFr, location, startsAt } = req.body;
    if (!['UNEM', 'UGEM'].includes(organizer)) return res.status(400).json({ error: 'Organizer must be UNEM or UGEM' });
    if (!facultyId || !level || !majorId || !subjectCode || !location || !startsAt) {
      return res.status(400).json({ error: 'organizer, facultyId, level, majorId, subjectCode, location and startsAt are required' });
    }

    const startsAtDate = new Date(startsAt);
    if (Number.isNaN(startsAtDate.getTime())) return res.status(400).json({ error: 'startsAt must be a valid date' });

    const review = await UnionReview.create({
      organizer,
      facultyId: String(facultyId).trim(),
      level,
      majorId: String(majorId).trim(),
      subjectCode: String(subjectCode).trim(),
      subjectNameAr: typeof subjectNameAr === 'string' ? subjectNameAr.trim() : undefined,
      subjectNameFr: typeof subjectNameFr === 'string' ? subjectNameFr.trim() : undefined,
      location: String(location).trim(),
      startsAt: startsAtDate,
      createdBy: req.user._id
    });

    const targetProfiles = await Profile.find({
      $or: [
        { subjectCodes: review.subjectCode },
        { 'remainingSubjects.subjectCode': review.subjectCode },
        {
          facultyId: review.facultyId,
          majorId: review.majorId,
          level: review.level
        }
      ]
    }).select('userId');

    const userIds = targetProfiles.map((p) => p.userId);
    const subjectLabel = review.subjectNameFr || review.subjectCode;
    await createNotificationsForUsers({
      userIds,
      actorId: req.user._id,
      type: 'union_review_published',
      payload: { link: '/posts', message: subjectLabel, reviewId: review._id.toString(), location: review.location, startsAt: review.startsAt, organizer: review.organizer }
    });

    return res.status(201).json({ review });
  } catch (error) {
    console.error('[UnionReview] create error', error);
    const details = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: `Failed to create union review: ${details}` });
  }
};

export const getAdminUnionReviews = async (req, res) => {
  const reviews = await UnionReview.find().sort({ startsAt: -1 });
  return res.json({ reviews: reviews.map((r) => ({ ...r.toObject(), computedStatus: isExpired(r.startsAt) ? 'expired' : r.status })) });
};

export const getStudentUnionReviews = async (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  const baseQuery = isAdmin ? { status: 'published' } : { status: 'published', startsAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } };
  const reviews = await UnionReview.find(baseQuery).sort({ startsAt: 1 });
  if (isAdmin) return res.json({ reviews });
  const profile = await Profile.findOne({ userId: req.user._id }).lean();
  const user = await User.findById(req.user._id).select('remainingSubjects').lean();
  const relevant = reviews.filter((r) => profile && (
    (profile.subjectCodes ?? []).includes(r.subjectCode)
    || (user?.remainingSubjects ?? []).includes(r.subjectCode)
    || (String(profile.facultyId) === String(r.facultyId) && String(profile.majorId) === String(r.majorId) && profile.level === r.level)
  ));
  const attendances = await UnionReviewAttendance.find({ userId: req.user._id, eventId: { $in: relevant.map((r) => r._id) } }).select('eventId');
  const attendingSet = new Set(attendances.map((a) => String(a.eventId)));
  return res.json({ reviews: relevant.map((r) => ({ ...r.toObject(), isGoing: attendingSet.has(String(r._id)) })) });
};

export const markGoing = async (req, res) => {
  const eventId = req.params.id;
  try {
    await UnionReviewAttendance.create({ eventId, userId: req.user._id });
    await UnionReview.updateOne({ _id: eventId }, { $inc: { goingCount: 1 } });
  } catch {}
  const review = await UnionReview.findById(eventId);
  return res.json({ review, isGoing: true });
};

export const markView = async (req, res) => {
  const eventId = req.params.id;
  try {
    await UnionReviewView.create({ eventId, userId: req.user._id });
    await UnionReview.updateOne({ _id: eventId }, { $inc: { viewsCount: 1 } });
  } catch {}
  return res.json({ ok: true });
};
