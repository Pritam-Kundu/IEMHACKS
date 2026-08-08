const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const teacherController = require('../controllers/teacherController');

// Teacher Dashboard Route (Protected & Role-based Authorization)
router.get('/dashboard', requireAuth, requireRole('teacher'), teacherController.getDashboard);

// Teacher Course Creation Routes
router.get('/courses/create', requireAuth, requireRole('teacher'), teacherController.getCreateCourse);
router.post('/courses', requireAuth, requireRole('teacher'), teacherController.createCourse);

// AI Tutor Route
router.get('/ai-tutor', requireAuth, requireRole('teacher'), teacherController.getAiTutor);

// Additional Teacher Pages
router.get('/courses', requireAuth, requireRole('teacher'), teacherController.getCourses);
router.get('/courses/:id', requireAuth, requireRole('teacher'), teacherController.getUnderConstruction);

router.get('/students', requireAuth, requireRole('teacher'), teacherController.getStudents);

router.get('/lessons', requireAuth, requireRole('teacher'), teacherController.getLessons);
router.get('/lessons/create', requireAuth, requireRole('teacher'), teacherController.getUnderConstruction);
router.get('/lessons/:id', requireAuth, requireRole('teacher'), teacherController.getUnderConstruction);

router.get('/quizzes', requireAuth, requireRole('teacher'), teacherController.getQuizzes);
router.get('/quizzes/create', requireAuth, requireRole('teacher'), teacherController.getUnderConstruction);
router.get('/quizzes/:id', requireAuth, requireRole('teacher'), teacherController.getUnderConstruction);

router.get('/assignments', requireAuth, requireRole('teacher'), teacherController.getAssignments);
router.get('/assignments/create', requireAuth, requireRole('teacher'), teacherController.getUnderConstruction);
router.get('/assignments/:id', requireAuth, requireRole('teacher'), teacherController.getUnderConstruction);

router.get('/analytics', requireAuth, requireRole('teacher'), teacherController.getAnalytics);
router.get('/reports', requireAuth, requireRole('teacher'), teacherController.getReports);
router.get('/settings', requireAuth, requireRole('teacher'), teacherController.getSettings);

module.exports = router;
