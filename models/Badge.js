const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Badge name is required'],
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    icon: {
        type: String,
        required: true // URL to image or SVG
    },
    criteria: {
        type: String, // e.g., 'completed_5_courses'
        required: true,
        unique: true,
        index: true
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Badge', badgeSchema);
