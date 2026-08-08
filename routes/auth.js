const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// GET /login - Render login page
router.get('/login', authController.renderLogin);

// GET /signup - Render signup page
router.get('/signup', authController.renderSignup);

// POST /api/auth/sessionLogin - Verify Firebase token and set cookie
router.post('/api/auth/sessionLogin', authController.sessionLogin);

// POST /api/auth/sessionSignup - Verify Firebase token and create new user
router.post('/api/auth/sessionSignup', authController.sessionSignup);

// POST or GET /logout - Clear session
router.all('/logout', authController.logout);

module.exports = router;
