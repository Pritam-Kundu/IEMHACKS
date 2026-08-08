const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { requireAuth } = require('../middleware/authMiddleware');

// All AI routes require authentication
router.use(requireAuth);

router.post('/chat', aiController.chat);
router.get('/history', aiController.getHistory);
router.get('/history/:id/messages', aiController.getConversationMessages);

// Endpoint to route users to the correct AI tutor based on role
router.get('/redirect', (req, res) => {
    const query = req.query.initialQuery ? `?initialQuery=${encodeURIComponent(req.query.initialQuery)}` : '';
    res.redirect(`/${req.user.role}/ai-tutor${query}`);
});

module.exports = router;
