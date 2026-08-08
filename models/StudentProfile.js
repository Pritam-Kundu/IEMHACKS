const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    dateOfBirth: {
        type: Date
    },
    gradeLevel: {
        type: String,
        trim: true
    },
    schoolName: {
        type: String,
        trim: true
    },
    parents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }],
    earnedBadges: [{
        badge: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Badge'
        },
        earnedAt: {
            type: Date,
            default: Date.now
    }],
    recommendedDifficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'intermediate'
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
