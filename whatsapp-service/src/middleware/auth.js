/**
 * Service Authentication Middleware
 *
 * Validates the X-Service-Secret header on every incoming request.
 * This ensures only the Laravel backend can communicate with this service.
 */

const crypto = require('crypto');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Express middleware that checks the service secret header.
 */
function verifyServiceSecret(req, res, next) {
    const provided = req.headers['x-service-secret'];

    if (!provided || typeof provided !== 'string') {
        logger.warn(`Unauthorized request from ${req.ip} to ${req.method} ${req.path}`);
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized — invalid or missing service secret',
        });
    }

    const expected = Buffer.from(config.serviceSecret, 'utf8');
    const actual = Buffer.from(provided, 'utf8');

    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
        logger.warn(`Unauthorized request from ${req.ip} to ${req.method} ${req.path}`);
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized — invalid or missing service secret',
        });
    }

    next();
}

module.exports = { verifyServiceSecret };
