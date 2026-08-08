const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firebaseUid: {
        type: String,
        required: false, // Optional for local auth users
        unique: true,
        sparse: true, // Allow multiple nulls/undefined
        index: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: {
        type: String,
        select: false // Do not include password in queries by default
    },
    role: {
        type: String,
        enum: ['student', 'child', 'teacher', 'parent', 'admin'],
        required: [true, 'Role is required'],
        index: true
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    children: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    profilePicture: {
        type: String,
        default: '/images/default-avatar.png'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'rejected'],
        default: 'active',
        index: true
    },
    notificationPreferences: {
        email: { type: Boolean, default: true },
        assignments: { type: Boolean, default: true },
        quizzes: { type: Boolean, default: true },
        achievements: { type: Boolean, default: true },
        courseUpdates: { type: Boolean, default: true }
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('User', userSchema);
