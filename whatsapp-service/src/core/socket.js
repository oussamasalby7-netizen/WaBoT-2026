/**
 * Baileys Socket Manager — v2 (Windows-stable)
 *
 * Root cause of the disconnect 405 (notSupported):
 *   - Browsers.ubuntu('WaBoT') was rejected by WhatsApp servers
 *   - Missing keepAlive, connectTimeout, and qrTimeout configs
 *   - Reconnect logic was retrying on fatal errors (405) instead of resetting
 *
 * Fixes applied:
 *   1. Browser config changed to Browsers.baileys('Desktop') — accepted by WA
 *   2. Added keepAliveIntervalMs, connectTimeoutMs, defaultQueryTimeoutMs
 *   3. clearSession() called before any reconnect on 4xx codes
 *   4. Reconnect guard prevents overlapping connection attempts
 *   5. Graceful socket teardown before restart
 */

const { default: makeWASocket, Browsers, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcodeTerminal = require('qrcode-terminal');

const { loadSession, clearSession } = require('./session');
const { evaluateDisconnect, getRetryDelay, resetRetries } = require('./reconnect');
const { handleIncomingMessages } = require('../handlers/message');
const { handleStatusUpdates } = require('../handlers/status');
const { setSock } = require('../services/sender');
const logger = require('../utils/logger');

/* ── Shared connection state (exported to API routes) ─────────────────────── */

const connectionState = {
    connected: false,
    qr: null,
    phoneNumber: null,
    disconnectRequested: false,
};

/* ── Internal state ───────────────────────────────────────────────────────── */

let sock = null;
let isConnecting = false; // Guard: prevents overlapping startConnection calls

/* ── Silent pino logger (we use Winston instead) ─────────────────────────── */

const pinoLogger = pino({ level: 'silent' });

/**
 * Tear down the current socket cleanly before creating a new one.
 * Prevents event listener accumulation across reconnect cycles.
 */
async function destroySocket() {
    if (!sock) return;

    try {
        sock.ev.removeAllListeners();
        await sock.logout().catch(() => {});
    } catch {
        /* Ignore — socket may already be dead */
    } finally {
        sock = null;
        setSock(null);
    }
}

/**
 * Schedule a reconnection attempt.
 *
 * @param {boolean} shouldClearSession  Whether to wipe saved credentials
 * @param {number}  delay               Milliseconds to wait before reconnecting
 */
function scheduleReconnect(shouldClearSession, delay = 0) {
    if (shouldClearSession) {
        clearSession();
    }

    if (delay === 0) {
        /* Immediate — e.g. restartRequired */
        startConnection();
    } else {
        setTimeout(() => startConnection(), delay);
    }
}

/**
 * Initialise (or re-initialise) the Baileys WhatsApp connection.
 * This is called once at startup and again after each disconnect.
 */
async function startConnection() {
    /* Prevent overlapping connect attempts */
    if (isConnecting) {
        logger.warn('startConnection() called while already connecting — skipping');
        return;
    }

    isConnecting = true;

    try {
        await destroySocket();

        /* Fetch the latest stable Baileys WA Web version */
        const { version, isLatest } = await fetchLatestBaileysVersion();
        logger.info(`Using Baileys WA version: ${version.join('.')} (latest: ${isLatest})`);

        const { state, saveCreds } = await loadSession();

        sock = makeWASocket({
            version,
            auth: state,
            logger: pinoLogger,

            /*
             * Browser identity — CRITICAL FIX
             * Browsers.ubuntu() is no longer accepted by WhatsApp (causes 405).
             * Browsers.baileys() sends a recognised multi-device browser string.
             */
            browser: Browsers.baileys('Desktop'),

            /*
             * Connection stability settings (especially important on Windows
             * where TCP keep-alive defaults are more aggressive).
             */
            keepAliveIntervalMs: 25000,   // Ping WA every 25s to keep socket alive
            connectTimeoutMs: 60000,       // Allow up to 60s for initial handshake
            defaultQueryTimeoutMs: 60000,  // Timeout for individual WA queries
            qrTimeout: 90000,              // QR code stays valid for 90s

            /* Performance & stability */
            syncFullHistory: false,
            markOnlineOnConnect: false,    // Don't broadcast online — reduces risk of bans
            generateHighQualityLinkPreview: false,
            printQRInTerminal: false,      // We handle QR ourselves

            /* Required for message decryption */
            getMessage: async () => ({ conversation: '' }),
        });

        /* Bind active socket to the sender service */
        setSock(sock);

        /* ── Event: credentials updated ───────────────────────────────── */

        sock.ev.on('creds.update', saveCreds);

        /* ── Event: connection state changed ──────────────────────────── */

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr, receivedPendingNotifications } = update;

            /* QR code available — display in terminal and cache for API */
            if (qr) {
                connectionState.qr = qr;
                connectionState.connected = false;
                connectionState.phoneNumber = null;

                logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                logger.info('  Scan the QR code below with WhatsApp');
                logger.info('  Phone → ⋮ → Linked Devices → Link a Device');
                logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                qrcodeTerminal.generate(qr, { small: true });
            }

            /* Successfully connected */
            if (connection === 'open') {
                const jid = sock?.user?.id ?? '';
                const number = jid.replace(/:.*@.*$/, '').replace('@s.whatsapp.net', '');

                connectionState.connected = true;
                connectionState.qr = null;
                connectionState.phoneNumber = number || null;

                resetRetries();
                isConnecting = false;

                logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                logger.info(`  WhatsApp CONNECTED (+${number})`);
                logger.info('  Ready to receive and send messages');
                logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            }

            /* Connection closed — determine recovery strategy */
            if (connection === 'close') {
                connectionState.connected = false;
                connectionState.phoneNumber = null;
                isConnecting = false;

                /* Manual disconnect requested via API */
                if (connectionState.disconnectRequested) {
                    connectionState.disconnectRequested = false;
                    logger.info('Manual disconnect — clearing session, will restart in 3s');
                    scheduleReconnect(true, 3000);
                    return;
                }

                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const { shouldReconnect, clearSession: shouldClear, reason } = evaluateDisconnect(statusCode);

                logger.warn(`Disconnected [code ${statusCode ?? 'N/A'}]: ${reason}`);

                if (!shouldReconnect) {
                    logger.error('Fatal disconnect — cannot reconnect automatically');
                    logger.error('Restart the service manually: npm start');
                    return;
                }

                const { delay, maxReached } = getRetryDelay();

                if (maxReached) {
                    logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    logger.error('  Max reconnect attempts reached');
                    logger.error('  Clearing session and starting fresh in 10s...');
                    logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    /* Even on max retries — clear and try once more with a clean slate */
                    clearSession();
                    setTimeout(() => {
                        isConnecting = false;
                        startConnection();
                    }, 10000);
                    return;
                }

                scheduleReconnect(shouldClear, delay);
            }
        });

        /* ── Event: incoming messages ─────────────────────────────────── */

        sock.ev.on('messages.upsert', (upsert) => {
            handleIncomingMessages(upsert, sock?.user?.id);
        });

        /* ── Event: message status updates ───────────────────────────── */

        sock.ev.on('messages.update', (updates) => {
            handleStatusUpdates(updates);
        });

    } catch (error) {
        isConnecting = false;
        logger.error(`startConnection() threw: ${error.message}`);
        logger.error(error.stack);

        /* Retry after 5s on unexpected bootstrap error */
        logger.info('Retrying in 5s...');
        setTimeout(() => startConnection(), 5000);
    }
}

/**
 * Get the shared connection state object.
 */
function getConnectionState() {
    return connectionState;
}

/**
 * Get the active Baileys socket instance.
 */
function getSocket() {
    return sock;
}

module.exports = { startConnection, getConnectionState, getSocket };
