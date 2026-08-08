const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: [true, 'Assignment title is required'],
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    dueDate: {
        type: Date,
        required: true,
        index: true
    },
    totalPoints: {
        type: Number,
        required: true,
        default: 100
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Assignment', assignmentSchema);
