const express = require('express');
const router = express.Router();
const mlController = require('../controllers/mlController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.post('/sync-risk-events', requireAuth, requireRole(['student']), mlController.syncRiskEvents);
router.post('/sync-events', requireAuth, requireRole(['student']), mlController.syncEvents);

module.exports = router;
