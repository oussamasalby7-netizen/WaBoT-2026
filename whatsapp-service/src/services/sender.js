/**
 * Message Sender — v2
 *
 * Sends WhatsApp messages through the active Baileys socket.
 * Robust against null socket states that occur during reconnect cycles.
 * Implements typing simulation and per-message rate limiting.
 */

const { sleep, randomDelay, toJid } = require('../utils/helpers');
const logger = require('../utils/logger');

/* Active Baileys socket — updated by socket.js on each (re)connect */
let sock = null;

/**
 * Update the active socket reference.
 * Called with the live socket on connect, and with null on disconnect.
 *
 * @param {Object|null} socket
 */
function setSock(socket) {
    sock = socket;
}

/**
 * Check whether the socket is in a usable state.
 *
 * @returns {boolean}
 */
function isReady() {
    return sock !== null && sock.user !== null && sock.user !== undefined;
}

/**
 * Send a plain text message to a WhatsApp number.
 *
 * Behaviour:
 *  - Simulates typing before sending (human-like UX, reduces ban risk)
 *  - Retries once after 2 seconds on first failure
 *  - Returns { success, messageId } — never throws
 *
 * @param {string} to    Phone number (e.g. "212612345678") or JID
 * @param {string} text  Message content
 * @returns {Promise<{ success: boolean, messageId: string|null }>}
 */
async function sendTextMessage(to, text) {
    if (!isReady()) {
        logger.warn(`Cannot send to ${to} — socket is not connected`);
        return { success: false, messageId: null };
    }

    if (!to || !text) {
        logger.warn('sendTextMessage called with empty to or text');
        return { success: false, messageId: null };
    }

    const jid = toJid(to);

    try {
        /* Typing simulation: subscribe + composing + pause */
        await sock.presenceSubscribe(jid).catch(() => {});
        await sleep(300);
        await sock.sendPresenceUpdate('composing', jid).catch(() => {});

        /* Hold the typing indicator — duration proportional to message length */
        const typingMs = Math.min(randomDelay(600, 1500), text.length * 25);
        await sleep(typingMs);

        await sock.sendPresenceUpdate('paused', jid).catch(() => {});
        await sleep(150);

        /* Send the message */
        const result = await sock.sendMessage(jid, { text });
        const messageId = result?.key?.id ?? null;

        logger.info(`Sent to ${to} | id: ${messageId}`);
        return { success: true, messageId };

    } catch (error) {
        logger.error(`Send failed to ${to}: ${error.message} — retrying in 2s`);

        /* Single automatic retry */
        await sleep(2000);

        if (!isReady()) {
            logger.error(`Retry aborted — socket disconnected while waiting`);
            return { success: false, messageId: null };
        }

        try {
            const result = await sock.sendMessage(jid, { text });
            const messageId = result?.key?.id ?? null;
            logger.info(`Sent to ${to} on retry | id: ${messageId}`);
            return { success: true, messageId };
        } catch (retryError) {
            logger.error(`Retry also failed for ${to}: ${retryError.message}`);
            return { success: false, messageId: null };
        }
    }
}

module.exports = { setSock, isReady, sendTextMessage };
