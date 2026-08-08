const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Subject name is required'],
        unique: true,
        trim: true,
        index: true
    },
    description: {
        type: String,
        trim: true,
        maxLength: 500
    },
    icon: {
        type: String,
        default: 'fas fa-book'
    },
    colorCode: {
        type: String,
        default: '#3B82F6' // Tailwind blue-500
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Subject', subjectSchema);
