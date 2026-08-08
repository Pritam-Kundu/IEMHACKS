const { admin } = require('../config/firebase');
const User = require('../models/User');

/**
 * Middleware to verify Firebase session cookie/token and fetch the MongoDB User.
 */
const requireAuth = async (req, res, next) => {
    try {
        const sessionCookie = req.cookies.__session;

        if (!sessionCookie) {
            return res.redirect('/login');
        }

        // Verify the session cookie with Firebase Admin
        const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true /** checkRevoked */);
        
        // Find user in MongoDB using firebaseUid
        const user = await User.findOne({ firebaseUid: decodedClaims.uid });

        if (!user) {
            // User exists in Firebase but not in MongoDB
            // Clear cookie and redirect to login or signup
            res.clearCookie('__session');
            return res.redirect('/login?error=profile_missing');
        }

        if (!user.isActive) {
            res.clearCookie('__session');
            return res.redirect('/login?error=account_disabled');
        }

        // Attach user to request and locals for EJS templates
        req.user = user;
        res.locals.user = user;
        
        next();
    } catch (error) {
        console.error('Auth verification error:', error);
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
            const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
            const user = await User.findOne({ firebaseUid: decodedClaims.uid });
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

module.exports = {
    requireAuth,
    requireRole,
    injectAuthUser
};
