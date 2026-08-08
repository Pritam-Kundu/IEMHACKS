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
router.get('/courses/:id/edit', requireAuth, requireRole('teacher'), teacherController.getEditCourse);
router.put('/courses/:id', requireAuth, requireRole('teacher'), teacherController.updateCourse);
router.delete('/courses/:id', requireAuth, requireRole('teacher'), teacherController.deleteCourse);
router.get('/courses/:id', requireAuth, requireRole('teacher'), teacherController.getCourseDetails);

router.get('/students', requireAuth, requireRole('teacher'), teacherController.getStudents);
router.get('/students/:id', requireAuth, requireRole('teacher'), teacherController.getStudentDetails);

router.get('/lessons', requireAuth, requireRole('teacher'), teacherController.getLessons);
router.get('/lessons/create', requireAuth, requireRole('teacher'), teacherController.getCreateLesson);
router.post('/lessons', requireAuth, requireRole('teacher'), teacherController.createLesson);
router.get('/lessons/:id/edit', requireAuth, requireRole('teacher'), teacherController.getEditLesson);
router.put('/lessons/:id', requireAuth, requireRole('teacher'), teacherController.updateLesson);
router.delete('/lessons/:id', requireAuth, requireRole('teacher'), teacherController.deleteLesson);

router.get('/quizzes', requireAuth, requireRole('teacher'), teacherController.getQuizzes);
router.get('/quizzes/create', requireAuth, requireRole('teacher'), teacherController.getCreateQuiz);
router.post('/quizzes', requireAuth, requireRole('teacher'), teacherController.createQuiz);
router.get('/quizzes/:id/edit', requireAuth, requireRole('teacher'), teacherController.getEditQuiz);
router.put('/quizzes/:id', requireAuth, requireRole('teacher'), teacherController.updateQuiz);
router.delete('/quizzes/:id', requireAuth, requireRole('teacher'), teacherController.deleteQuiz);
router.get('/quizzes/:id/questions', requireAuth, requireRole('teacher'), teacherController.getQuizQuestions);
router.post('/quizzes/:id/questions', requireAuth, requireRole('teacher'), teacherController.createQuestion);
router.put('/quizzes/:id/questions/:questionId', requireAuth, requireRole('teacher'), teacherController.updateQuestion);
router.delete('/quizzes/:id/questions/:questionId', requireAuth, requireRole('teacher'), teacherController.deleteQuestion);

router.get('/assignments', requireAuth, requireRole('teacher'), teacherController.getAssignments);
router.get('/assignments/create', requireAuth, requireRole('teacher'), teacherController.getCreateAssignment);
router.post('/assignments', requireAuth, requireRole('teacher'), teacherController.createAssignment);
router.get('/assignments/:id/edit', requireAuth, requireRole('teacher'), teacherController.getEditAssignment);
router.put('/assignments/:id', requireAuth, requireRole('teacher'), teacherController.updateAssignment);
router.delete('/assignments/:id', requireAuth, requireRole('teacher'), teacherController.deleteAssignment);
router.get('/assignments/:id/submissions', requireAuth, requireRole('teacher'), teacherController.getAssignmentSubmissions);
router.put('/assignments/:id/submissions/:submissionId/grade', requireAuth, requireRole('teacher'), teacherController.gradeSubmission);

router.get('/analytics', requireAuth, requireRole('teacher'), teacherController.getAnalytics);
router.get('/reports', requireAuth, requireRole('teacher'), teacherController.getReports);
router.get('/settings', requireAuth, requireRole('teacher'), teacherController.getSettings);

module.exports = router;
