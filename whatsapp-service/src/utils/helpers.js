/**
 * Utility Helpers
 *
 * Pure functions used across the service for formatting,
 * validation, and data transformation.
 */

/**
 * Normalise a phone number to WhatsApp JID format.
 * Strips leading '+', spaces, dashes and appends @s.whatsapp.net.
 *
 * @param {string} number  Raw phone number, e.g. "+212612345678"
 * @returns {string}       WhatsApp JID, e.g. "212612345678@s.whatsapp.net"
 */
function toJid(number) {
    const cleaned = String(number).replaceAll(' ', '').replaceAll('-', '').replaceAll('+', '');
    if (cleaned.includes('@')) return cleaned;
    return `${cleaned}@s.whatsapp.net`;
}

/**
 * Extract the raw phone number from a WhatsApp JID.
 *
 * @param {string} jid  e.g. "212612345678@s.whatsapp.net"
 * @returns {string}    e.g. "212612345678"
 */
function fromJid(jid) {
    if (!jid) return '';
    /*
     * Baileys multi-device JIDs can look like:
     *   "212612345678:0@s.whatsapp.net"  ← device index
     *   "212612345678@s.whatsapp.net"    ← standard
     * We want just the phone number part: "212612345678"
     */
    return String(jid).split('@')[0].split(':')[0];
}

/**
 * Check whether a JID belongs to a group chat.
 *
 * @param {string} jid
 * @returns {boolean}
 */
function isGroupJid(jid) {
    return String(jid).endsWith('@g.us');
}

/**
 * Sleep for a given number of milliseconds.
 * Used for rate-limiting and typing simulation.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random delay between min and max (inclusive).
 *
 * Security (SonarQube S2245 — PRNG hotspot, reviewed and safe):
 * Math.random() is used here exclusively for cosmetic typing-simulation
 * jitter — the result is only ever passed to setTimeout() to make the
 * bot appear more human-like. It is NOT used for:
 *   - Token or secret generation
 *   - Session IDs or nonces
 *   - Cryptographic seeding
 *   - Any security-sensitive decision
 * Replacing it with a CSPRNG (crypto.getRandomValues) would provide no
 * security benefit here and would add unnecessary overhead.
 *
 * @param {number} min  Minimum ms
 * @param {number} max  Maximum ms
 * @returns {number}
 */
function randomDelay(min, max) {
    // Non-security use: cosmetic UI jitter only (typing simulation).
    return Math.floor(Math.random() * (max - min + 1)) + min; // NOSONAR
}

module.exports = {
    toJid,
    fromJid,
    isGroupJid,
    sleep,
    randomDelay,
};
