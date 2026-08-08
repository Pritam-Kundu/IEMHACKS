const { admin } = require('../config/firebase');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const TeacherProfile = require('../models/TeacherProfile');
const ParentProfile = require('../models/ParentProfile');
const renderLogin = (req, res) => {
    if (req.cookies.__session) {
        return res.redirect('/'); 
    }
    
    res.render('auth/login', {
        firebaseConfig: {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
        }
    });
};
const renderSignup = (req, res) => {
    if (req.cookies.__session) {
        return res.redirect('/'); 
    }
    
    res.render('auth/signup', {
        firebaseConfig: {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
        }
    });
};


const sessionLogin = async (req, res) => {
    const { idToken } = req.body;

    try {
        if (!admin) {
            return res.status(500).json({ error: 'Firebase Admin is not configured on the server.' });
        }

        const decodedIdToken = await admin.auth().verifyIdToken(idToken);
        
        let user = await User.findOne({ firebaseUid: decodedIdToken.uid });
        
        // Handle Google Login / New User Auto-creation
        if (!user) {
            // Default to 'student' role for new social logins. Never grant 'teacher' automatically.
            const firebaseUser = await admin.auth().getUser(decodedIdToken.uid);
            
            // Extract names from displayName if available
            let firstName = 'New';
            let lastName = 'User';
            if (firebaseUser.displayName) {
                const parts = firebaseUser.displayName.split(' ');
                firstName = parts[0];
                lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
            }

            // Create MongoDB User
            user = await User.create({
                firebaseUid: firebaseUser.uid,
                email: firebaseUser.email,
                role: 'student', 
                firstName,
                lastName,
                profilePicture: firebaseUser.photoURL || '/images/default-avatar.png'
            });

            // Create Student Profile
            await StudentProfile.create({
                user: user._id
            });
        }

        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
        
        const options = { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === 'production' };
        res.cookie('__session', sessionCookie, options);

        let redirectUrl = '/';
        switch(user.role) {
            case 'student': redirectUrl = '/student/dashboard'; break;
            case 'teacher': redirectUrl = '/teacher/dashboard'; break;
            case 'parent': redirectUrl = '/parent/dashboard'; break;
        }

        res.json({ status: 'success', redirectUrl, role: user.role });
    } catch (error) {
        console.error('Session Login Error:', error);
        res.status(401).json({ error: 'UNAUTHORIZED REQUEST!' });
    }
};

const sessionSignup = async (req, res) => {
    const { idToken, firstName, lastName, role } = req.body;

    try {
        if (!admin) {
            return res.status(500).json({ error: 'Firebase Admin is not configured on the server.' });
        }

        const decodedIdToken = await admin.auth().verifyIdToken(idToken);
        
        let user = await User.findOne({ firebaseUid: decodedIdToken.uid });
        
        if (user) {
            return res.status(400).json({ error: 'This account is already registered. Please login instead.' });
        }

        const firebaseUser = await admin.auth().getUser(decodedIdToken.uid);

        // Security check: ensure valid role is provided
        const validRoles = ['student', 'teacher', 'parent'];
        const assignedRole = validRoles.includes(role) ? role : 'student';

        // Create MongoDB User
        user = await User.create({
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email,
            role: assignedRole,
            firstName: firstName || 'New',
            lastName: lastName || 'User',
            profilePicture: firebaseUser.photoURL || '/images/default-avatar.png'
        });

        // Create Profile based on role
        if (assignedRole === 'student') {
            await StudentProfile.create({ user: user._id });
        } else if (assignedRole === 'teacher') {
            await TeacherProfile.create({ user: user._id });
        } else if (assignedRole === 'parent') {
            await ParentProfile.create({ user: user._id });
        }

        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
        
        const options = { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === 'production' };
        res.cookie('__session', sessionCookie, options);

        let redirectUrl = '/';
        switch(user.role) {
            case 'student': redirectUrl = '/student/dashboard'; break;
            case 'teacher': redirectUrl = '/teacher/dashboard'; break;
            case 'parent': redirectUrl = '/parent/dashboard'; break;
        }

        res.json({ status: 'success', redirectUrl, role: user.role });
    } catch (error) {
        console.error('Session Signup Error:', error);
        res.status(401).json({ error: 'UNAUTHORIZED REQUEST!' });
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
