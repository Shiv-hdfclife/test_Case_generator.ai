const axios = require('axios');

class JiraService {
    constructor() {
        this.baseURL = process.env.JIRA_BASE_URL;
        this.email = process.env.JIRA_EMAIL;
        this.apiToken = process.env.JIRA_API_TOKEN;

        // Create axios instance with auth
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Basic ${Buffer.from(`${this.email}:${this.apiToken}`).toString('base64')}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Fetch JIRA ticket by key
     * @param {string} ticketKey - JIRA ticket key (e.g., PROJ-123)
     * @returns {Promise<Object>} - JIRA ticket data
     */
    async fetchTicket(ticketKey) {
        try {
            const response = await this.client.get(`/rest/api/3/issue/${ticketKey}`, {
                params: {
                    fields: 'summary,description,subtasks,issuelinks,status,comment,filechange'
                }
            });
            console.log("Jira Data:", response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching JIRA ticket:', error.message);
            throw new Error(`Failed to fetch JIRA ticket ${ticketKey}: ${error.response?.data?.errorMessages || error.message}`);
        }
    }

    /**
     * Normalize JIRA data for LLM consumption
     * @param {Object} jiraData - Raw JIRA ticket data
     * @returns {Object} - Cleaned and normalized data
     */
    normalizeTicketData(jiraData) {
        console.log("before normalization of  data:", jiraData);
        console.log("description:", jiraData.fields.description.content)
        const fields = jiraData.fields || {};

        return {
            ticketKey: jiraData.key,
            ticketId: jiraData.id,
            summary: fields.summary || '',
            description: this.extractDescription(fields.description),
            issueType: fields.issuetype?.name || '',
            status: fields.status?.name || '',
        };
    }

    /**
     * Extract description text from JIRA's ADF (Atlassian Document Format)
     * @param {Object} description - JIRA description object
     * @returns {string} - Plain text description
     */
    extractDescription(description) {
        if (!description) return '';

        if (typeof description === 'string') {
            return description;
        }

        // Handle ADF format
        if (description.content) {
            return this.parseADF(description.content);
        }
        console.log("description:", JSON.stringify(description))

        return JSON.stringify(description);
    }

    /**
     * Parse Atlassian Document Format to plain text
     * @param {Array} content - ADF content array
     * @returns {string} - Plain text
     */
    parseADF(content) {
        if (!Array.isArray(content)) return '';

        let text = '';

        for (const node of content) {
            if (node.type === 'paragraph' && node.content) {
                for (const inline of node.content) {
                    if (inline.text) {
                        text += inline.text;
                    }
                }
                text += '\n';
            } else if (node.type === 'bulletList' || node.type === 'orderedList') {
                text += this.parseADF(node.content);
            } else if (node.type === 'listItem' && node.content) {
                text += '- ' + this.parseADF(node.content);
            } else if (node.type === 'heading' && node.content) {
                for (const inline of node.content) {
                    if (inline.text) {
                        text += inline.text + '\n';
                    }
                }
            }
        }

        return text.trim();
    }
}

module.exports = new JiraService();
