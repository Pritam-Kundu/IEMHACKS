const express = require('express');
const router = express.Router();

// Route modules (to be created)
// const authRoutes = require('./auth');
// const studentRoutes = require('./student');
// const teacherRoutes = require('./teacher');
// const parentRoutes = require('./parent');

// Mount routes
// router.use('/auth', authRoutes);
// router.use('/student', studentRoutes);
// router.use('/teacher', teacherRoutes);
// router.use('/parent', parentRoutes);

// Landing page route
router.get('/', (req, res) => {
    // We will render 'index' from views
    // res.render('pages/index');
    res.send('EdTech Platform API & App is running. Use MVC views for frontend.');
});

module.exports = router;
