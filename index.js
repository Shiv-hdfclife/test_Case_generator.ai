require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');

const connectDB = require('./config/database');
const testCaseRoutes = require('./routes/testCaseRoutes');
const { errorHandler, corsConfig } = require('./middlewares');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(cors(corsConfig)); // CORS configuration
app.use(morgan('dev')); // Request logging
app.use(bodyParser.json({ limit: '10mb' })); // Parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api', testCaseRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Test Automation Backend API',
        version: '1.0.0',
        endpoints: {
            health: 'GET /api/health',
            generateTestCases: 'POST /api/generate-testcases',
            getTestCases: 'GET /api/testcases/:ticketKey',
            getAllTestCases: 'GET /api/testcases',
            getHistory: 'GET /api/history',
            updateStatus: 'PATCH /api/testcases/:id/status',
            deleteTestCase: 'DELETE /api/testcases/:id'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   Test Automation Backend Server          ║
║   Port: ${PORT}                              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                ║
║   Time: ${new Date().toLocaleString()}     ║
╚════════════════════════════════════════════╝
  `);
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    // Close server & exit process
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

module.exports = app;
