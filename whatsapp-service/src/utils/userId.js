/**
 * Validates SaaS user IDs used in session paths and API routes.
 * Only positive integer IDs are allowed (matches Laravel user primary keys).
 */

function assertValidUserId(userId) {
    const id = String(userId ?? '').trim();
    if (!/^\d+$/.test(id) || id === '0') {
        const err = new Error('Invalid user ID');
        err.code = 'INVALID_USER_ID';
        throw err;
    }
    return id;
}

module.exports = { assertValidUserId };
