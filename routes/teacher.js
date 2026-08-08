const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const teacherController = require('../controllers/teacherController');

// Teacher Dashboard Route (Protected & Role-based Authorization)
router.get('/dashboard', requireAuth, requireRole('teacher'), teacherController.getDashboard);

// Teacher Course Creation Routes
router.get('/courses/create', requireAuth, requireRole('teacher'), teacherController.getCreateCourse);
router.post('/courses', requireAuth, requireRole('teacher'), teacherController.createCourse);

module.exports = router;
