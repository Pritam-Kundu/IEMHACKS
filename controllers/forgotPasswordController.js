const User = require('../models/User');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// Helper to get mail transporter (falls back to Ethereal if no SMTP provided)
const getTransporter = async () => {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    } else {
        // Generate test SMTP service account from ethereal.email
        let testAccount = await nodemailer.createTestAccount();
        console.log('Created Ethereal Test Account:', testAccount.user);
        return nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, 
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    }
};

// 1. Render Forgot Password Form
exports.renderForgotPassword = (req, res) => {
    res.render('auth/forgot-password', { title: 'Forgot Password | EduSmart' });
};

// 2. Request Reset Code (Generate and Send OTP)
exports.requestResetCode = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Return success even if user not found to prevent email enumeration
            return res.json({ success: true, redirect: `/verify-code?email=${encodeURIComponent(email)}` });
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save to user with 15 mins expiration
        user.resetPasswordCode = code;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
        await user.save();

        // Send Email
        const transporter = await getTransporter();
        const info = await transporter.sendMail({
            from: '"EduSmart" <noreply@edusmart.com>',
            to: user.email,
            subject: "Your Password Reset Code",
            text: `Your password reset code is: ${code}. It expires in 15 minutes.`,
            html: `<b>Your password reset code is: <span style="font-size: 20px;">${code}</span></b><br/>It expires in 15 minutes.`,
        });

        console.log("Message sent: %s", info.messageId);
        if (info.messageId && !process.env.SMTP_HOST) {
            console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }

        res.json({ success: true, redirect: `/verify-code?email=${encodeURIComponent(user.email)}` });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 3. Render Verify Code Form
exports.renderVerifyCode = (req, res) => {
    const { email } = req.query;
    if (!email) {
        return res.redirect('/forgot-password');
    }
    res.render('auth/verify-code', { title: 'Verify Code | EduSmart', email });
};

// 4. Verify Reset Code
exports.verifyResetCode = async (req, res) => {
    try {
        const { email, code } = req.body;
        
        if (!email || !code) {
            return res.status(400).json({ success: false, message: 'Email and code are required' });
        }

        const user = await User.findOne({ 
            email: email.toLowerCase(),
            resetPasswordCode: code,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });
        }

        // Code is valid. Proceed to reset password page.
        // We pass a temporary hash in the URL to prevent skipping the verification step loosely.
        const token = Buffer.from(`${user.email}:${user.resetPasswordCode}`).toString('base64');

        res.json({ success: true, redirect: `/reset-password?token=${encodeURIComponent(token)}` });
    } catch (error) {
        console.error('Verify Code Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 5. Render Reset Password Form
exports.renderResetPassword = (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.redirect('/forgot-password');
    }
    res.render('auth/reset-password', { title: 'Reset Password | EduSmart', token });
};

// 6. Reset Password
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: 'Token and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
        }

        const decoded = Buffer.from(token, 'base64').toString('ascii');
        const [email, code] = decoded.split(':');

        if (!email || !code) {
            return res.status(400).json({ success: false, message: 'Invalid token' });
        }

        const user = await User.findOne({ 
            email: email.toLowerCase(),
            resetPasswordCode: code,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset session. Please request a new code.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user
        user.password = hashedPassword;
        user.resetPasswordCode = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ success: true, redirect: '/login?reset=success' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
