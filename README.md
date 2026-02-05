# Test Automation Backend

AI-powered test case generation system using JIRA API and DeepSeek models via Ollama.

## Features

- 🎯 Fetch JIRA tickets via REST API
- 🤖 Generate test cases using DeepSeek Coder V2 Lite
- 🧠 Advanced analysis using DeepSeek R1 8B (optional)
- 💾 MongoDB storage for test cases and history
- 📊 Generation history tracking
- 🔒 Rate limiting and security middleware
- ⚡ RESTful API design

## Architecture

```
Backend/
├── config/           # Database and configuration
├── controllers/      # Request handlers
├── middlewares/      # Express middlewares
├── models/          # MongoDB schemas
├── routes/          # API routes
├── services/        # Business logic (JIRA, Ollama)
└── index.js         # Entry point
```

## Prerequisites

1. **Node.js** (v16 or higher)
2. **MongoDB** (v5 or higher)
3. **Ollama** with DeepSeek models installed
4. **JIRA** account with API access

## Installation

### 1. Install Dependencies

```bash
cd Backend
npm install
```

### 2. Install and Setup Ollama

```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama service
ollama serve

# Pull DeepSeek models
ollama pull deepseek-coder-v2:lite
ollama pull deepseek-r1:8b
```

### 3. Setup MongoDB

```bash
# Install MongoDB (macOS)
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community
```

### 4. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Required environment variables:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/test_automation

# JIRA
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_api_token

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL_CODER=deepseek-coder-v2:lite
OLLAMA_MODEL_REASONING=deepseek-r1:8b

# Frontend
FRONTEND_URL=http://localhost:3000
```

### 5. Get JIRA API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Copy and paste into `.env`

## Usage

### Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Server will start on `http://localhost:5000`

### API Endpoints

#### 1. Generate Test Cases

```bash
POST /api/generate-testcases
Content-Type: application/json

{
  "jiraTicketKey": "PROJ-123",
  "model": "deepseek-coder-v2:lite",
  "useReasoning": false
}
```

**Response:**

```json
{
  "success": true,
  "message": "Test cases generated successfully",
  "data": {
    "jiraTicket": {
      "key": "PROJ-123",
      "summary": "Implement user login",
      "issueType": "Story",
      "priority": "High"
    },
    "testCases": [
      {
        "testCaseId": "TC001",
        "title": "Verify successful login with valid credentials",
        "description": "Test that user can login with correct username and password",
        "preconditions": "User account exists in database",
        "steps": [
          {
            "stepNumber": 1,
            "action": "Navigate to login page",
            "expectedResult": "Login form is displayed"
          },
          {
            "stepNumber": 2,
            "action": "Enter valid username and password",
            "expectedResult": "Credentials accepted"
          },
          {
            "stepNumber": 3,
            "action": "Click login button",
            "expectedResult": "User redirected to dashboard"
          }
        ],
        "priority": "High",
        "type": "Functional"
      }
    ],
    "metadata": {
      "modelUsed": "deepseek-coder-v2:lite",
      "generationTime": 3500,
      "testCaseCount": 8,
      "documentId": "507f1f77bcf86cd799439011"
    }
  }
}
```

#### 2. Get Test Cases by Ticket

```bash
GET /api/testcases/PROJ-123
```

#### 3. Get All Test Cases (Paginated)

```bash
GET /api/testcases?page=1&limit=10
```

#### 4. Get Generation History

```bash
GET /api/history?page=1&limit=20
```

#### 5. Update Test Case Status

```bash
PATCH /api/testcases/:id/status
Content-Type: application/json

{
  "status": "approved"
}
```

Statuses: `generated`, `reviewed`, `approved`, `exported`

#### 6. Delete Test Case

```bash
DELETE /api/testcases/:id
```

#### 7. Health Check

```bash
GET /api/health
```

**Response:**

```json
{
  "success": true,
  "services": {
    "api": "operational",
    "database": "operational",
    "ollama": "operational",
    "jira": "configured"
  },
  "availableModels": [
    "deepseek-coder-v2:lite",
    "deepseek-r1:8b"
  ],
  "timestamp": "2026-02-04T10:30:00.000Z"
}
```

## Integration with Frontend

### Frontend API Call Example

```typescript
// Frontend: app/api/generate.ts
export async function generateTestCases(jiraTicketKey: string) {
  const response = await fetch('http://localhost:5000/api/generate-testcases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jiraTicketKey,
      useReasoning: false
    })
  });

  if (!response.ok) {
    throw new Error('Failed to generate test cases');
  }

  return response.json();
}
```

## Data Flow

```
Frontend (Next.js)
    │
    │ POST /api/generate-testcases
    │ { jiraTicketKey: "PROJ-123" }
    ▼
Backend (Express) - Controller
    │
    ├─▶ JIRA Service
    │   └─▶ Fetch ticket data
    │       └─▶ Normalize JSON
    │
    ├─▶ Ollama Service
    │   └─▶ Generate test cases
    │       └─▶ Parse response
    │
    └─▶ MongoDB
        └─▶ Save test cases
        └─▶ Save history
    ▼
Response JSON
    │
    ▼
Frontend renders test cases
```

## Database Models

### TestCase Schema

```javascript
{
  jiraTicketKey: String,
  projectKey: String,
  summary: String,
  description: String,
  testCases: [{
    testCaseId: String,
    title: String,
    description: String,
    preconditions: String,
    steps: [{ stepNumber, action, expectedResult }],
    priority: String,
    type: String
  }],
  modelUsed: String,
  generationTime: Number,
  status: String,
  timestamps: true
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

## Rate Limiting

- Default: 10 requests per minute per IP
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Security

- Helmet.js for security headers
- CORS configured for frontend origin
- Request validation middleware
- MongoDB injection protection
- Rate limiting

## Testing Ollama Connection

```bash
# Test DeepSeek Coder
curl http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-coder-v2:lite",
    "prompt": "Generate a simple test case for login",
    "stream": false
  }'
```

## Troubleshooting

### Ollama not responding

```bash
# Check if Ollama is running
ps aux | grep ollama

# Restart Ollama
ollama serve
```

### MongoDB connection error

```bash
# Check MongoDB status
brew services list

# Restart MongoDB
brew services restart mongodb-community
```

### JIRA authentication error

- Verify API token is correct
- Check JIRA base URL format
- Ensure email matches JIRA account

## Performance Tips

1. **Ollama**: Models stay in memory after first use (faster subsequent calls)
2. **MongoDB**: Indexes created automatically for common queries
3. **Rate Limiting**: Adjust `MAX_REQUESTS` in middleware for your needs
4. **Caching**: Consider adding Redis for frequently accessed JIRA tickets

## Next Steps

1. Add authentication (JWT)
2. Implement webhooks for JIRA updates
3. Add batch processing for multiple tickets
4. Export test cases to JIRA/Excel
5. Add more sophisticated prompts
6. Implement test case templates

## Support

For issues or questions, check:
- Ollama docs: https://ollama.ai
- JIRA API: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
- MongoDB docs: https://docs.mongodb.com

## License

ISC
