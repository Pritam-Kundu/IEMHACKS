const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const studentController = require('../controllers/studentController');

// Student Dashboard Route (Protected & Role-based Authorization)
router.get('/dashboard', requireAuth, requireRole('student'), studentController.getDashboard);

// Explore & Courses
router.get('/courses', requireAuth, requireRole('student'), studentController.getCourses);
router.get('/explore', requireAuth, requireRole('student'), studentController.getExploreCourses);

// Course Details & Enrollment
router.get('/courses/:courseId', requireAuth, requireRole('student'), studentController.getCourseDetails);
router.post('/courses/:courseId/enroll', requireAuth, requireRole('student'), studentController.enrollInCourse);
router.get('/courses/:courseId/learn', requireAuth, requireRole('student'), studentController.continueLearning);

// Lessons
router.get('/lessons/:lessonId', requireAuth, requireRole('student'), studentController.getLesson);
router.post('/lessons/:lessonId/complete', requireAuth, requireRole('student'), studentController.completeLesson);

// Quizzes
router.get('/quizzes', requireAuth, requireRole('student'), studentController.getQuizzes);
router.get('/quizzes/:quizId', requireAuth, requireRole('student'), studentController.getQuizDetails);
router.get('/quizzes/:quizId/attempt', requireAuth, requireRole('student'), studentController.attemptQuiz);
router.post('/quizzes/:quizId/submit', requireAuth, requireRole('student'), studentController.submitQuiz);
router.get('/quizzes/:quizId/result', requireAuth, requireRole('student'), studentController.getQuizResult);

// Others
router.get('/ai-tutor', requireAuth, requireRole('student'), studentController.getAITutor);
router.get('/progress', requireAuth, requireRole('student'), studentController.getProgress);
router.get('/offline-videos', requireAuth, requireRole('student'), studentController.getOfflineVideos);
router.get('/leaderboard', requireAuth, requireRole('student'), studentController.getLeaderboard);
router.get('/badges', requireAuth, requireRole('student'), studentController.getBadges);
router.get('/settings', requireAuth, requireRole('student'), studentController.getSettings);

module.exports = router;
