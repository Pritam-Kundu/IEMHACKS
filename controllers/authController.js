const { admin } = require('../config/firebase');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const TeacherProfile = require('../models/TeacherProfile');
const ParentProfile = require('../models/ParentProfile');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_for_development';

const renderLogin = (req, res) => {
    const sessionCookie = req.cookies.__session;
    if (sessionCookie) {
        try {
            const decoded = jwt.verify(sessionCookie, JWT_SECRET);
            const redirectUrl = req.query.redirect || getRedirectUrl(decoded.role);
            return res.redirect(redirectUrl); 
        } catch (err) {
            res.clearCookie('__session');
        }
    }
    res.render('auth/login');
};

const renderSignup = (req, res) => {
    const sessionCookie = req.cookies.__session;
    if (sessionCookie) {
        try {
            const decoded = jwt.verify(sessionCookie, JWT_SECRET);
            const redirectUrl = req.query.redirect || getRedirectUrl(decoded.role);
            return res.redirect(redirectUrl); 
        } catch (err) {
            res.clearCookie('__session');
        }
    }
    res.render('auth/signup');
};

const getRedirectUrl = (role) => {
    if (role === 'student' || role === 'child') return '/student/dashboard';
    if (role === 'teacher') return '/teacher/dashboard';
    if (role === 'parent') return '/parent/dashboard';
    return '/';
};

const generateAuthCookie = (res, user) => {
    const token = jwt.sign(
        { uid: user._id.toString(), firebaseUid: user.firebaseUid, role: user.role, email: user.email },
        JWT_SECRET,
        { expiresIn: '5d' }
    );
    res.cookie('__session', token, { maxAge: 5 * 24 * 60 * 60 * 1000, httpOnly: true, secure: process.env.NODE_ENV === 'production' });
};

const localSignup = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        if (!name || !email || !password || !role) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        const validRoles = ['student', 'child', 'teacher', 'parent'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role selected.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const status = role === 'teacher' ? 'pending' : 'active';

        const session = await mongoose.startSession();
        let user;
        
        try {
            session.startTransaction();

            const newUser = new User({
                name,
                email: normalizedEmail,
                password: hashedPassword,
                role,
                status,
                profilePicture: '/images/default-avatar.png'
            });

            user = await newUser.save({ session });

            // Create profile
            if (role === 'student' || role === 'child') {
                await new StudentProfile({ user: user._id }).save({ session });
            } else if (role === 'teacher') {
                await new TeacherProfile({ user: user._id }).save({ session });
            } else if (role === 'parent') {
                await new ParentProfile({ user: user._id }).save({ session });
            }

            await session.commitTransaction();
            session.endSession();
        } catch (txnErr) {
            await session.abortTransaction();
            session.endSession();
            throw txnErr;
        }

        generateAuthCookie(res, user);

        return res.json({
            success: true,
            message: 'Account created successfully.',
            redirect: getRedirectUrl(user.role)
        });

    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ success: false, message: 'An unexpected error occurred during signup.' });
    }
};

const localLogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        
        // Select password since it's excluded by default
        const user = await User.findOne({ email: normalizedEmail }).select('+password');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Account not found. Please sign up first.' });
        }

        if (!user.password) {
            return res.status(400).json({ success: false, message: 'Please log in with Google to access this account.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect email or password.' });
        }

        if (user.status === 'rejected') {
            return res.status(403).json({ success: false, message: 'Your account has been rejected.' });
        }

        generateAuthCookie(res, user);

        return res.json({
            success: true,
            message: 'Logged in successfully.',
            redirect: getRedirectUrl(user.role)
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, message: 'An unexpected error occurred during login.' });
    }
};

const googleLogin = async (req, res) => {
    const { idToken, role } = req.body; // role only passed on signup

    try {
        if (!idToken) {
            return res.status(400).json({ success: false, message: 'Missing authentication token.' });
        }
        
        if (!admin) {
            return res.status(500).json({ success: false, message: 'Firebase Admin is not configured.' });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { uid: firebaseUid, email, name, picture } = decodedToken;

        let user = await User.findOne({ firebaseUid });

        // If user not found by UID, check by email (in case they signed up with password, then try Google)
        if (!user) {
            user = await User.findOne({ email: email.toLowerCase() });
            
            if (user) {
                // Link Google account to existing user
                user.firebaseUid = firebaseUid;
                if (!user.profilePicture || user.profilePicture === '/images/default-avatar.png') {
                    user.profilePicture = picture || '/images/default-avatar.png';
                }
                await user.save();
            }
        }

        if (!user) {
            // New user via Google (Signup flow)
            if (!role) {
                return res.status(400).json({ success: false, message: 'Role is required for new Google registrations.' });
            }

            const validRoles = ['student', 'child', 'teacher', 'parent'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ success: false, message: 'Invalid role selected.' });
            }

            const status = role === 'teacher' ? 'pending' : 'active';
            
            const session = await mongoose.startSession();
            try {
                session.startTransaction();

                const newUser = new User({
                    firebaseUid,
                    email: email.toLowerCase(),
                    name: name || 'New User',
                    role,
                    status,
                    profilePicture: picture || '/images/default-avatar.png'
                });

                user = await newUser.save({ session });

                if (role === 'student' || role === 'child') {
                    await new StudentProfile({ user: user._id }).save({ session });
                } else if (role === 'teacher') {
                    await new TeacherProfile({ user: user._id }).save({ session });
                } else if (role === 'parent') {
                    await new ParentProfile({ user: user._id }).save({ session });
                }

                await session.commitTransaction();
                session.endSession();
            } catch (txnErr) {
                await session.abortTransaction();
                session.endSession();
                throw txnErr;
            }
        }

        if (user.status === 'rejected') {
            return res.status(403).json({ success: false, message: 'Your account has been rejected.' });
        }

        generateAuthCookie(res, user);

        return res.json({
            success: true,
            message: 'Logged in successfully.',
            redirect: getRedirectUrl(user.role)
        });

    } catch (error) {
        console.error('Google login error:', error);
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
};

const logout = (req, res) => {
    res.clearCookie('__session');
    res.redirect('/login');
};

module.exports = {
    renderLogin,
    renderSignup,
    localSignup,
    localLogin,
    googleLogin,
    logout
};
