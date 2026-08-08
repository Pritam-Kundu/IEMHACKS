const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
    studentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true 
    },
    type: { 
        type: String, 
        required: true,
        index: true
    },
    title: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    icon: { 
        type: String, 
        required: true 
    },
    courseId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Course' 
    },
    quizId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Quiz' 
    },
    assignmentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Assignment' 
    },
    earnedAt: { 
        type: Date, 
        default: Date.now 
    }
}, { 
    timestamps: true 
});

// Prevent duplicate achievements for the same specific context
achievementSchema.index({ studentId: 1, type: 1, courseId: 1, quizId: 1, assignmentId: 1 }, { unique: true });

module.exports = mongoose.model('Achievement', achievementSchema);
