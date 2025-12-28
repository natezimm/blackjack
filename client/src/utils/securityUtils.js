export const isSecureUrl = (url) => {
    if (!url || typeof url !== 'string') {
        return false;
    }

    try {
        const parsedUrl = new URL(url);
        const isProduction = process.env.NODE_ENV === 'production';
        const isLocalhost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';

        if (isProduction && !isLocalhost) {
            return parsedUrl.protocol === 'https:';
        }

        return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
        return false;
    }
};

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

export const isValidNumber = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return false;
    }
    return value >= min && value <= max;
};

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

export const safeJsonParse = (jsonString, fallback = null) => {
    if (typeof jsonString !== 'string') {
        return fallback;
    }

    try {
        const parsed = JSON.parse(jsonString);

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

export const getValidatedStorageItem = (key, validator = () => true) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        const parsed = safeJsonParse(raw);
        if (parsed && validator(parsed)) {
            return parsed;
        }

        localStorage.removeItem(key);
        return null;
    } catch {
        return null;
    }
};

export const createRateLimiter = (maxRequests = 10, windowMs = 1000) => {
    const requests = [];

    return {
        canMakeRequest: () => {
            const now = Date.now();
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
