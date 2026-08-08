const mongoose = require('mongoose');

const parentProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    children: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }],
    phoneNumber: {
        type: String,
        trim: true
    },
    occupation: {
        type: String,
        trim: true
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('ParentProfile', parentProfileSchema);
