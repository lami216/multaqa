import express from 'express';
import {
  authenticate,
  requireAdmin,
  requireVerifiedIdentity
} from '../middleware/auth.js';
import {
  createUnionReview,
  getAdminUnionReviews,
  getStudentUnionReviews,
  markGoing,
  markView
} from '../controllers/unionReviewController.js';

const router = express.Router();

router.get('/union-reviews', authenticate, getStudentUnionReviews);
router.post(
  '/union-reviews/:id/going',
  authenticate,
  requireVerifiedIdentity,
  markGoing
);
router.post(
  '/union-reviews/:id/view',
  authenticate,
  requireVerifiedIdentity,
  markView
);
router.get(
  '/admin/union-reviews',
  authenticate,
  requireAdmin,
  getAdminUnionReviews
);
router.post(
  '/admin/union-reviews',
  authenticate,
  requireVerifiedIdentity,
  requireAdmin,
  createUnionReview
);

export default router;
