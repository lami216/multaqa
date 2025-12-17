import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getFaculties, getMajors, getSubjects } from '../controllers/adminController.js';

const router = express.Router();

router.use(authenticate);

router.get('/faculties', getFaculties);
router.get('/majors', getMajors);
router.get('/subjects', getSubjects);

export default router;
