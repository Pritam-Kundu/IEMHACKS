const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { requireAuth } = require('../middleware/authMiddleware');

// Public endpoints
router.post('/public-chat', aiController.publicChat);

// All other AI routes require authentication
router.use(requireAuth);

router.post('/chat', aiController.chat);
router.get('/history', aiController.getHistory);
router.get('/history/:id/messages', aiController.getConversationMessages);

module.exports = router;
