/**
 * Simple rate limiting middleware
 * For production, consider using express-rate-limit package
 */

const requestCounts = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute

const rateLimiter = (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    // Get or create request record
    let record = requestCounts.get(identifier);

    if (!record) {
        record = {
            count: 0,
            resetTime: now + WINDOW_MS
        };
        requestCounts.set(identifier, record);
    }

    // Reset if window has passed
    if (now > record.resetTime) {
        record.count = 0;
        record.resetTime = now + WINDOW_MS;
    }

    // Increment count
    record.count++;

    // Check limit
    if (record.count > MAX_REQUESTS) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);

        res.set('Retry-After', retryAfter);
        return res.status(429).json({
            success: false,
            message: 'Too many requests. Please try again later.',
            retryAfter: retryAfter
        });
    }

    // Set rate limit headers
    res.set({
        'X-RateLimit-Limit': MAX_REQUESTS,
        'X-RateLimit-Remaining': Math.max(0, MAX_REQUESTS - record.count),
        'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
    });

    next();
};

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [identifier, record] of requestCounts.entries()) {
        if (now > record.resetTime + WINDOW_MS) {
            requestCounts.delete(identifier);
        }
    }
}, 5 * 60 * 1000);

module.exports = rateLimiter;
