const mongoose = require('mongoose');

const aiConversationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        default: 'New Conversation',
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active'
    },
    startedAt: {
        type: Date,
        default: Date.now
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('AIConversation', aiConversationSchema);
