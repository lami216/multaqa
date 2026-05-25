import Faculty from '../models/Faculty.js';
import Major from '../models/Major.js';
import Profile from '../models/Profile.js';
import Subject from '../models/Subject.js';
import UnionReview from '../models/UnionReview.js';
import UnionReviewAttendance from '../models/UnionReviewAttendance.js';
import UnionReviewView from '../models/UnionReviewView.js';
import User from '../models/User.js';
import { createNotificationsForUsers } from '../services/notificationService.js';

const isExpired = (startsAt) => Date.now() >= (new Date(startsAt).getTime() + 60 * 60 * 1000);

const basePopulate = [
  { path: 'facultyId', select: 'nameAr nameFr' },
  { path: 'majorId', select: 'nameAr nameFr' },
  { path: 'subjectId', select: 'nameAr nameFr code' }
];

export const createUnionReview = async (req, res) => {
  try {
    const payload = req.body;
    const [faculty, major, subject] = await Promise.all([
      Faculty.findOne({ _id: payload.facultyId, active: true }),
      Major.findOne({ _id: payload.majorId, active: true }),
      Subject.findOne({ _id: payload.subjectId, active: true })
    ]);
    if (!faculty || !major || !subject) return res.status(400).json({ error: 'Invalid academic catalog selection' });

    const review = await UnionReview.create({ ...payload, subjectCode: subject.code, createdBy: req.user._id });

    const targetProfiles = await Profile.find({
      $or: [
        { subjectCodes: review.subjectCode },
        { 'remainingSubjects.subjectCode': review.subjectCode },
        { facultyId: String(review.facultyId), majorId: String(review.majorId), level: review.level }
      ]
    }).select('userId');

    const userIds = targetProfiles.map((p) => p.userId);
    const subjectLabel = subject.nameFr;
    await createNotificationsForUsers({
      userIds,
      actorId: req.user._id,
      type: 'union_review_published',
      payload: { link: '/posts', message: subjectLabel, reviewId: review._id.toString(), location: review.location, startsAt: review.startsAt, organizer: review.organizer }
    });

    const hydrated = await UnionReview.findById(review._id).populate(basePopulate);
    return res.status(201).json({ review: hydrated });
  } catch (error) {
    console.error('Create union review error:', error);
    return res.status(500).json({ error: 'Failed to create union review' });
  }
};

export const getAdminUnionReviews = async (req, res) => {
  const reviews = await UnionReview.find().sort({ startsAt: -1 }).populate(basePopulate);
  return res.json({ reviews: reviews.map((r) => ({ ...r.toObject(), computedStatus: isExpired(r.startsAt) ? 'expired' : r.status })) });
};

export const getStudentUnionReviews = async (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  const baseQuery = isAdmin ? { status: 'published' } : { status: 'published', startsAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } };
  const reviews = await UnionReview.find(baseQuery).sort({ startsAt: 1 }).populate(basePopulate);
  if (isAdmin) return res.json({ reviews });
  const profile = await Profile.findOne({ userId: req.user._id }).lean();
  const user = await User.findById(req.user._id).select('remainingSubjects').lean();
  const relevant = reviews.filter((r) => profile && (
    (profile.subjectCodes ?? []).includes(r.subjectCode)
    || (user?.remainingSubjects ?? []).includes(r.subjectCode)
    || (String(profile.facultyId) === String(r.facultyId._id) && String(profile.majorId) === String(r.majorId._id) && profile.level === r.level)
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
  const review = await UnionReview.findById(eventId).populate(basePopulate);
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
