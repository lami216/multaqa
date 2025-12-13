import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/reports', adminController.getReports);
router.patch('/reports/:id/resolve', adminController.resolveReport);
router.delete('/posts/:id', adminController.deletePostAdmin);
router.patch('/users/:id/ban', adminController.banUser);
router.get('/faculties', adminController.getFaculties);
router.post('/faculties', adminController.createFaculty);
router.delete('/faculties/:id', adminController.deleteFaculty);

export default router;
