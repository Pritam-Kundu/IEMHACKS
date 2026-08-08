const mongoose = require('mongoose');

const aiConversationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        default: 'New Conversation',
        trim: true
    },
    context: {
        type: String,
        enum: ['student', 'parent', 'home', 'lesson', 'quiz'],
        default: 'student'
    },
    lesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson'
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    },
    selectedStudent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudentProfile'
    },
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active'
    },
    startedAt: {
        type: Date,
        default: Date.now
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('AIConversation', aiConversationSchema);
