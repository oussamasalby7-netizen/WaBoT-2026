/**
 * Incoming Message Handler
 *
 * Processes new WhatsApp messages received by Baileys.
 * Filters out irrelevant messages (groups, own messages, statuses),
 * forwards valid customer messages to Laravel for AI processing,
 * and sends the AI reply back to the customer.
 */

const { fromJid, isGroupJid } = require('../utils/helpers');
const laravel = require('../services/laravel');
const sender = require('../services/sender');
const logger = require('../utils/logger');

/**
 * Handle the 'messages.upsert' event from Baileys.
 *
 * @param {Object}  param0
 * @param {Array}   param0.messages  Array of incoming message objects
 * @param {string}  param0.type      Event type: 'notify' for new messages
 * @param {string}  ownJid           Our own WhatsApp JID (to filter self-messages)
 */
async function handleIncomingMessages({ messages, type }, ownJid) {
    /* Only process real-time notifications, not history sync */
    if (type !== 'notify') return;

    for (const msg of messages) {
        try {
            await processSingleMessage(msg, ownJid);
        } catch (error) {
            logger.error(`Unhandled error processing message: ${error.message}`);
        }
    }
}

/**
 * Process a single incoming message.
 */
async function processSingleMessage(msg, ownJid) {
    const remoteJid = msg.key?.remoteJid;

    /* ── Skip conditions ─────────────────────────────────────────────── */

    /* Ignore messages without a valid JID */
    if (!remoteJid) return;

    /* Ignore group messages — we only handle direct chats */
    if (isGroupJid(remoteJid)) return;

    /* Ignore our own outgoing messages */
    if (msg.key?.fromMe) return;

    /* Ignore status broadcasts */
    if (remoteJid === 'status@broadcast') return;

    /* Ignore protocol/system messages */
    if (msg.message?.protocolMessage || msg.message?.reactionMessage) return;

    /* ── Extract message content ─────────────────────────────────────── */

    const textContent = extractTextContent(msg);
    if (!textContent) {
        logger.debug(`Non-text message from ${fromJid(remoteJid)} — skipping`);
        return;
    }

    const fromNumber = fromJid(remoteJid);
    const pushName = msg.pushName || 'Unknown';
    const messageId = msg.key?.id || '';

    logger.info(`New message from ${pushName} (${fromNumber}): "${textContent.substring(0, 80)}"`);

    /* ── Forward to Laravel AI ───────────────────────────────────────── */

    const { reply } = await laravel.forwardMessage({
        from: fromNumber,
        body: textContent,
        pushName,
        messageId,
    });

    /* ── Send AI reply back to the customer ──────────────────────────── */

    if (reply) {
        await sender.sendTextMessage(fromNumber, reply);
    } else {
        logger.warn(`No AI reply generated for message from ${fromNumber}`);

        /* Send a fallback message so the customer isn't left hanging */
        await sender.sendTextMessage(
            fromNumber,
            "Merci pour votre message ! Un agent vous répondra très bientôt. 🙏"
        );
    }
}

/**
 * Extract text content from various message types.
 * Supports: text, extended text, image/video/document captions.
 *
 * @param {Object} msg  Baileys message object
 * @returns {string|null}
 */
function extractTextContent(msg) {
    const message = msg.message;
    if (!message) return null;

    /* Standard text message */
    if (message.conversation) {
        return message.conversation;
    }

    /* Extended text (replies, links, etc.) */
    if (message.extendedTextMessage?.text) {
        return message.extendedTextMessage.text;
    }

    /* Image / video / document with caption */
    if (message.imageMessage?.caption) {
        return message.imageMessage.caption;
    }
    if (message.videoMessage?.caption) {
        return message.videoMessage.caption;
    }
    if (message.documentMessage?.caption) {
        return message.documentMessage.caption;
    }

    return null;
}

module.exports = { handleIncomingMessages };
