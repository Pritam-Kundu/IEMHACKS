const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const parentController = require('../controllers/parentController');

// Parent Dashboard Route (Protected & Role-based Authorization)
router.get('/dashboard', requireAuth, requireRole('parent'), parentController.getDashboard);

module.exports = router;
