import {
    isSecureUrl,
    validateApiUrl,
    sanitizeString,
    isValidNumber,
    validateBetAmount,
    safeJsonParse,
    getValidatedStorageItem,
    createRateLimiter,
} from './securityUtils';

describe('securityUtils', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
    });

    describe('isSecureUrl', () => {
        it('returns false for null or undefined', () => {
            expect(isSecureUrl(null)).toBe(false);
            expect(isSecureUrl(undefined)).toBe(false);
        });

        it('returns false for non-string input', () => {
            expect(isSecureUrl(123)).toBe(false);
            expect(isSecureUrl({})).toBe(false);
        });

        it('returns false for invalid URLs', () => {
            expect(isSecureUrl('not-a-url')).toBe(false);
            expect(isSecureUrl('ftp://example.com')).toBe(false);
        });

        it('allows HTTP in development', () => {
            process.env.NODE_ENV = 'development';
            expect(isSecureUrl('http://localhost:8080')).toBe(true);
            expect(isSecureUrl('http://example.com')).toBe(true);
        });

        it('allows HTTPS in development', () => {
            process.env.NODE_ENV = 'development';
            expect(isSecureUrl('https://example.com')).toBe(true);
        });

        it('requires HTTPS in production for non-localhost', () => {
            process.env.NODE_ENV = 'production';
            expect(isSecureUrl('http://example.com')).toBe(false);
            expect(isSecureUrl('https://example.com')).toBe(true);
        });

        it('allows HTTP localhost in production', () => {
            process.env.NODE_ENV = 'production';
            expect(isSecureUrl('http://localhost:8080')).toBe(true);
            expect(isSecureUrl('http://127.0.0.1:8080')).toBe(true);
        });
    });

    describe('validateApiUrl', () => {
        it('throws error for missing URL', () => {
            expect(() => validateApiUrl(null)).toThrow('API URL is required');
            expect(() => validateApiUrl('')).toThrow('API URL is required');
        });

        it('throws error for invalid URL', () => {
            expect(() => validateApiUrl('not-a-url')).toThrow('Invalid or insecure API URL');
        });

        it('returns valid URL in development', () => {
            process.env.NODE_ENV = 'development';
            expect(validateApiUrl('http://localhost:8080')).toBe('http://localhost:8080');
        });

        it('logs warning for HTTP in production', () => {
            process.env.NODE_ENV = 'production';
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            // HTTP localhost is allowed but should warn
            validateApiUrl('http://localhost:8080');
            
            warnSpy.mockRestore();
        });
    });

    describe('sanitizeString', () => {
        it('returns empty string for non-string input', () => {
            expect(sanitizeString(null)).toBe('');
            expect(sanitizeString(123)).toBe('');
            expect(sanitizeString({})).toBe('');
        });

        it('escapes HTML characters', () => {
            expect(sanitizeString('<script>alert("xss")</script>')).toBe(
                '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
            );
        });

        it('escapes ampersands', () => {
            expect(sanitizeString('foo & bar')).toBe('foo &amp; bar');
        });

        it('escapes quotes', () => {
            expect(sanitizeString("it's a \"test\"")).toBe(
                'it&#x27;s a &quot;test&quot;'
            );
        });

        it('leaves safe strings unchanged', () => {
            expect(sanitizeString('Hello World')).toBe('Hello World');
        });
    });

    describe('isValidNumber', () => {
        it('returns false for non-numbers', () => {
            expect(isValidNumber('123')).toBe(false);
            expect(isValidNumber(null)).toBe(false);
            expect(isValidNumber(NaN)).toBe(false);
        });

        it('validates within default range', () => {
            expect(isValidNumber(0)).toBe(true);
            expect(isValidNumber(100)).toBe(true);
            expect(isValidNumber(-1)).toBe(false);
        });

        it('validates within custom range', () => {
            expect(isValidNumber(5, 1, 10)).toBe(true);
            expect(isValidNumber(0, 1, 10)).toBe(false);
            expect(isValidNumber(11, 1, 10)).toBe(false);
        });
    });

    describe('validateBetAmount', () => {
        it('validates bet within range', () => {
            expect(validateBetAmount(50, 1000)).toEqual({ valid: true });
        });

        it('rejects bet below minimum', () => {
            const result = validateBetAmount(0, 1000);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('between');
        });

        it('rejects bet above maximum', () => {
            const result = validateBetAmount(20000, 100000);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('between');
        });

        it('rejects bet exceeding balance', () => {
            const result = validateBetAmount(500, 100);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Insufficient balance');
        });

        it('accepts custom min/max', () => {
            expect(validateBetAmount(5, 1000, 5, 100)).toEqual({ valid: true });
            expect(validateBetAmount(4, 1000, 5, 100).valid).toBe(false);
        });
    });

    describe('safeJsonParse', () => {
        it('returns fallback for non-string input', () => {
            expect(safeJsonParse(123, 'fallback')).toBe('fallback');
            expect(safeJsonParse(null, 'fallback')).toBe('fallback');
        });

        it('parses valid JSON', () => {
            expect(safeJsonParse('{"key": "value"}')).toEqual({ key: 'value' });
            expect(safeJsonParse('[1, 2, 3]')).toEqual([1, 2, 3]);
        });

        it('returns fallback for invalid JSON', () => {
            expect(safeJsonParse('not-json', 'fallback')).toBe('fallback');
        });

        it('blocks prototype pollution attempts', () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            expect(safeJsonParse('{"__proto__": {"admin": true}}', null)).toBe(null);
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('prototype pollution')
            );
            
            warnSpy.mockRestore();
        });

        it('blocks constructor pollution', () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            expect(safeJsonParse('{"constructor": {}}', null)).toBe(null);
            
            warnSpy.mockRestore();
        });
    });

    describe('getValidatedStorageItem', () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it('returns null for missing item', () => {
            expect(getValidatedStorageItem('nonexistent')).toBe(null);
        });

        it('returns parsed item when valid', () => {
            localStorage.setItem('test', JSON.stringify({ foo: 'bar' }));
            expect(getValidatedStorageItem('test')).toEqual({ foo: 'bar' });
        });

        it('uses custom validator', () => {
            localStorage.setItem('test', JSON.stringify({ value: 5 }));
            
            const validator = (data) => data.value > 0;
            expect(getValidatedStorageItem('test', validator)).toEqual({ value: 5 });
        });

        it('removes and returns null for invalid data', () => {
            localStorage.setItem('test', JSON.stringify({ value: -1 }));
            
            const validator = (data) => data.value > 0;
            expect(getValidatedStorageItem('test', validator)).toBe(null);
            expect(localStorage.getItem('test')).toBe(null);
        });

        it('handles localStorage errors gracefully', () => {
            const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('Storage error');
            });
            
            expect(getValidatedStorageItem('test')).toBe(null);
            
            getItemSpy.mockRestore();
        });
    });

    describe('createRateLimiter', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('allows requests under limit', () => {
            const limiter = createRateLimiter(3, 1000);
            
            expect(limiter.canMakeRequest()).toBe(true);
            limiter.recordRequest();
            expect(limiter.canMakeRequest()).toBe(true);
            limiter.recordRequest();
            expect(limiter.canMakeRequest()).toBe(true);
        });

        it('blocks requests over limit', () => {
            const limiter = createRateLimiter(2, 1000);
            
            limiter.recordRequest();
            limiter.recordRequest();
            expect(limiter.canMakeRequest()).toBe(false);
        });

        it('resets after time window', () => {
            const limiter = createRateLimiter(2, 1000);
            
            limiter.recordRequest();
            limiter.recordRequest();
            expect(limiter.canMakeRequest()).toBe(false);
            
            jest.advanceTimersByTime(1001);
            expect(limiter.canMakeRequest()).toBe(true);
        });
    });
});
