const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_for_development';

/**
 * Middleware to protect routes that require authentication
 */
const requireAuth = async (req, res, next) => {
    const sessionCookie = req.cookies.__session || '';

    if (!sessionCookie) {
        return res.redirect('/login');
    }

    try {
        const decodedToken = jwt.verify(sessionCookie, JWT_SECRET);
        const user = await User.findById(decodedToken.uid);

        if (!user) {
            return res.redirect('/login?error=profile_missing');
        }

        if (!user.isActive) {
            return res.redirect('/login?error=account_disabled');
        }

        // Attach user to request and locals for EJS templates
        req.user = user;
        res.locals.user = user;
        next();
    } catch (error) {
        // Clear invalid cookie
        res.clearCookie('__session');
        return res.redirect('/login?error=session_invalid');
    }
};

/**
 * Middleware to enforce role-based access control.
 * Must be used AFTER requireAuth.
 * @param {...String} roles - Allowed roles
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.redirect('/login');
        }
        
        if (!roles.includes(req.user.role)) {
            // Forbidden access
            return res.status(403).render('auth/error', { 
                message: 'You do not have permission to access this page.' 
            });
        }
        
        next();
    };
};

/**
 * Optional Auth middleware just to inject user info into locals if logged in,
 * without strictly requiring authentication (useful for public landing pages).
 */
const injectAuthUser = async (req, res, next) => {
    const sessionCookie = req.cookies.__session;
    if (sessionCookie) {
        try {
            const decodedToken = jwt.verify(sessionCookie, JWT_SECRET);
            const user = await User.findById(decodedToken.uid);
            if (user) {
                req.user = user;
                res.locals.user = user;
            }
        } catch (error) {
            // Silently ignore invalid sessions for optional auth
        }
    }
    next();
};

/**
 * Middleware for API routes using Bearer token
 */
const requireApiAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decodedToken.uid);

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found in system' });
        }

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account is disabled' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('API Auth Error:', error);
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

module.exports = {
    requireAuth,
    requireRole,
    injectAuthUser,
    requireApiAuth
};
