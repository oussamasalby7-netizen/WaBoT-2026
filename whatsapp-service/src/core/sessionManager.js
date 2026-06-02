/**
 * Session Manager — Multi-tenant WhatsApp Sessions
 *
 * Manages one Baileys socket per SaaS user (user_id).
 * Each session has its own:
 *   - Auth credentials stored in ./sessions/{userId}/
 *   - Connection state (connected, qr, phoneNumber)
 *   - Independent reconnect logic
 *
 * Usage:
 *   const mgr = require('./sessionManager');
 *   await mgr.startSession('42');
 *   const state = mgr.getState('42');
 *   await mgr.sendMessage('42', '+212600000000', 'Hello');
 */

const path = require('path');
const fs = require('fs');
const {
    default: makeWASocket,
    Browsers,
    fetchLatestBaileysVersion,
    useMultiFileAuthState,
    DisconnectReason,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');

const config = require('../config/env');
const laravel = require('../services/laravel');
const logger = require('../utils/logger');
const { fromJid, isGroupJid, toJid, sleep, randomDelay } = require('../utils/helpers');
const { assertValidUserId } = require('../utils/userId');

/* ── Types ────────────────────────────────────────────────────────────────── */

/**
 * @typedef {Object} SessionState
 * @property {boolean}      connected
 * @property {string|null}  qr             Raw QR string from Baileys
 * @property {string|null}  phoneNumber    Connected phone number
 * @property {boolean}      isConnecting   Guard against overlapping starts
 * @property {boolean}      disconnectRequested  Manual disconnect flag
 * @property {number}       retryCount
 * @property {Object|null}  sock           Live Baileys socket
 */

/* ── Constants ────────────────────────────────────────────────────────────── */

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 3000;
const SILENT_LOGGER = pino({ level: 'silent' });

/* ── Internal registry ────────────────────────────────────────────────────── */

/** @type {Map<string, SessionState>} */
const sessions = new Map();

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/**
 * Return the filesystem path for a user's session directory.
 *
 * @param {string} userId
 * @returns {string}
 */
function sessionPath(userId) {
    const safeId = assertValidUserId(userId);
    const base = path.resolve(config.sessionDir);
    const target = path.resolve(base, safeId);
    if (target !== base && !target.startsWith(base + path.sep)) {
        throw new Error('Invalid user ID path');
    }
    return target;
}

/**
 * Create or retrieve the state object for a user.
 *
 * @param {string} userId
 * @returns {SessionState}
 */
function ensureState(userId) {
    if (!sessions.has(userId)) {
        sessions.set(userId, {
            connected: false,
            qr: null,
            phoneNumber: null,
            isConnecting: false,
            disconnectRequested: false,
            retryCount: 0,
            lastError: null,
            sock: null,
        });
    }
    return sessions.get(userId);
}

async function resolveWaVersion(userId) {
    if (config.waWebVersion) {
        logger.info(`[User ${userId}] Using pinned WhatsApp Web version ${config.waWebVersion.join('.')}`);
        return config.waWebVersion;
    }

    const { version, isLatest, error } = await fetchLatestBaileysVersion();
    if (error) {
        logger.warn(`[User ${userId}] Could not fetch latest WhatsApp Web version: ${error.message}; using bundled ${version.join('.')}`);
    } else {
        logger.info(`[User ${userId}] Using WhatsApp Web version ${version.join('.')} (latest: ${isLatest})`);
    }

    return version;
}

function resolveBrowser() {
    switch (String(config.waBrowser).toLowerCase()) {
        case 'ubuntu':
            return Browsers.ubuntu('Chrome');
        case 'macos':
        case 'mac':
            return Browsers.macOS('Chrome');
        case 'baileys':
            return Browsers.baileys('Desktop');
        case 'windows':
        default:
            return Browsers.windows('Chrome');
    }
}

/**
 * Cleanly tear down a socket for a given user before rebuilding it.
 *
 * @param {string} userId
 */
async function destroySock(userId) {
    const state = sessions.get(userId);
    if (!state?.sock) return;

    try {
        state.sock.ev.removeAllListeners();
        /*
         * IMPORTANT: Do NOT call sock.logout() here.
         * logout() sends a logout signal to WhatsApp servers, which invalidates
         * the session and forces a new QR scan. We only want to close the
         * local socket connection, keeping the session files intact so we can
         * resume without scanning again.
         */
        state.sock.end(undefined);
    } catch { /* already dead */ } finally {
        state.sock = null;
    }
}

/**
 * Decide the recovery strategy from a Baileys disconnect reason code.
 *
 * @param {number|undefined} code
 * @returns {{ shouldReconnect: boolean, clearSession: boolean, reason: string }}
 */
function evalDisconnect(code) {
    switch (code) {
        case DisconnectReason.loggedOut:
            return { shouldReconnect: true,  clearSession: true,  reason: 'Logged out — new QR required' };
        case DisconnectReason.badSession:
            return { shouldReconnect: true,  clearSession: true,  reason: 'Bad session — clearing and restarting' };
        case DisconnectReason.notSupported:
            return { shouldReconnect: true,  clearSession: true,  reason: 'Client version rejected (405) — resetting' };
        case DisconnectReason.connectionReplaced:
            return { shouldReconnect: false, clearSession: false, reason: 'Session replaced by another device' };
        case DisconnectReason.restartRequired:
            return { shouldReconnect: true,  clearSession: false, reason: 'Server requested restart' };
        case DisconnectReason.multideviceMismatch:
            return { shouldReconnect: true,  clearSession: true,  reason: 'Multi-device mismatch — resetting' };
        default:
            return {
                shouldReconnect: true,
                /* Only clear on explicit 4xx codes — NOT on network drops */
                clearSession: typeof code === 'number' && code >= 400 && code < 500 && code !== 408,
                reason: `Disconnect code ${code ?? 'N/A'}`,
            };
    }
}

/* ── Core: per-user session lifecycle ────────────────────────────────────── */

/**
 * Start (or restart) the WhatsApp session for a given user.
 *
 * @param {string} userId
 */
async function startSession(userId) {
    const state = ensureState(userId);

    if (state.isConnecting) {
        logger.warn(`[User ${userId}] startSession called while already connecting — skipping`);
        return;
    }

    state.isConnecting = true;

    try {
        await destroySock(userId);

        /* Fetch current WA Web version, or use a pinned version when offline. */
        const version = await resolveWaVersion(userId);

        /* Load or create per-user auth state */
        const sessDir = sessionPath(userId);
        if (!fs.existsSync(sessDir)) {
            fs.mkdirSync(sessDir, { recursive: true });
            logger.info(`[User ${userId}] Session directory created`);
        }

        const { state: authState, saveCreds } = await useMultiFileAuthState(sessDir);
        const isResuming = fs.existsSync(path.join(sessDir, 'creds.json'));
        logger.info(`[User ${userId}] ${isResuming ? 'Resuming existing session' : 'Starting fresh — QR will appear'}`);
        state.lastError = null;

        /* Create Baileys socket */
        const sock = makeWASocket({
            version,
            auth: authState,
            logger: SILENT_LOGGER,
            browser: resolveBrowser(),
            keepAliveIntervalMs: 25000,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            qrTimeout: 90000,
            syncFullHistory: false,
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: false,
            printQRInTerminal: false,
            getMessage: async () => ({ conversation: '' }),
        });

        state.sock = sock;

        /* Persist credentials on every update */
        sock.ev.on('creds.update', saveCreds);

        /* Connection state changes */
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                state.qr = qr;
                state.connected = false;
                state.phoneNumber = null;
                state.lastError = null;
                logger.info(`[User ${userId}] QR code ready — waiting for scan`);
                qrcodeTerminal.generate(qr, { small: true });
            }

            if (connection === 'open') {
                const jid = sock.user?.id ?? '';
                const number = jid.replace(/:.*@.*$/, '').replace('@s.whatsapp.net', '');
                state.connected = true;
                state.qr = null;
                state.phoneNumber = number || null;
                state.retryCount = 0;
                state.isConnecting = false;
                state.lastError = null;
                logger.info(`[User ${userId}] WhatsApp CONNECTED (+${number})`);
            }

            if (connection === 'close') {
                state.connected = false;
                state.phoneNumber = null;
                state.isConnecting = false;

                if (state.disconnectRequested) {
                    state.disconnectRequested = false;
                    logger.info(`[User ${userId}] Manual disconnect — clearing session`);
                    clearUserSession(userId);
                    setTimeout(() => startSession(userId), 3000);
                    return;
                }

                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const { shouldReconnect, clearSession: shouldClear, reason } = evalDisconnect(statusCode);

                logger.warn(`[User ${userId}] Disconnected: ${reason}`);
                state.lastError = reason;

                if (!shouldReconnect) {
                    logger.error(`[User ${userId}] Fatal disconnect — manual restart required`);
                    return;
                }

                if (shouldClear) clearUserSession(userId);

                state.retryCount += 1;

                if (state.retryCount > MAX_RETRIES) {
                    logger.error(`[User ${userId}] Max retries reached — clearing session and doing final attempt`);
                    clearUserSession(userId);
                    state.retryCount = 0;
                    setTimeout(() => startSession(userId), 10000);
                    return;
                }

                const expDelay = Math.min(BASE_DELAY_MS * Math.pow(2, state.retryCount - 1), 60000);
                const delay = Math.round(expDelay * (0.85 + Math.random() * 0.3));
                logger.info(`[User ${userId}] Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${state.retryCount}/${MAX_RETRIES})`);
                setTimeout(() => startSession(userId), delay);
            }
        });

        /* Incoming messages */
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;

            for (const msg of messages) {
                try {
                    await handleMessage(userId, msg, sock.user?.id);
                } catch (err) {
                    logger.error(`[User ${userId}] Message handling error: ${err.message}`);
                }
            }
        });

    } catch (err) {
        state.isConnecting = false;
        logger.error(`[User ${userId}] startSession threw: ${err.message}`);
        setTimeout(() => startSession(userId), 5000);
    }
}

/**
 * Handle a single incoming message for a given user session.
 *
 * @param {string} userId
 * @param {Object} msg
 * @param {string} ownJid
 */
async function handleMessage(userId, msg, ownJid) {
    const remoteJid = msg.key?.remoteJid;

    if (!remoteJid) return;
    if (isGroupJid(remoteJid)) return;
    if (msg.key?.fromMe) return;
    if (remoteJid === 'status@broadcast') return;
    if (msg.message?.protocolMessage || msg.message?.reactionMessage) return;

    const text = extractText(msg);
    if (!text) return;

    const fromNumber = fromJid(remoteJid); // cleaned phone number for DB/logs
    const pushName   = msg.pushName || 'Unknown';
    const messageId  = msg.key?.id || '';

    logger.info(`[User ${userId}] Message from ${pushName} (${fromNumber}): "${text.substring(0, 80)}"`);

    /* Forward to Laravel — AI generates reply and saves it to DB */
    const { reply } = await laravel.forwardMessage({
        from: fromNumber,
        body: text,
        pushName,
        messageId,
        userId,
    });

    const textToSend = reply || 'Merci pour votre message ! Un agent vous répondra très bientôt. 🙏';

    /* ── Send reply — use remoteJid DIRECTLY (exact Baileys JID) ──────────
     *
     * IMPORTANT: Do NOT convert remoteJid through fromJid()+toJid().
     * Baileys multi-device JIDs can look like:
     *   "212600000000:0@s.whatsapp.net"  (device-indexed)
     *   "212600000000@s.whatsapp.net"    (standard)
     * Using the original remoteJid guarantees delivery to the correct device.
     */
    const state = sessions.get(String(userId));

    if (!state?.sock || !state.connected) {
        logger.warn(`[User ${userId}] Cannot reply to ${fromNumber} — session not connected, retrying in 5s`);
        await sleep(5000);
    }

    const stateAfterWait = sessions.get(String(userId));
    if (!stateAfterWait?.sock || !stateAfterWait.connected) {
        logger.error(`[User ${userId}] Session still not connected after wait — reply dropped`);
        return;
    }

    try {
        await stateAfterWait.sock.presenceSubscribe(remoteJid).catch(() => {});
        await sleep(300);
        await stateAfterWait.sock.sendPresenceUpdate('composing', remoteJid).catch(() => {});
        await sleep(Math.min(randomDelay(600, 1200), textToSend.length * 20));
        await stateAfterWait.sock.sendPresenceUpdate('paused', remoteJid).catch(() => {});
        await sleep(100);

        const sent = await stateAfterWait.sock.sendMessage(remoteJid, { text: textToSend });
        logger.info(`[User ${userId}] Reply sent to ${fromNumber} | id: ${sent?.key?.id}`);
    } catch (err) {
        logger.error(`[User ${userId}] Failed to send reply to ${fromNumber}: ${err.message}`);
    }
}

/**
 * Extract text from a Baileys message object.
 *
 * @param {Object} msg
 * @returns {string|null}
 */
function extractText(msg) {
    const m = msg.message;
    if (!m) return null;
    return (
        m.conversation ||
        m.extendedTextMessage?.text ||
        m.imageMessage?.caption ||
        m.videoMessage?.caption ||
        m.documentMessage?.caption ||
        null
    );
}

/* ── Public API ───────────────────────────────────────────────────────────── */

/**
 * Get the current state of a user's session.
 *
 * @param {string} userId
 * @returns {SessionState}
 */
function getState(userId) {
    return sessions.get(String(userId)) ?? {
        connected: false,
        qr: null,
        phoneNumber: null,
        isConnecting: false,
        retryCount: 0,
        lastError: null,
    };
}

/**
 * Get the QR code for a user as a base64 PNG data URI.
 *
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
async function getQrDataUri(userId) {
    const state = getState(userId);
    if (!state.qr) return null;

    return await QRCode.toDataURL(state.qr, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
    });
}

/**
 * Send a WhatsApp message on behalf of a user session.
 *
 * @param {string} userId
 * @param {string} to
 * @param {string} text
 * @returns {Promise<{ success: boolean, messageId: string|null }>}
 */
async function sendMessage(userId, to, text) {
    const state = sessions.get(String(userId));

    if (!state?.sock || !state.connected) {
        logger.warn(`[User ${userId}] Cannot send — not connected`);
        return { success: false, messageId: null };
    }

    const jid = toJid(to);

    try {
        await state.sock.presenceSubscribe(jid).catch(() => {});
        await sleep(300);
        await state.sock.sendPresenceUpdate('composing', jid).catch(() => {});
        await sleep(Math.min(randomDelay(600, 1400), text.length * 25));
        await state.sock.sendPresenceUpdate('paused', jid).catch(() => {});
        await sleep(150);

        const result = await state.sock.sendMessage(jid, { text });
        const messageId = result?.key?.id ?? null;
        logger.info(`[User ${userId}] Sent to ${to} | id: ${messageId}`);
        return { success: true, messageId };

    } catch (err) {
        logger.error(`[User ${userId}] Send failed to ${to}: ${err.message}`);
        return { success: false, messageId: null };
    }
}

/**
 * Disconnect and wipe a user's session (they'll need to rescan QR).
 *
 * @param {string} userId
 */
function requestDisconnect(userId) {
    const state = sessions.get(String(userId));
    if (state) {
        state.disconnectRequested = true;
        logger.info(`[User ${userId}] Disconnect requested`);
    }
}

/**
 * Delete the saved session files for a user (without touching the socket).
 *
 * @param {string} userId
 */
function clearUserSession(userId) {
    const dir = sessionPath(String(userId));
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`[User ${userId}] Session files cleared`);
    }
}

/**
 * List all active session IDs.
 *
 * @returns {string[]}
 */
function listSessions() {
    return Array.from(sessions.keys());
}

module.exports = {
    startSession,
    getState,
    getQrDataUri,
    sendMessage,
    requestDisconnect,
    clearUserSession,
    listSessions,
};
