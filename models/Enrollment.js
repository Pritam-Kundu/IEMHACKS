const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'dropped'],
        default: 'active',
        index: true
    },
    enrolledAt: {
        type: Date,
        default: Date.now
    }
}, { 
    timestamps: true 
});

// A student can only enroll in a course once
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
