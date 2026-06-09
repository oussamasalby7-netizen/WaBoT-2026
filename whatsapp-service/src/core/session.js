/**
 * Session Manager
 *
 * Handles WhatsApp authentication credentials using Baileys'
 * built-in multi-file auth state. Sessions are persisted to disk
 * so the service can reconnect without scanning the QR code again.
 */

const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Initialise or restore the auth session.
 * Creates the session directory if it doesn't exist.
 *
 * @returns {Promise<{ state: Object, saveCreds: Function }>}
 */
async function loadSession() {
    const sessionPath = config.sessionDir;

    /* Ensure the directory exists */
    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
        logger.info(`Session directory created: ${sessionPath}`);
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const credsFile = path.join(sessionPath, 'creds.json');
    const isResuming = fs.existsSync(credsFile);

    if (isResuming) {
        logger.info('Existing session found — attempting to resume without QR scan');
    } else {
        logger.info('No previous session — QR code will be displayed shortly');
    }

    return { state, saveCreds };
}

/**
 * Wipe all stored session files.
 * Call this when the session is permanently invalidated.
 */
function clearSession() {
    const sessionPath = config.sessionDir;

    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        fs.mkdirSync(sessionPath, { recursive: true });
        logger.warn('Session data cleared — a new QR scan will be required');
    }
}

module.exports = { loadSession, clearSession };
