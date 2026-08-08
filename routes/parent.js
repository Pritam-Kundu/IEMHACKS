const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireApiAuth } = require('../middleware/authMiddleware');
const parentController = require('../controllers/parentController');

// Parent Dashboard Route (Protected & Role-based Authorization)
router.get('/dashboard', requireAuth, requireRole('parent'), parentController.getDashboard);

// API Route for linking children (uses Bearer token verification)
router.post('/api/children/link', requireApiAuth, parentController.linkStudentAccount);

module.exports = router;
