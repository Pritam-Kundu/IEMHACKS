const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Course title is required'],
        trim: true,
        index: true
    },
    description: {
        type: String,
        required: [true, 'Course description is required'],
        trim: true
    },
    thumbnail: {
        type: String,
        default: '/images/default-course.png'
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
        index: true
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true,
        index: true
    }],
    isPublished: {
        type: Boolean,
        default: false,
        index: true
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Course', courseSchema);
