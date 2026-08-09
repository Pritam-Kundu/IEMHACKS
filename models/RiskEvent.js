const mongoose = require('mongoose');

const riskEventSchema = new mongoose.Schema({
    eventId: {
        type: String,
        required: true,
        unique: true
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
        required: true
    },
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: false
    },
    riskProbability: {
        type: Number,
        required: true,
        min: 0,
        max: 1
    },
    riskLevel: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        required: true,
        index: true
    },
    topic: {
        type: String,
        trim: true
    },
    modelVersion: {
        type: String,
        default: '1.0.0'
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('RiskEvent', riskEventSchema);
