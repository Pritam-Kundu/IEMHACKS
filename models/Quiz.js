const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    lesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: [true, 'Quiz title is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    passingScore: {
        type: Number,
        default: 60 // Percentage
    },
    timeLimitMinutes: {
        type: Number, // 0 means no limit
        default: 0
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Quiz', quizSchema);
