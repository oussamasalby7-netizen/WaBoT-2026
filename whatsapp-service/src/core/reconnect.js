/**
 * Reconnection Manager — v2
 *
 * Corrected handling of ALL Baileys disconnect reason codes,
 * including code 405 (notSupported) which was causing the infinite
 * reconnect loop on Windows.
 */

const { DisconnectReason } = require('@whiskeysockets/baileys');
const logger = require('../utils/logger');

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 3000;

let retryCount = 0;

/*
 * Full map of Baileys disconnect reason codes for reference.
 * Source: @whiskeysockets/baileys/lib/Defaults/baileys-version.js
 *
 *  401 = loggedOut
 *  405 = notSupported   ← WhatsApp rejected our client config
 *  408 = timedOut / connectionLost
 *  411 = multideviceMismatch
 *  428 = connectionClosed
 *  440 = connectionReplaced
 *  500 = badSession
 *  515 = restartRequired
 */

/**
 * Evaluate the disconnect reason and decide the recovery strategy.
 *
 * @param {number|undefined} statusCode  Baileys DisconnectReason code
 * @returns {{ shouldReconnect: boolean, clearSession: boolean, reason: string }}
 */
function evaluateDisconnect(statusCode) {
    switch (statusCode) {

        /* ── Fatal: logged out by the user ──────────────────────────────── */
        case DisconnectReason.loggedOut:
            return {
                shouldReconnect: true,
                clearSession: true,
                reason: 'Logged out by user — clearing session, new QR will be shown',
            };

        /* ── Fatal: corrupted session file ──────────────────────────────── */
        case DisconnectReason.badSession:
            return {
                shouldReconnect: true,
                clearSession: true,
                reason: 'Bad session file detected — clearing and starting fresh',
            };

        /* ── Fatal: client version not supported (code 405) ─────────────── */
        case DisconnectReason.notSupported:
            return {
                shouldReconnect: true,
                clearSession: true,
                reason: 'Client version not supported (405) — clearing session, new QR required',
            };

        /* ── Fatal: another device took over the session ─────────────────── */
        case DisconnectReason.connectionReplaced:
            return {
                shouldReconnect: false,
                clearSession: false,
                reason: 'Session replaced by another device — restart service to reconnect',
            };

        /* ── Recoverable: network/server issues ─────────────────────────── */
        case DisconnectReason.connectionClosed:
        case DisconnectReason.connectionLost:
        case DisconnectReason.timedOut:
            return {
                shouldReconnect: true,
                clearSession: false,
                reason: `Network issue (code ${statusCode}) — reconnecting`,
            };

        /* ── Recoverable: server requested restart ───────────────────────── */
        case DisconnectReason.restartRequired:
            return {
                shouldReconnect: true,
                clearSession: false,
                reason: 'Server requested restart — reconnecting immediately',
            };

        /* ── Recoverable: multi-device token mismatch ────────────────────── */
        case DisconnectReason.multideviceMismatch:
            return {
                shouldReconnect: true,
                clearSession: true,
                reason: 'Multi-device mismatch — clearing session, rescan QR',
            };

        /* ── Unknown: cautious reconnect ─────────────────────────────────── */
        default:
            return {
                shouldReconnect: true,
                clearSession: statusCode >= 400 && statusCode < 500,
                reason: `Unknown disconnect code ${statusCode ?? 'undefined'} — cautious reconnect`,
            };
    }
}

/**
 * Calculate the next retry delay using exponential backoff with jitter.
 *
 * @returns {{ delay: number, attempt: number, maxReached: boolean }}
 */
function getRetryDelay() {
    retryCount += 1;

    if (retryCount > MAX_RETRIES) {
        return { delay: 0, attempt: retryCount, maxReached: true };
    }

    /* Exponential: 3s → 6s → 12s → 24s → 48s, capped at 60s */
    const exponential = Math.min(BASE_DELAY_MS * Math.pow(2, retryCount - 1), 60000);
    const jitter = exponential * (0.85 + Math.random() * 0.3);
    const delay = Math.round(jitter);

    logger.info(`Reconnect attempt ${retryCount}/${MAX_RETRIES} in ${(delay / 1000).toFixed(1)}s`);

    return { delay, attempt: retryCount, maxReached: false };
}

/**
 * Reset the retry counter after a successful connection.
 */
function resetRetries() {
    if (retryCount > 0) {
        logger.info(`Connection stable — retry counter reset (was ${retryCount})`);
    }
    retryCount = 0;
}

/**
 * Get the current retry count (for logging/status).
 */
function getRetryCount() {
    return retryCount;
}

module.exports = {
    evaluateDisconnect,
    getRetryDelay,
    resetRetries,
    getRetryCount,
};
