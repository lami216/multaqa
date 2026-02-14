import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/reports', adminController.getReports);
router.get('/stats', adminController.getDashboardStats);
router.patch('/reports/:id/resolve', adminController.resolveReport);
router.delete('/posts/:id', adminController.deletePostAdmin);
router.patch('/users/:id/ban', adminController.banUser);
router.get('/faculties', adminController.getFaculties);
router.post('/faculties', adminController.createFaculty);
router.delete('/faculties/:id', adminController.deleteFaculty);
router.get('/majors', adminController.getMajors);
router.post('/majors', adminController.createMajor);
router.patch('/majors/:id', adminController.updateMajor);
router.delete('/majors/:id', adminController.deleteMajor);
router.get('/subjects', adminController.getSubjects);
router.post('/subjects', adminController.createSubject);
router.patch('/subjects/:id', adminController.updateSubject);
router.delete('/subjects/:id', adminController.deleteSubject);
router.get('/settings/academic', adminController.getAcademicSettings);
router.patch('/settings/academic', adminController.updateAcademicSettings);

export default router;
