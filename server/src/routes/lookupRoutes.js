import express from 'express';
import { getFaculties, getMajors, getSubjects } from '../controllers/adminController.js';

const router = express.Router();

router.get('/faculties', getFaculties);
router.get('/majors', getMajors);
router.get('/subjects', getSubjects);

export default router;
