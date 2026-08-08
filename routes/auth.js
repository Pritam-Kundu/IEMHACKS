const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// GET /login - Render login page
router.get('/login', authController.renderLogin);

// GET /signup - Render signup page
router.get('/signup', authController.renderSignup);

// POST /api/auth/login - Local login (email/password)
router.post('/api/auth/login', authController.localLogin);

// POST /api/auth/signup - Local signup
router.post('/api/auth/signup', authController.localSignup);

// POST /api/auth/googleLogin - Firebase ID Token login
router.post('/api/auth/googleLogin', authController.googleLogin);

// POST or GET /logout - Clear session
router.all('/logout', authController.logout);

module.exports = router;
