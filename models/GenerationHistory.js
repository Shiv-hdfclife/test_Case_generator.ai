const mongoose = require('mongoose');

const generationHistorySchema = new mongoose.Schema({
    generationId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    jiraTicketKey: {
        type: String,
        required: true
    },
    requestPayload: {
        type: mongoose.Schema.Types.Mixed
    },
    responsePayload: {
        type: mongoose.Schema.Types.Mixed
    },
    modelUsed: String,
    tokensUsed: Number,
    generationTime: Number, // milliseconds
    status: {
        type: String,
        enum: ['success', 'failed', 'partial'],
        default: 'success'
    },
    errorMessage: String,
    userAgent: String,
    ipAddress: String
}, {
    timestamps: true
});

// TTL index to auto-delete old records after 90 days
generationHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('GenerationHistory', generationHistorySchema);
