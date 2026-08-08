const mongoose = require('mongoose');

const teacherProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    bio: {
        type: String,
        trim: true,
        maxLength: 1000
    },
    specializations: [{
        type: String,
        trim: true
    }],
    qualifications: {
        type: String,
        trim: true
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('TeacherProfile', teacherProfileSchema);
