const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const studentController = require('../controllers/studentController');

// Student Dashboard Route (Protected & Role-based Authorization)
router.get('/dashboard', requireAuth, requireRole('student'), studentController.getDashboard);

router.get('/courses', requireAuth, requireRole('student'), studentController.getCourses);
router.get('/explore', requireAuth, requireRole('student'), studentController.getExploreCourses);
router.get('/quizzes', requireAuth, requireRole('student'), studentController.getQuizzes);
router.get('/ai-tutor', requireAuth, requireRole('student'), studentController.getAITutor);
router.get('/progress', requireAuth, requireRole('student'), studentController.getProgress);
router.get('/leaderboard', requireAuth, requireRole('student'), studentController.getLeaderboard);
router.get('/badges', requireAuth, requireRole('student'), studentController.getBadges);
router.get('/settings', requireAuth, requireRole('student'), studentController.getSettings);

module.exports = router;
