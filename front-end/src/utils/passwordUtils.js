/**
 * Password Validation Utility
 *
 * Security note (SonarQube S2631 — ReDoS):
 *
 * The original single-regex pattern:
 *   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
 *
 * contains four independent `(?=.*)` lookaheads that each scan the entire
 * input string. On a long crafted string that nearly-matches, the regex
 * engine must explore an exponential number of paths — a classic ReDoS
 * (Regular Expression Denial of Service) vector.
 *
 * Fix: each rule is tested with a separate, linear-time character-class
 * scan. Character classes ([a-z], [A-Z], \d, [^A-Za-z0-9]) are O(n)
 * and cannot backtrack catastrophically. The minimum-length guard is a
 * plain string property access — O(1).
 *
 * This module is shared across Register, ResetPassword, and Settings to
 * eliminate duplication and keep the fix in one place.
 */

/**
 * Returns true when the password satisfies the application's policy:
 *  - At least 8 characters
 *  - At least one lowercase letter
 *  - At least one uppercase letter
 *  - At least one digit
 *  - At least one special (non-alphanumeric) character
 *
 * Each test is a separate, linear-time regex with no lookaheads.
 *
 * @param {string} password
 * @returns {boolean}
 */
export function isValidPassword(password) {
    if (typeof password !== 'string') return false;

    // 1. Minimum length — O(1) property access, no regex
    if (password.length < 8) return false;

    // 2. At least one lowercase letter — simple character class, O(n), no backtracking
    if (!/[a-z]/.test(password)) return false;

    // 3. At least one uppercase letter — simple character class, O(n), no backtracking
    if (!/[A-Z]/.test(password)) return false;

    // 4. At least one digit — simple character class, O(n), no backtracking
    if (!/\d/.test(password)) return false;

    // 5. At least one special character — negated character class, O(n), no backtracking
    if (!/[^A-Za-z0-9]/.test(password)) return false;

    return true;
}
