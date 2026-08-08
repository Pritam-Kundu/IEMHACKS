const mongoose = require('mongoose');

const aiMessageSchema = new mongoose.Schema({
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AIConversation',
        required: true,
        index: true
    },
    sender: {
        type: String,
        enum: ['user', 'ai'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    sentAt: {
        type: Date,
        default: Date.now
    }
}, { 
    // We may not need general timestamps since sentAt handles creation time, 
    // but useful for updates if they can edit messages
    timestamps: true 
});

module.exports = mongoose.model('AIMessage', aiMessageSchema);
