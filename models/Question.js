const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true
    },
    isCorrect: {
        type: Boolean,
        required: true,
        default: false
    }
});

const questionSchema = new mongoose.Schema({
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true,
        index: true
    },
    questionText: {
        type: String,
        required: [true, 'Question text is required'],
        trim: true
    },
    options: {
        type: [optionSchema],
        validate: [v => v.length >= 2, 'A question must have at least 2 options']
    },
    explanation: {
        type: String,
        trim: true
    },
    difficulty: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
    },
    topic: {
        type: String,
        trim: true
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Question', questionSchema);
