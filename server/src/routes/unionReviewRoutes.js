import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { createUnionReview, getAdminUnionReviews, getStudentUnionReviews, markGoing, markView } from '../controllers/unionReviewController.js';

const router = express.Router();

router.get('/union-reviews', authenticate, getStudentUnionReviews);
router.post('/union-reviews/:id/going', authenticate, markGoing);
router.post('/union-reviews/:id/view', authenticate, markView);
router.get('/admin/union-reviews', authenticate, requireAdmin, getAdminUnionReviews);
router.post('/admin/union-reviews', authenticate, requireAdmin, createUnionReview);

export default router;
