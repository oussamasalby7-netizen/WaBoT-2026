/**
 * Status Handler
 *
 * Processes WhatsApp message status updates (sent, delivered, read).
 * Currently just logs them — can be extended to update the dashboard.
 */

const logger = require('../utils/logger');

/**
 * Handle message status updates from Baileys.
 *
 * @param {Array} updates  Array of status update objects
 */
function handleStatusUpdates(updates) {
    for (const update of updates) {
        const { id, status } = update;

        const statusLabels = {
            2: 'sent',
            3: 'delivered',
            4: 'read',
        };

        const label = statusLabels[status] || `unknown (${status})`;
        logger.debug(`Message ${id}: status → ${label}`);
    }
}

module.exports = { handleStatusUpdates };
