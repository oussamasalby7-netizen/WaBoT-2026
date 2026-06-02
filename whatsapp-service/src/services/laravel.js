/**
 * Laravel API Client
 *
 * Handles all HTTP communication between the Baileys service
 * and the Laravel backend. Uses a shared secret for authentication.
 */

const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');

const client = axios.create({
    baseURL: config.laravelApiUrl,
    timeout: 35000, // 35s — generous to allow AI processing time
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Service-Secret': config.serviceSecret,
    },
});

/**
 * Forward an incoming WhatsApp message to Laravel for AI processing.
 * Laravel will save the message, run AI, save the AI reply, and return it.
 *
 * @param {Object} payload
 * @param {string} payload.from       Sender phone number (without +)
 * @param {string} payload.body       Message text content
 * @param {string} payload.pushName   Sender's WhatsApp display name
 * @param {string} payload.messageId  Original WhatsApp message ID
 * @param {string} payload.userId     SaaS user_id who owns this WhatsApp session
 * @returns {Promise<{ reply: string, order: Object|null }>}
 */
async function forwardMessage({ from, body, pushName, messageId, userId }) {
    try {
        logger.debug(`Forwarding message to Laravel: [user:${userId}] ${from} → "${body.substring(0, 50)}..."`);

        const response = await client.post('/baileys/incoming', {
            from,
            body,
            push_name: pushName,
            message_id: messageId,
            user_id: userId,
        });

        const data = response.data;

        if (data.status === 'success' && data.reply) {
            logger.info(`AI reply received for [user:${userId}] ${from} (${data.reply.length} chars)`);
            return { reply: data.reply, order: data.order || null };
        }

        logger.warn('Laravel returned unexpected response format', { data });
        return { reply: null, order: null };

    } catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;

        logger.error(`Laravel API error (HTTP ${status || 'N/A'}): ${message}`);

        /* Retry once on timeout or 5xx */
        if (!error._retried && (error.code === 'ECONNABORTED' || (status && status >= 500))) {
            error._retried = true;
            logger.info('Retrying Laravel request (1/1)...');
            return forwardMessage({ from, body, pushName, messageId, userId });
        }

        return { reply: null, order: null };
    }
}

/**
 * Check the health status of the Laravel API.
 *
 * @returns {Promise<boolean>}
 */
async function checkHealth() {
    try {
        const response = await client.get('/baileys/health', { timeout: 5000 });
        return response.status === 200;
    } catch {
        return false;
    }
}

module.exports = { forwardMessage, checkHealth };
