const mongoose = require('mongoose');

const learningEventSchema = new mongoose.Schema({
    eventId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
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
    lesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        required: true,
        index: true
    },
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true,
        index: true
    },
    question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true,
        index: true
    },
    topic: {
        type: String,
        trim: true
    },
    difficulty: {
        type: Number,
        min: 1,
        max: 5
    },
    isCorrect: {
        type: Boolean,
        required: true
    },
    attemptCount: {
        type: Number,
        default: 1
    },
    questionStartedAt: {
        type: Date,
        required: true
    },
    questionAnsweredAt: {
        type: Date,
        required: true
    },
    responseDuration: {
        type: Number,
        required: true // in milliseconds
    },
    skipped: {
        type: Boolean,
        default: false
    },
    quizCompleted: {
        type: Boolean,
        default: false
    },
    recentQuizPerformance: {
        type: Number
    },
    topicPerformance: {
        type: Number
    }
}, { 
    timestamps: true 
});

// Index to quickly find previous attempts for a specific student and question
learningEventSchema.index({ student: 1, question: 1 });

module.exports = mongoose.model('LearningEvent', learningEventSchema);
