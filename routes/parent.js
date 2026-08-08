const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const parentController = require('../controllers/parentController');

// Dashboard Route
router.get('/dashboard', requireAuth, requireRole('parent'), parentController.getDashboard);

// POST /api/children/link - Add a child to parent's profile
router.post('/api/children/link', requireAuth, requireRole('parent'), parentController.linkStudentAccount);

module.exports = router;
