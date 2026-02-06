const jiraService = require('../services/jiraService');
const ollamaService = require('../services/ollamaService');
const TestCase = require('../models/TestCase');
const GenerationHistory = require('../models/GenerationHistory');
const { parseGitHubPRLink } = require('../utils/prLinkParser');
const { buildPRContext } = require('../services/prContext.service');
const { cleanPRContext } = require('../services/prContextCleaner.service');
const { default: PrResponse } = require('../services/PrResponse');

/**
 * Generate test cases from JIRA ticket
 * POST /api/generate-testcases
 */
exports.generateTestCases = async (req, res) => {
    const startTime = Date.now();

    try {
        const { jiraTicketKey, model, useReasoning } = req.body;


        // Validation
        if (!jiraTicketKey) {
            return res.status(400).json({
                success: false,
                message: 'JIRA ticket key is required'
            });
        }

        console.log(`Processing test case generation for ticket: ${jiraTicketKey}`);

        // Step 1: Fetch JIRA ticket
        const jiraTicket = await jiraService.fetchTicket(jiraTicketKey);

        // Step 2: Normalize JIRA data
        const normalizedData = jiraService.normalizeTicketData(jiraTicket);
        console.log("Normalized data:", normalizedData);

        // Step3: PR data call

        const prLink = "https://github.com/hdfclife-insurance/inspire-vo-loader-config-service/pull/219";

        // 1. Parse PR link → owner, repo, prNumber
        const { owner, repo, prNumber } = parseGitHubPRLink(prLink);


        // 2. Build raw PR context from GitHub
        const rawContext = await buildPRContext(owner, repo, prNumber);

        // 3. Clean PR context (remove noise, normalize structure)
        const cleanedContext = cleanPRContext(rawContext);


        // Step 4: V2 Coder Call



        const aiResponse =
            await PrResponse.analyzePRBehavior(cleanedContext);

        console.log("Pr respone:", aiResponse);




        // Step 3: Optional reasoning analysis
        let analysis = null;
        if (useReasoning) {
            analysis = await ollamaService.analyzeWithReasoning(normalizedData);
        }
        console.log("Entering ollama Service")
        // Step 4: Generate test cases using Ollama
        const result = await ollamaService.generateTestCases(normalizedData, aiResponse, model);

        console.log("Generated Test cases:", result);

        // Step 5: Save to database
        const testCaseDoc = new TestCase({
            jiraTicketId: normalizedData.ticketId,
            jiraTicketKey: normalizedData.ticketKey,
            summary: normalizedData.summary,
            description: normalizedData.description,
            testCases: result.testCases,
            generationTime: result.generationTime,
            status: 'generated'
        });

        await testCaseDoc.save();

        // Step 6: Save generation history
        const history = new GenerationHistory({
            jiraTicketKey: normalizedData.ticketKey,
            requestPayload: { jiraTicketKey, model, useReasoning },
            responsePayload: { testCasesCount: result.testCases.length },
            modelUsed: result.modelUsed,
            generationTime: Date.now() - startTime,
            status: 'success',
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip
        });

        await history.save();

        // Step 7: Return response
        res.status(200).json({
            success: true,
            message: 'Test cases generated successfully',
            data: {
                // jiraTicket: {
                //     key: normalizedData.ticketKey,
                //     summary: normalizedData.summary,
                //     issueType: normalizedData.issueType,
                //     priority: normalizedData.priority
                // },
                testCases: result.testCases,
                // analysis: analysis?.analysis || null,
                // metadata: {
                //     modelUsed: result.modelUsed,
                //     generationTime: result.generationTime,
                //     testCaseCount: result.testCases.length
                // }
            }
        });

    } catch (error) {
        console.error('Error generating test cases:', error);

        // Save error to history
        try {
            const history = new GenerationHistory({
                jiraTicketKey: req.body.jiraTicketKey || 'unknown',
                requestPayload: req.body,
                status: 'failed',
                errorMessage: error.message,
                generationTime: Date.now() - startTime,
                userAgent: req.headers['user-agent'],
                ipAddress: req.ip
            });
            await history.save();
        } catch (historyError) {
            console.error('Error saving history:', historyError);
        }
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate test cases',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};




/**
 * Health check for services
 * GET /api/health
 */
exports.healthCheck = async (req, res) => {
    try {
        const ollamaHealth = await ollamaService.checkHealth();
        const models = await ollamaService.listModels();

        res.status(200).json({
            success: true,
            services: {
                api: 'operational',
                database: 'operational',
                ollama: ollamaHealth ? 'operational' : 'unavailable',
                jira: 'configured'
            },
            availableModels: models.map(m => m.name),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(503).json({
            success: false,
            message: 'Service health check failed',
            error: error.message
        });
    }
};







/**
 * Get test cases by JIRA ticket key
 * GET /api/testcases/:ticketKey
 */
exports.getTestCasesByTicket = async (req, res) => {
    try {
        const { ticketKey } = req.params;

        const testCases = await TestCase.find({ jiraTicketKey: ticketKey })
            .sort({ createdAt: -1 })
            .limit(10);

        if (!testCases || testCases.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No test cases found for this ticket'
            });
        }

        res.status(200).json({
            success: true,
            data: testCases
        });

    } catch (error) {
        console.error('Error fetching test cases:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch test cases'
        });
    }
};

/**
 * Get all test cases with pagination
 * GET /api/testcases?page=1&limit=10
 */
// exports.getAllTestCases = async (req, res) => {
//     try {
//         const page = parseInt(req.query.page) || 1;
//         const limit = parseInt(req.query.limit) || 10;
//         const skip = (page - 1) * limit;

//         const testCases = await TestCase.find()
//             .sort({ createdAt: -1 })
//             .skip(skip)
//             .limit(limit)
//             .select('jiraTicketKey projectKey summary testCases.length modelUsed generatedAt status');

//         const total = await TestCase.countDocuments();

//         res.status(200).json({
//             success: true,
//             data: {
//                 testCases,
//                 pagination: {
//                     currentPage: page,
//                     totalPages: Math.ceil(total / limit),
//                     totalItems: total,
//                     itemsPerPage: limit
//                 }
//             }
//         });

//     } catch (error) {
//         console.error('Error fetching all test cases:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to fetch test cases'
//         });
//     }
// };

/**
 * Get generation history
 * GET /api/history?page=1&limit=20
 */
exports.getGenerationHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const history = await GenerationHistory.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await GenerationHistory.countDocuments();

        res.status(200).json({
            success: true,
            data: {
                history,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: limit
                }
            }
        });

    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch generation history'
        });
    }
};

/**
 * Update test case status
 * PATCH /api/testcases/:id/status
 */
// exports.updateTestCaseStatus = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { status } = req.body;

//         const validStatuses = ['generated', 'reviewed', 'approved', 'exported'];
//         if (!validStatuses.includes(status)) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
//             });
//         }

//         const testCase = await TestCase.findByIdAndUpdate(
//             id,
//             { status },
//             { new: true }
//         );

//         if (!testCase) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Test case not found'
//             });
//         }

//         res.status(200).json({
//             success: true,
//             message: 'Status updated successfully',
//             data: testCase
//         });

//     } catch (error) {
//         console.error('Error updating status:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to update status'
//         });
//     }
// };

/**
 * Delete test case
 * DELETE /api/testcases/:id
 */
// exports.deleteTestCase = async (req, res) => {
//     try {
//         const { id } = req.params;

//         const testCase = await TestCase.findByIdAndDelete(id);

//         if (!testCase) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Test case not found'
//             });
//         }

//         res.status(200).json({
//             success: true,
//             message: 'Test case deleted successfully'
//         });

//     } catch (error) {
//         console.error('Error deleting test case:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to delete test case'
//         });
//     }
// };

