const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String, // e.g., 'quiz_completed', 'achievement_earned', 'assignment_submitted'
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    childId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId, // Generic relation (e.g. to Quiz, Assignment, Achievement)
        index: true
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    link: {
        type: String, // URL to redirect when clicked (optional)
        trim: true
    }
}, { 
    timestamps: true 
});

// Index for efficiently fetching a user's unread notifications
notificationSchema.index({ recipientId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
