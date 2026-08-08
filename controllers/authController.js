const { admin } = require('../config/firebase');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const TeacherProfile = require('../models/TeacherProfile');
const ParentProfile = require('../models/ParentProfile');
const authService = require('../services/authService');
const renderLogin = (req, res) => {
    if (req.cookies.__session) {
        return res.redirect('/'); 
    }
    
    res.render('auth/login');
};
const renderSignup = (req, res) => {
    if (req.cookies.__session) {
        return res.redirect('/'); 
    }
    
    res.render('auth/signup');
};


const sessionLogin = async (req, res) => {
    const { idToken } = req.body;

    try {
        if (!idToken) {
            return res.status(400).json({ success: false, message: 'Missing authentication token.' });
        }

        const result = await authService.loginUser(idToken);
        
        res.cookie('__session', result.sessionCookie, result.cookieOptions);

        return res.json({
            success: true,
            message: result.message,
            redirect: result.redirect
        });

    } catch (error) {
        const statusCode = error.statusCode || 500;
        const message = error.message || 'An unexpected error occurred during login.';
        return res.status(statusCode).json({ success: false, message });
    }
};

const sessionSignup = async (req, res) => {
    const { idToken, firstName, lastName, role } = req.body;

    try {
        if (!idToken) {
            return res.status(400).json({ success: false, message: 'Missing authentication token.' });
        }

        const result = await authService.registerUser(idToken, { firstName, lastName, role });
        
        // Attach the session cookie
        res.cookie('__session', result.sessionCookie, result.cookieOptions);

        return res.json({
            success: true,
            message: result.message,
            redirect: result.redirect
        });

    } catch (error) {
        const statusCode = error.statusCode || 500;
        const message = error.message || 'An unexpected error occurred during signup.';
        return res.status(statusCode).json({ success: false, message });
    }
};

const logout = (req, res) => {
    res.clearCookie('__session');
    res.redirect('/login');
};

module.exports = {
    renderLogin,
    renderSignup,
    sessionLogin,
    sessionSignup,
    logout
};
