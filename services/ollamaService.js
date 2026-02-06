const axios = require('axios');

class OllamaService {
    constructor() {
        this.baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.coderModel = process.env.OLLAMA_MODEL_CODER || 'deepseek-coder-v2:lite';
        this.reasoningModel = process.env.OLLAMA_MODEL_REASONING || 'deepseek-r1:8b';
    }

    /**
     * Generate test cases using DeepSeek Coder
     * @param {Object} jiraData - Normalized JIRA ticket data
     * @param {Array} prAnalyses - Array of PR analysis objects
     * @param {string} model - Model to use (optional)
     * @returns {Promise<Object>} - Generated test cases
     */
    async generateTestCases(jiraData, prAnalyses, model = null) {
        const selectedModel = model || this.coderModel;
        const maxRetries = 2;
        let attempt = 0;
        let lastResponse = '';

        while (attempt < maxRetries) {
            attempt++;
            
            try {
                const prompt = this.buildPrompt(jiraData, prAnalyses);
                const startTime = Date.now();

                const response = await axios.post(`${this.baseURL}/api/generate`, {
                    model: selectedModel,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.2,
                        top_p: 0.9,
                        num_predict: 2048
                    }
                });

                const generationTime = Date.now() - startTime;

                // Parse the response
                const generatedText = response.data.response;
                lastResponse = generatedText;
                const testCases = this.parseTestCases(generatedText);

                // If we got test cases, return success
                if (testCases && testCases.length > 0) {
                    return {
                        testCases,
                        modelUsed: selectedModel,
                        generationTime,
                        rawResponse: generatedText
                    };
                }

                // If no test cases and we have retries left, try again
                if (attempt < maxRetries) {
                    console.log(`⚠️ No test cases generated, retrying (${attempt}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } catch (error) {
                console.error(`Error on attempt ${attempt}:`, error.message);
                if (attempt >= maxRetries) throw error;
            }
        }

        // If we exhausted all retries, return what we have
        console.error('Failed to generate test cases after all retries');
        return {
            testCases: [],
            modelUsed: selectedModel,
            generationTime: 0,
            rawResponse: lastResponse
        };
    }

    /**
     * Use reasoning model for complex analysis
     * @param {Object} jiraData - Normalized JIRA ticket data
     * @returns {Promise<Object>} - Analysis result
     */
    async analyzeWithReasoning(jiraData) {
        const prompt = `Analyze the following JIRA ticket and provide a detailed breakdown of test scenarios:

Ticket: ${jiraData.ticketKey}
Summary: ${jiraData.summary}
Description: ${jiraData.description}
Acceptance Criteria: ${jiraData.acceptanceCriteria.join('\n')}

Provide:
1. Key features to test
2. Edge cases
3. Integration points
4. Security considerations
5. Performance aspects`;

        try {
            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: this.coderModel,
                prompt: prompt,
                stream: false
            });

            return {
                analysis: response.data.response,
                modelUsed: this.coderModel
            };
        } catch (error) {
            console.error('Error in reasoning analysis:', error.message);
            throw new Error(`Failed to analyze ticket: ${error.message}`);
        }
    }

    /**
     * Build prompt for test case generation
     * @param {Object} jiraData - Normalized JIRA ticket data
     * @param {Array} prAnalyses - Array of PR analysis objects with PR context and code changes
     * @returns {string} - Formatted prompt
     */
    buildPrompt(jiraData, prAnalyses) {
        // Format PR contexts
        let prContextSection = '';
        
        if (prAnalyses && Array.isArray(prAnalyses) && prAnalyses.length > 0) {
            prContextSection = '**PR Context (Code Changes):**\n\n';
            
            prAnalyses.forEach((prAnalysis, index) => {
                if (prAnalysis.error) {
                    prContextSection += `PR #${index + 1} (${prAnalysis.prLink}):\n`;
                    prContextSection += `ERROR: ${prAnalysis.error}\n\n`;
                } else {
                    prContextSection += `PR #${index + 1} - ${prAnalysis.owner}/${prAnalysis.repo}/pull/${prAnalysis.prNumber}:\n`;
                    prContextSection += `${JSON.stringify(prAnalysis.analysis, null, 2)}\n\n`;
                }
            });
        } else {
            prContextSection = '**PR Context (Code Changes):**\nNo PR context available\n\n';
        }

        return `You are a Senior QA Engineer generating System Integration Testing (SIT) test cases.

GENERATE COMPREHENSIVE BUT NON-REPETITIVE test cases from the JIRA ticket and PR context.

CRITICAL RULES:
1. Use ONLY the provided JIRA ticket data and PR context
2. Each test case MUST be UNIQUE - test a DIFFERENT scenario
3. Do NOT repeat the same test with minor variations (e.g., don't create 10 separate tests for different special characters)
4. Group similar invalid scenarios into ONE test (e.g., "mobile number with invalid characters" instead of separate tests for +, -, space, letter)
5. Each validation rule gets ONE Positive, ONE Negative, and ONE Boundary test (if applicable)
6. Be thorough but avoid redundancy
7. Maximum 15-20 test cases total
8. When multiple PRs are provided, consider all changes together

TEST CASE CATEGORIES:
- Positive: Valid inputs that should succeed
- Negative: Invalid inputs that should fail  
- Boundary: Edge cases at limits

**JIRA Ticket:**
- Ticket: ${jiraData.ticketKey}
- Summary: ${jiraData.summary}
- Description: ${jiraData.description}

${prContextSection}

OUTPUT FORMAT (strictly follow):

TestCaseId: TC001
Test: [One clear sentence describing what is being verified]
Expected Result: [Clear, observable outcome]
Type: [Positive | Negative | Boundary]

---

TestCaseId: TC002
Test: [Next unique test case]
Expected Result: [Expected outcome]
Type: [Type]

---

REQUIREMENTS:
- Start with TestCaseId: TC001 and increment (TC002, TC003, etc.)
- NO Pre-Condition field
- Each test must be distinct and non-overlapping
- Consolidate similar scenarios

GENERATE TEST CASES NOW:`;
    }

    /**
     * Parse test cases from LLM response
     * @param {string} response - Raw response from LLM
     * @returns {Array} - Parsed test cases
     */
    parseTestCases(response) {
        try {
            // Try to extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return parsed.testCases || [];
            }

            // If no JSON found, try to parse structured text
            const testCases = this.parseStructuredText(response);
            return testCases;
        } catch (error) {
            console.error('Error parsing test cases:', error.message);
            // Return a fallback structure
            return [{
                testCaseId: 'TC001',
                test: 'Generated Test Case',
                expectedResult: response.substring(0, 500),
                type: 'Functional'
            }];
        }
    }

    /**
     * Parse structured text when JSON is not available
     * @param {string} text - Structured text response
     * @returns {Array} - Parsed test cases
     */
    parseStructuredText(text) {
        const testCases = [];

        // Split by separator "---" or multiple newlines
        const blocks = text.split(/\n---+\n|(?:\n\s*\n){2,}/).filter(block => block.trim().length > 0);

        blocks.forEach((block, index) => {
            // Extract TestCaseId with more flexible matching
            const testCaseIdMatch = block.match(/TestCaseId:\s*(TC\d+)/i);
            if (!testCaseIdMatch) {
                return; // Skip if no TestCaseId found
            }

            const testCaseId = testCaseIdMatch[1];

            // Extract Test description - more flexible
            const testMatch = block.match(/Test:\s*(.+?)(?=\nExpected Result:|$)/is);
            const test = testMatch ? testMatch[1].trim().replace(/\n/g, ' ') : '';

            // Extract Expected Result - more flexible
            const expectedResultMatch = block.match(/Expected Result:\s*(.+?)(?=\nType:|$)/is);
            const expectedResult = expectedResultMatch ? expectedResultMatch[1].trim().replace(/\n/g, ' ') : '';

            // Extract Type
            const typeMatch = block.match(/Type:\s*(\w+)/i);
            const type = typeMatch ? typeMatch[1] : 'Functional';

            // Only add if we have the essential fields
            if (testCaseId && test && expectedResult) {
                testCases.push({
                    testCaseId: testCaseId,
                    test: test,
                    expectedResult: expectedResult,
                    type: type
                });
            }
        });

        return testCases;
    }

    /**
     * Extract field from text using regex
     * @param {string} text - Text to search
     * @param {RegExp} pattern - Regex pattern
     * @returns {string|null} - Extracted value
     */
    extractField(text, pattern) {
        const match = text.match(pattern);
        return match ? match[1].trim() : null;
    }

    /**
     * Extract steps from text
     * @param {string} text - Text containing steps
     * @returns {Array} - Parsed steps
     */
    extractSteps(text) {
        const steps = [];
        const stepPattern = /(?:step|action)\s*(\d+)[:.]\s*(.+?)(?:expected[:\s]+(.+?))?(?=(?:step|action)\s*\d+|$)/gis;
        const matches = [...text.matchAll(stepPattern)];

        matches.forEach(match => {
            steps.push({
                stepNumber: parseInt(match[1]),
                action: match[2].trim(),
                expectedResult: match[3]?.trim() || 'Verify action completes successfully'
            });
        });

        if (steps.length === 0) {
            steps.push({
                stepNumber: 1,
                action: 'Execute test scenario',
                expectedResult: 'Test passes successfully'
            });
        }

        return steps;
    }

    /**
     * Check if Ollama is running
     * @returns {Promise<boolean>} - True if Ollama is available
     */
    async checkHealth() {
        try {
            const response = await axios.get(`${this.baseURL}/api/tags`);
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    /**
     * List available models
     * @returns {Promise<Array>} - List of available models
     */
    async listModels() {
        try {
            const response = await axios.get(`${this.baseURL}/api/tags`);
            return response.data.models || [];
        } catch (error) {
            console.error('Error listing models:', error.message);
            return [];
        }
    }
}

module.exports = new OllamaService();
