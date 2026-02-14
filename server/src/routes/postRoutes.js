import express from 'express';
import * as postController from '../controllers/postController.js';
import { authenticate } from '../middleware/auth.js';
import { validate, createPostSchema, updatePostSchema, reportSchema, closePostSchema } from '../middleware/validation.js';
import { postCreationRateLimit } from '../middleware/rateLimit.js';
import { requireActiveMajor } from '../middleware/majorAccess.js';

const router = express.Router();

router.use(authenticate);

router.get('/', postController.getPosts);
router.get('/:id', postController.getPost);
router.post('/', requireActiveMajor, postCreationRateLimit, validate(createPostSchema), postController.createPost);
router.patch('/:id', validate(updatePostSchema), postController.updatePost);
router.delete('/:id', postController.deletePost);
router.post('/:id/close', validate(closePostSchema), postController.closePost);
router.post('/:id/report', validate(reportSchema), postController.reportPost);
router.post('/:id/join', requireActiveMajor, postController.createJoinRequest);
router.get('/:id/join-requests', postController.getJoinRequests);
router.post('/:id/join-requests/:requestId/accept', postController.acceptJoinRequest);
router.post('/:id/join-requests/:requestId/reject', postController.rejectJoinRequest);

export default router;
