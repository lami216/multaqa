import express from 'express';
import * as postController from '../controllers/postController.js';
import { authenticate } from '../middleware/auth.js';
import { validate, postSchema, reportSchema } from '../middleware/validation.js';
import { postCreationRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

router.use(authenticate);

router.get('/', postController.getPosts);
router.get('/:id', postController.getPost);
router.post('/', postCreationRateLimit, validate(postSchema), postController.createPost);
router.patch('/:id', validate(postSchema), postController.updatePost);
router.delete('/:id', postController.deletePost);
router.post('/:id/report', validate(reportSchema), postController.reportPost);

export default router;
