const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
    generationId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    jiraTicketId: {
        type: String,
        required: true,
        index: true
    },
    jiraTicketKey: {
        type: String,
        required: true
    },
    summary: {
        type: String,
        required: true
    },
    description: String,
    testCases: [{
        TestCaseId: String,
        Test: String,
        Expected_Result: String,
        type: {
            type: String,
            enum: ['Positive', 'Negative', 'Boundary'],
            default: 'Functional'
        }
    }],
    modelUsed: {
        type: String,
        default: 'deepseek-coder-v2:lite'
    },
    generatedAt: {
        type: Date,
        default: Date.now
    },
    generationTime: {
        type: Number, // milliseconds
    },
    status: {
        type: String,
        enum: ['generated', 'reviewed', 'approved', 'exported'],
        default: 'generated'
    }
}, {
    timestamps: true
});

// Index for faster queries
testCaseSchema.index({ jiraTicketKey: 1, createdAt: -1 });

module.exports = mongoose.model('TestCase', testCaseSchema);
