/**
 * Security utilities for input validation and sanitization.
 * Helps prevent XSS and ensures data integrity.
 */

/**
 * Validates that a URL uses HTTPS in production environments.
 * Allows HTTP only in development for local testing.
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if the URL is valid for the current environment
 */
export const isSecureUrl = (url) => {
    if (!url || typeof url !== 'string') {
        return false;
    }

    try {
        const parsedUrl = new URL(url);
        const isProduction = process.env.NODE_ENV === 'production';
        const isLocalhost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';

        // In production, require HTTPS unless it's localhost (for rare local prod testing)
        if (isProduction && !isLocalhost) {
            return parsedUrl.protocol === 'https:';
        }

        // In development, allow both HTTP and HTTPS
        return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
        return false;
    }
};

/**
 * Validates and sanitizes the API URL.
 * Logs a warning if using HTTP in production.
 * @param {string} url - The API URL to validate
 * @returns {string} - The validated URL
 * @throws {Error} - If the URL is invalid or insecure in production
 */
export const validateApiUrl = (url) => {
    if (!url) {
        throw new Error('API URL is required. Set REACT_APP_API_URL environment variable.');
    }

    if (!isSecureUrl(url)) {
        throw new Error(`Invalid or insecure API URL: ${url}. Use HTTPS in production.`);
    }

    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && url.startsWith('http://') && !url.includes('localhost')) {
        console.warn(
            'Security Warning: Using HTTP in production is not recommended. ' +
            'Please configure HTTPS for your API endpoint.'
        );
    }

    return url;
};

/**
 * Sanitizes a string to prevent XSS when displaying user content.
 * Note: React already escapes content in JSX, but this provides
 * additional protection for non-JSX contexts.
 * @param {string} input - The input string to sanitize
 * @returns {string} - The sanitized string
 */
export const sanitizeString = (input) => {
    if (typeof input !== 'string') {
        return '';
    }

    const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };

    return input.replace(/[&<>"'/]/g, (char) => escapeMap[char]);
};

/**
 * Validates a numeric input is within expected bounds.
 * @param {number} value - The value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {boolean} - True if valid
 */
export const isValidNumber = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return false;
    }
    return value >= min && value <= max;
};

/**
 * Validates bet amount is within acceptable range.
 * @param {number} amount - Bet amount to validate
 * @param {number} balance - Current player balance
 * @param {number} minBet - Minimum bet allowed (default: 1)
 * @param {number} maxBet - Maximum bet allowed (default: 10000)
 * @returns {Object} - { valid: boolean, error?: string }
 */
export const validateBetAmount = (amount, balance, minBet = 1, maxBet = 10000) => {
    if (!isValidNumber(amount, minBet, maxBet)) {
        return {
            valid: false,
            error: `Bet must be between $${minBet} and $${maxBet}`,
        };
    }

    if (amount > balance) {
        return {
            valid: false,
            error: 'Insufficient balance for this bet',
        };
    }

    return { valid: true };
};

/**
 * Safely parses JSON with error handling.
 * Prevents potential prototype pollution attacks.
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} - Parsed object or fallback
 */
export const safeJsonParse = (jsonString, fallback = null) => {
    if (typeof jsonString !== 'string') {
        return fallback;
    }

    try {
        const parsed = JSON.parse(jsonString);

        // Prevent prototype pollution - check if the parsed object has dangerous keys as own properties
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            if (Object.prototype.hasOwnProperty.call(parsed, '__proto__') ||
                Object.prototype.hasOwnProperty.call(parsed, 'constructor') ||
                Object.prototype.hasOwnProperty.call(parsed, 'prototype')) {
                console.warn('Security: Blocked potential prototype pollution attempt');
                return fallback;
            }
        }

        return parsed;
    } catch {
        return fallback;
    }
};

/**
 * Validates localStorage data integrity.
 * @param {string} key - Storage key
 * @param {function} validator - Validation function for the data
 * @returns {*} - Valid data or null
 */
export const getValidatedStorageItem = (key, validator = () => true) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        const parsed = safeJsonParse(raw);
        if (parsed && validator(parsed)) {
            return parsed;
        }

        // Invalid data - remove it
        localStorage.removeItem(key);
        return null;
    } catch {
        return null;
    }
};

/**
 * Rate limiting helper for client-side requests.
 * Helps prevent accidental rapid-fire requests.
 */
export const createRateLimiter = (maxRequests = 10, windowMs = 1000) => {
    const requests = [];

    return {
        canMakeRequest: () => {
            const now = Date.now();
            // Remove old requests outside the window
            while (requests.length > 0 && requests[0] < now - windowMs) {
                requests.shift();
            }
            return requests.length < maxRequests;
        },
        recordRequest: () => {
            requests.push(Date.now());
        },
    };
};
