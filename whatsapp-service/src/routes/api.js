/**
 * API Routes — Multi-tenant v2
 *
 * All per-user WhatsApp endpoints include :userId in the URL.
 *
 *  GET  /sessions/:userId/status       — Connection status
 *  GET  /sessions/:userId/qr           — QR code as base64 PNG
 *  POST /sessions/:userId/start        — Ensure session is started
 *  POST /sessions/:userId/disconnect   — Disconnect & clear session
 *  POST /send                          — Send a message (body: { userId, to, message })
 *
 * All routes protected by X-Service-Secret header.
 */

const express = require('express');
const { verifyServiceSecret } = require('../middleware/auth');
const sessionManager = require('../core/sessionManager');
const logger = require('../utils/logger');
const { assertValidUserId } = require('../utils/userId');

const router = express.Router();

function requireValidUserIdParam(req, res, next) {
    try {
        req.params.userId = assertValidUserId(req.params.userId);
        next();
    } catch {
        return res.status(400).json({ status: 'error', message: 'Invalid user ID' });
    }
}

/* ── Per-user session routes ───────────────────────────────────────────────── */

/**
 * GET /sessions/:userId/status
 * Returns the connection state for a specific user.
 */
router.get('/sessions/:userId/status', verifyServiceSecret, requireValidUserIdParam, (req, res) => {
    const { userId } = req.params;
    const state = sessionManager.getState(userId);

    res.json({
        status: 'success',
        data: {
            connected:   state.connected,
            phoneNumber: state.phoneNumber,
            hasQr:       !!state.qr,
            isConnecting: state.isConnecting,
            retryCount:   state.retryCount || 0,
            lastError:    state.lastError || null,
        },
    });
});

/**
 * GET /sessions/:userId/qr
 * Returns the current QR code as a base64 PNG data URI.
 */
router.get('/sessions/:userId/qr', verifyServiceSecret, requireValidUserIdParam, async (req, res) => {
    const { userId } = req.params;
    const state = sessionManager.getState(userId);

    if (state.connected) {
        return res.json({
            status: 'success',
            data: { qr: null, connected: true, phoneNumber: state.phoneNumber },
        });
    }

    try {
        const qrDataUri = await sessionManager.getQrDataUri(userId);

        return res.json({
            status: 'success',
            data: {
                qr: qrDataUri,
                connected: false,
                isConnecting: state.isConnecting,
            },
        });
    } catch (err) {
        logger.error(`QR generation error for user ${userId}: ${err.message}`);
        return res.status(500).json({ status: 'error', message: 'QR generation failed' });
    }
});

/**
 * POST /sessions/:userId/start
 * Trigger session start for a user (idempotent — safe to call multiple times).
 */
router.post('/sessions/:userId/start', verifyServiceSecret, requireValidUserIdParam, async (req, res) => {
    const { userId } = req.params;
    const state = sessionManager.getState(userId);

    if (state.isConnecting || state.connected) {
        return res.json({ status: 'success', message: 'Session already active or connecting' });
    }

    /* Non-blocking — session starts in background */
    sessionManager.startSession(userId).catch((err) => {
        logger.error(`Session start error for user ${userId}: ${err.message}`);
    });

    res.json({ status: 'success', message: `Session starting for user ${userId}` });
});

/**
 * POST /sessions/:userId/disconnect
 * Disconnect a user's WhatsApp and clear their session files.
 */
router.post('/sessions/:userId/disconnect', verifyServiceSecret, requireValidUserIdParam, (req, res) => {
    const { userId } = req.params;
    sessionManager.requestDisconnect(userId);
    res.json({ status: 'success', message: `Disconnect requested for user ${userId}` });
});

/* ── Global send route ─────────────────────────────────────────────────────── */

/**
 * POST /send
 * Send a WhatsApp message via a user's session.
 *
 * Body: { userId: "42", to: "212612345678", message: "Hello!" }
 */
router.post('/send', verifyServiceSecret, async (req, res) => {
    const { userId, to, message } = req.body;

    if (!userId || !to || !message) {
        return res.status(400).json({
            status: 'error',
            message: 'Missing required fields: userId, to, message',
        });
    }

    let safeUserId;
    try {
        safeUserId = assertValidUserId(userId);
    } catch {
        return res.status(400).json({ status: 'error', message: 'Invalid user ID' });
    }

    const state = sessionManager.getState(safeUserId);

    if (!state.connected) {
        return res.status(503).json({
            status: 'error',
            message: `WhatsApp not connected for user ${userId} — scan QR code first`,
        });
    }

    const result = await sessionManager.sendMessage(safeUserId, to, message);

    if (result.success) {
        return res.json({
            status: 'success',
            message: 'Message sent',
            data: { messageId: result.messageId },
        });
    }

    return res.status(500).json({ status: 'error', message: 'Send failed' });
});

/* ── Health ─────────────────────────────────────────────────────────────────── */

router.get('/sessions', verifyServiceSecret, (req, res) => {
    const all = sessionManager.listSessions().map((userId) => ({
        userId,
        ...sessionManager.getState(userId),
        sock: undefined, // don't leak socket object
    }));
    res.json({ status: 'success', data: all });
});

module.exports = { router };
