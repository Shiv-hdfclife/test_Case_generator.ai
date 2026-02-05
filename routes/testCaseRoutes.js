const express = require('express');
const router = express.Router();
const testCaseController = require('../controllers/testCaseController');
const { validateRequest, rateLimiter } = require('../middlewares');

/**
 * @route   POST /api/generate-testcases
 * @desc    Generate test cases from JIRA ticket
 * @access  Public
 */
router.post(
    '/generate-testcases',
    rateLimiter,
    validateRequest,
    testCaseController.generateTestCases
);

// /**
//  * @route   GET /api/testcases/:ticketKey
//  * @desc    Get test cases by JIRA ticket key
//  * @access  Public
//  */
// router.get(
//     '/testcases/:ticketKey',
//     testCaseController.getTestCasesByTicket
// );

// /**
//  * @route   GET /api/testcases
//  * @desc    Get all test cases with pagination
//  * @access  Public
//  */
// router.get(
//     '/testcases',
//     testCaseController.getAllTestCases
// );

// /**
//  * @route   GET /api/history
//  * @desc    Get generation history
//  * @access  Public
//  */
// router.get(
//     '/history',
//     testCaseController.getGenerationHistory
// );

// /**
//  * @route   PATCH /api/testcases/:id/status
//  * @desc    Update test case status
//  * @access  Public
//  */
// router.patch(
//     '/testcases/:id/status',
//     testCaseController.updateTestCaseStatus
// );

// /**
//  * @route   DELETE /api/testcases/:id
//  * @desc    Delete test case
//  * @access  Public
//  */
// router.delete(
//     '/testcases/:id',
//     testCaseController.deleteTestCase
// );

/**
 * @route   GET /api/health
 * @desc    Health check
 * @access  Public
 */
router.get(
    '/health',
    testCaseController.healthCheck
);

module.exports = router;
