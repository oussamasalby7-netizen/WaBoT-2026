/**
 * Environment Configuration
 *
 * Loads and validates all required environment variables.
 * Throws immediately on startup if any critical variable is missing,
 * preventing the service from running in an invalid state.
 */

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

function parseWaVersion(value) {
    if (!value) return null;

    const parts = value.split(',').map((part) => Number.parseInt(part.trim(), 10));
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
        console.error(`[FATAL] Invalid WA_WEB_VERSION "${value}". Expected format: 2,3000,1035194821`);
        process.exit(1);
    }

    return parts;
}

const config = {
    port: Number.parseInt(process.env.PORT, 10) || 3001,
    bindHost: process.env.BIND_HOST || '127.0.0.1',
    laravelApiUrl: process.env.LARAVEL_API_URL || 'http://127.0.0.1:8000/api',
    serviceSecret: process.env.SERVICE_SECRET || '',
    sessionDir: path.resolve(__dirname, '../../', process.env.SESSION_DIR || './sessions'),
    logLevel: process.env.LOG_LEVEL || 'info',
    waWebVersion: parseWaVersion(process.env.WA_WEB_VERSION),
    waBrowser: process.env.WA_BROWSER || 'windows',
};

/* ── Validate critical config ─────────────────────────────────────────────── */

const missing = [];

if (!config.serviceSecret) {
    missing.push('SERVICE_SECRET');
}
if (!config.laravelApiUrl) {
    missing.push('LARAVEL_API_URL');
}

if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
    console.error('[FATAL] Please check your .env file. Exiting.');
    process.exit(1);
}

module.exports = config;
