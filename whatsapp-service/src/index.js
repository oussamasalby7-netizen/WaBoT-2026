/**
 * WaBoT WhatsApp Service — Entry Point v3 (Multi-tenant)
 *
 * The service now manages one Baileys session per SaaS user.
 * No sessions are started at boot — each user's session is triggered
 * on demand when they visit the Settings page (via POST /sessions/:userId/start).
 */

const express = require('express');
const config = require('./config/env');
const logger = require('./utils/logger');
const { router: apiRouter } = require('./routes/api');

/* ── Express Setup ────────────────────────────────────────────────────────── */

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

/* Public health check */
app.get('/health', (_req, res) => {
    res.json({
        service: 'wabot-whatsapp-service',
        version: '3.0-multi-tenant',
        uptime: Math.floor(process.uptime()),
    });
});

app.use('/', apiRouter);

/* 404 */
app.use((_req, res) => {
    res.status(404).json({ status: 'error', message: 'Endpoint not found' });
});

/* Global error handler */
app.use((err, _req, res, _next) => {
    logger.error(`Express error: ${err.message}`);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
});

/* ── Bootstrap ────────────────────────────────────────────────────────────── */

async function bootstrap() {
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('  WaBoT WhatsApp Service v3 — Multi-tenant');
    logger.info('  One Baileys session per SaaS user');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`  Port:        ${config.port}`);
    logger.info(`  Laravel API: ${config.laravelApiUrl}`);
    logger.info(`  Sessions:    ${config.sessionDir}`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const server = app.listen(config.port, config.bindHost, () => {
        logger.info(`HTTP server ready on ${config.bindHost}:${config.port}`);
        logger.info('Waiting for user sessions to be started via API...');
    });

    server.timeout = 120000;
}

/* ── Safety nets ──────────────────────────────────────────────────────────── */

process.on('uncaughtException', (err) => {
    logger.error(`[UNCAUGHT] ${err.message}\n${err.stack ?? ''}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.error(`[UNHANDLED REJECTION] ${reason instanceof Error ? reason.message : reason}`);
});

process.on('SIGINT', () => { logger.info('SIGINT — exiting'); process.exit(0); });
process.on('SIGTERM', () => { logger.info('SIGTERM — exiting'); process.exit(0); });

if (process.platform === 'win32') {
    process.on('SIGBREAK', () => { logger.info('SIGBREAK — exiting'); process.exit(0); });
}

bootstrap().catch((err) => {
    logger.error(`Bootstrap failed: ${err.message}`);
    process.exit(1);
});
