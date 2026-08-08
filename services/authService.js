const { admin } = require('../config/firebase');
const mongoose = require('mongoose');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const TeacherProfile = require('../models/TeacherProfile');
const ParentProfile = require('../models/ParentProfile');

/**
 * Handles the business logic for registering a user after Firebase Authentication.
 * Uses MongoDB transactions to ensure atomic operations (User + Profile).
 */
const registerUser = async (idToken, profileData) => {
    // 1. Verify Firebase ID Token
    if (!admin) {
        throw { statusCode: 500, message: 'Firebase Admin is not configured on the server. Cannot verify tokens.' };
    }

    let decodedToken;
    try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
        throw { statusCode: 401, message: 'Invalid or expired authentication token.' };
    }

    const { uid: firebaseUid, email } = decodedToken;
    const { firstName = 'New', lastName = 'User', role = 'student' } = profileData;

    // Validate role
    const validRoles = ['student', 'teacher', 'parent'];
    if (!validRoles.includes(role)) {
        throw { statusCode: 400, message: 'Invalid role selected.' };
    }

    let user;
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();

        // 2. Check if MongoDB User already exists using firebaseUid
        user = await User.findOne({ firebaseUid }).session(session);

        if (user) {
            // Check if email changed in Firebase but not in MongoDB
            if (user.email !== email) {
                // Not automatically syncing, just a note (handled safely here)
            }
        } else {
            // Check if email already exists in MongoDB under a DIFFERENT firebaseUid
            const existingEmailUser = await User.findOne({ email }).session(session);
            if (existingEmailUser) {
                throw { statusCode: 409, message: 'An account with this email already exists in the database under a different authentication provider.' };
            }

            // Create new MongoDB User
            const status = role === 'teacher' ? 'pending' : 'active';
            
            // Fetch Firebase user for photoURL if available
            let photoURL = '/images/default-avatar.png';
            try {
                const firebaseUser = await admin.auth().getUser(firebaseUid);
                if (firebaseUser.photoURL) photoURL = firebaseUser.photoURL;
            } catch (e) {
                // Ignore if we can't fetch full details, stick to default
            }

            const newUser = new User({
                firebaseUid,
                email,
                role,
                status,
                firstName,
                lastName,
                profilePicture: photoURL
            });

            user = await newUser.save({ session });
        }

        // 3. Role-specific profile completion
        // If the user already existed but their profile was missing (partial failure), this creates it.
        // If they already exist and have a profile, this skips duplicate creation.
        let profileCreated = false;
        
        if (user.role === 'student') {
            const profile = await StudentProfile.findOne({ user: user._id }).session(session);
            if (!profile) {
                await new StudentProfile({ user: user._id }).save({ session });
                profileCreated = true;
            }
        } else if (user.role === 'teacher') {
            const profile = await TeacherProfile.findOne({ user: user._id }).session(session);
            if (!profile) {
                await new TeacherProfile({ user: user._id }).save({ session });
                profileCreated = true;
            }
        } else if (user.role === 'parent') {
            const profile = await ParentProfile.findOne({ user: user._id }).session(session);
            if (!profile) {
                await new ParentProfile({ user: user._id }).save({ session });
                profileCreated = true;
            }
        }

        // 4. Commit Transaction
        await session.commitTransaction();
        session.endSession();

        // 5. Generate Session Cookie for traditional web flow (5 days)
        const expiresIn = 60 * 60 * 24 * 5 * 1000;
        const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

        // 6. Determine Redirect URL based on verified backend role
        let redirect = '/';
        if (user.role === 'student') redirect = '/student/dashboard';
        else if (user.role === 'teacher') redirect = '/teacher/dashboard'; // Note: Dashboard should check for 'pending' status
        else if (user.role === 'parent') redirect = '/parent/dashboard';

        return {
            success: true,
            message: 'Account created successfully.',
            redirect,
            sessionCookie,
            cookieOptions: { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === 'production' }
        };

    } catch (error) {
        // Abort transaction on any failure
        await session.abortTransaction();
        session.endSession();
        
        // Rethrow formatted errors
        if (error.statusCode) {
            throw error;
        }
        
        console.error('Database Transaction Error in authService:', error);
        throw { statusCode: 500, message: 'A database error occurred during registration.' };
    }
};

const loginUser = async (idToken) => {
    if (!admin) {
        throw { statusCode: 500, message: 'Firebase Admin is not configured on the server. Cannot verify tokens.' };
    }

    let decodedToken;
    try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
        throw { statusCode: 401, message: 'Invalid or expired authentication token.' };
    }

    const firebaseUid = decodedToken.uid;
    const user = await User.findOne({ firebaseUid });

    if (!user) {
        throw { statusCode: 404, message: 'Account not found. Please sign up first.' };
    }

    if (user.status === 'rejected') {
        throw { statusCode: 403, message: 'Your account has been rejected.' };
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

    let redirect = '/';
    if (user.role === 'student') redirect = '/student/dashboard';
    else if (user.role === 'teacher') redirect = '/teacher/dashboard';
    else if (user.role === 'parent') redirect = '/parent/dashboard';

    return {
        success: true,
        message: 'Logged in successfully.',
        redirect,
        sessionCookie,
        cookieOptions: { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === 'production' }
    };
};

module.exports = {
    registerUser,
    loginUser
};
