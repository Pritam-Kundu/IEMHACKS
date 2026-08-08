const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const teacherController = require('../controllers/teacherController');

// Teacher Dashboard Route (Protected & Role-based Authorization)
router.get('/dashboard', requireAuth, requireRole('teacher'), teacherController.getDashboard);

module.exports = router;
