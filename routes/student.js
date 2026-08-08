const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const studentController = require('../controllers/studentController');

// Student Dashboard Route (Protected & Role-based Authorization)
router.get('/dashboard', requireAuth, requireRole('student'), studentController.getDashboard);

module.exports = router;
