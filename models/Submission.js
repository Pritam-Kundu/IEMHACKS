const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    assignment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: true,
        index: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    content: {
        type: String, // Can be text or a URL to a file
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    score: {
        type: Number,
        default: null
    },
    feedback: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['submitted', 'graded', 'late'],
        default: 'submitted',
        index: true
    }
}, { 
    timestamps: true 
});

// A student submits an assignment once (or we keep the latest)
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
