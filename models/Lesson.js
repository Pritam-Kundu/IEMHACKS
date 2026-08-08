const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: [true, 'Lesson title is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    content: {
        type: String, // Rich text or markdown
        required: true
    },
    videoUrl: {
        type: String,
        trim: true
    },
    order: {
        type: Number,
        required: true,
        default: 1
    },
    durationMinutes: {
        type: Number,
        default: 0
    }
}, { 
    timestamps: true 
});

// Compound index to ensure lesson order is unique per course
lessonSchema.index({ course: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Lesson', lessonSchema);
