const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
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
    type: {
        type: String, // e.g., 'assignment_due', 'grade_posted', 'system'
        required: true
    },
    read: {
        type: Boolean,
        default: false,
        index: true
    },
    link: {
        type: String, // URL to redirect when clicked
        trim: true
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Notification', notificationSchema);
