import express from 'express';
import { getAcademicSettings, getFaculties, getMajors, getSubjects } from '../controllers/adminController.js';

const router = express.Router();

router.get('/faculties', getFaculties);
router.get('/majors', getMajors);
router.get('/subjects', getSubjects);
router.get('/academic-settings', getAcademicSettings);

export default router;
