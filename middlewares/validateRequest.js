/**
 * Request validation middleware
 */
const validateRequest = (req, res, next) => {
    // Validate content type for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.headers['content-type'];

        if (!contentType || !contentType.includes('application/json')) {
            return res.status(400).json({
                success: false,
                message: 'Content-Type must be application/json'
            });
        }
    }

    // Validate body exists for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.body) {
        return res.status(400).json({
            success: false,
            message: 'Request body is required'
        });
    }

    next();
};

module.exports = validateRequest;
