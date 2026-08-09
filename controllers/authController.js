const { admin } = require('../config/firebase');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const TeacherProfile = require('../models/TeacherProfile');
const ParentProfile = require('../models/ParentProfile');
const Otp = require('../models/Otp');
const { sendOtpEmail } = require('../utils/email');
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
        { expiresIn: '1d' }
    );
    res.cookie('__session', token, { maxAge: 1 * 24 * 60 * 60 * 1000, httpOnly: true, secure: process.env.NODE_ENV === 'production' });
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

        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP temporarily
        await Otp.findOneAndDelete({ email: normalizedEmail }); // Delete any existing OTP for this email
        const newOtp = new Otp({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            role,
            otp: otpCode
        });
        await newOtp.save();

        // Send OTP via email
        const emailSent = await sendOtpEmail(normalizedEmail, otpCode);
        if (!emailSent) {
            return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again later.' });
        }

        return res.json({
            success: true,
            requireOtp: true,
            message: 'OTP sent to your email. Please verify to complete registration.'
        });

    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ success: false, message: 'An unexpected error occurred during signup.' });
    }
};

const verifySignupOtp = async (req, res) => {
    const { email, otp } = req.body;

    try {
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const otpRecord = await Otp.findOne({ email: normalizedEmail, otp });

        if (!otpRecord) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
        }

        // OTP is valid, proceed with user creation
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        }

        const status = otpRecord.role === 'teacher' ? 'pending' : 'active';

        const session = await mongoose.startSession();
        let user;
        
        try {
            session.startTransaction();

            const newUser = new User({
                name: otpRecord.name,
                email: otpRecord.email,
                password: otpRecord.password,
                role: otpRecord.role,
                status,
                profilePicture: '/images/default-avatar.png'
            });

            user = await newUser.save({ session });

            // Create profile
            if (otpRecord.role === 'student' || otpRecord.role === 'child') {
                await new StudentProfile({ user: user._id }).save({ session });
            } else if (otpRecord.role === 'teacher') {
                await new TeacherProfile({ user: user._id }).save({ session });
            } else if (otpRecord.role === 'parent') {
                await new ParentProfile({ user: user._id }).save({ session });
            }

            // Clean up OTP
            await Otp.deleteOne({ _id: otpRecord._id }, { session });

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
        console.error('Verify OTP error:', error);
        return res.status(500).json({ success: false, message: 'An unexpected error occurred during OTP verification.' });
    }
};

const updateLoginStreak = async (user) => {
    if (user.role === 'student' || user.role === 'child') {
        const profile = await StudentProfile.findOne({ user: user._id });
        if (profile) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            if (profile.lastLoginDate) {
                const lastLogin = new Date(profile.lastLoginDate);
                const lastLoginDay = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
                
                const diffTime = today - lastLoginDay;
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
                
                if (diffDays === 1) {
                    profile.currentStreak += 1;
                    if (profile.currentStreak > profile.longestStreak) {
                        profile.longestStreak = profile.currentStreak;
                    }
                } else if (diffDays > 1) {
                    profile.currentStreak = 1;
                }
            } else {
                profile.currentStreak = 1;
                profile.longestStreak = 1;
            }
            
            profile.lastLoginDate = now;
            await profile.save();
        }
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

        await updateLoginStreak(user);
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

        await updateLoginStreak(user);
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
    verifySignupOtp,
    localLogin,
    googleLogin,
    logout
};
