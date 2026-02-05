const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
    jiraTicketId: {
        type: String,
        required: true,
        index: true
    },
    jiraTicketKey: {
        type: String,
        required: true
    },
    projectKey: {
        type: String,
        required: true
    },
    summary: {
        type: String,
        required: true
    },
    description: String,
    testCases: [{
        testCaseId: String,
        title: String,
        description: String,
        preconditions: String,
        steps: [{
            stepNumber: Number,
            action: String,
            expectedResult: String
        }],
        priority: {
            type: String,
            enum: ['High', 'Medium', 'Low'],
            default: 'Medium'
        },
        type: {
            type: String,
            enum: ['Functional', 'Integration', 'UI', 'API', 'Performance', 'Security'],
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
