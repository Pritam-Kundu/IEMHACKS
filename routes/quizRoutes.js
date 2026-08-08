const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Render the self-contained quiz page
router.get('/:id', requireAuth, requireRole('student'), quizController.renderQuizPage);

// API endpoint to fetch quiz data (secure payload)
router.get('/api/:id/data', requireAuth, requireRole('student'), quizController.getQuizData);

// API endpoint to submit answers and get score
router.post('/api/:id/submit', requireAuth, requireRole('student'), quizController.submitQuiz);

module.exports = router;
