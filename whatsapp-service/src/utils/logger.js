/**
 * Logger — Winston-based professional logging
 *
 * Outputs coloured logs to the console and persists everything
 * to rotating log files under ./logs/.
 */

const { createLogger, format, transports } = require('winston');
const path = require('path');
const config = require('../config/env');

const LOG_DIR = path.resolve(__dirname, '../../logs');

const logger = createLogger({
    level: config.logLevel,
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.printf(({ timestamp, level, message, stack }) => {
            const tag = level.toUpperCase().padEnd(5);
            const base = `[${timestamp}] [${tag}] ${message}`;
            return stack ? `${base}\n${stack}` : base;
        })
    ),
    transports: [
        /* Console — coloured output */
        new transports.Console({
            format: format.combine(
                format.colorize({ all: true }),
                format.timestamp({ format: 'HH:mm:ss' }),
                format.printf(({ timestamp, level, message }) => {
                    return `[${timestamp}] ${level} ${message}`;
                })
            ),
        }),

        /* File — combined log */
        new transports.File({
            filename: path.join(LOG_DIR, 'combined.log'),
            maxsize: 5 * 1024 * 1024, // 5 MB
            maxFiles: 3,
        }),

        /* File — errors only */
        new transports.File({
            filename: path.join(LOG_DIR, 'error.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024,
            maxFiles: 3,
        }),
    ],
});

module.exports = logger;
