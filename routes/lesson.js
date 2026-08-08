const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const lessonController = require('../controllers/lessonController');

// GET /lessons/:lessonId - View lesson page
router.get('/:lessonId', requireAuth, lessonController.getLessonPage);

// POST /lessons/:lessonId/progress - Mark lesson as complete
router.post('/:lessonId/progress', requireAuth, lessonController.updateProgress);

module.exports = router;
