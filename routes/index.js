const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const studentRoutes = require('./student');
const teacherRoutes = require('./teacher');
const parentRoutes = require('./parent');
const quizRoutes = require('./quizRoutes');
const lessonRoutes = require('./lesson');
const { injectAuthUser } = require('../middleware/authMiddleware');

// Mount routes
router.use('/', authRoutes);
router.use('/student', studentRoutes);
router.use('/teacher', teacherRoutes);
router.use('/parent', parentRoutes);
router.use('/quiz', quizRoutes);
router.use('/lessons', lessonRoutes);

// Landing page route
router.get('/', injectAuthUser, (req, res) => {
    res.render('home');
});

module.exports = router;
