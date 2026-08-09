const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true,
        index: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    score: {
        type: Number,
        required: true,
        default: 0
    },
    passed: {
        type: Boolean,
        required: true,
        default: false
    },
    // Simple record of which option indices were selected per question ID
    answers: [{
        question: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question'
        },
        selectedOptionIndex: Number,
        isCorrect: Boolean,
        responseDuration: Number,
        skipped: { type: Boolean, default: false }
    }],
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
