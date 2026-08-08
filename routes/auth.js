const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// GET /login - Render login page
router.get('/login', authController.renderLogin);

// GET /signup - Render signup page
router.get('/signup', authController.renderSignup);

// POST /api/auth/login - Local login (email/password)
router.post('/api/auth/login', authController.localLogin);

// POST /api/auth/signup - Local signup (Sends OTP)
router.post('/api/auth/signup', authController.localSignup);

// POST /api/auth/verify-signup-otp - Verify OTP and complete signup
router.post('/api/auth/verify-signup-otp', authController.verifySignupOtp);

// POST /api/auth/googleLogin - Firebase ID Token login
router.post('/api/auth/googleLogin', authController.googleLogin);

// POST or GET /logout - Clear session
router.all('/logout', authController.logout);

const forgotPasswordController = require('../controllers/forgotPasswordController');

// Forgot Password Flow Routes
router.get('/forgot-password', forgotPasswordController.renderForgotPassword);
router.post('/api/auth/forgot-password', forgotPasswordController.requestResetCode);

router.get('/verify-code', forgotPasswordController.renderVerifyCode);
router.post('/api/auth/verify-code', forgotPasswordController.verifyResetCode);

router.get('/reset-password', forgotPasswordController.renderResetPassword);
router.post('/api/auth/reset-password', forgotPasswordController.resetPassword);

module.exports = router;
