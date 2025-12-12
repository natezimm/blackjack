describe('reportWebVitals', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    it('invokes web-vitals callbacks when a handler is provided', () => {
        const reportWebVitals = require('./reportWebVitals').default;
        const handler = jest.fn();
        const webVitals = {
            getCLS: jest.fn(),
            getFID: jest.fn(),
            getFCP: jest.fn(),
            getLCP: jest.fn(),
            getTTFB: jest.fn(),
        };

        reportWebVitals(handler, webVitals);

        expect(webVitals.getCLS).toHaveBeenCalledWith(handler);
        expect(webVitals.getFID).toHaveBeenCalledWith(handler);
        expect(webVitals.getFCP).toHaveBeenCalledWith(handler);
        expect(webVitals.getLCP).toHaveBeenCalledWith(handler);
        expect(webVitals.getTTFB).toHaveBeenCalledWith(handler);
    });

    it('does nothing when handler is not a function', () => {
        const reportWebVitals = require('./reportWebVitals').default;
        const webVitals = {
            getCLS: jest.fn(),
            getFID: jest.fn(),
        };

        reportWebVitals(undefined, webVitals);

        expect(webVitals.getCLS).not.toHaveBeenCalled();
        expect(webVitals.getFID).not.toHaveBeenCalled();
    });

    it('does nothing when handler is null', () => {
        const reportWebVitals = require('./reportWebVitals').default;
        const webVitals = {
            getCLS: jest.fn(),
            getFID: jest.fn(),
        };

        reportWebVitals(null, webVitals);

        expect(webVitals.getCLS).not.toHaveBeenCalled();
        expect(webVitals.getFID).not.toHaveBeenCalled();
    });

    it('falls back to requiring web-vitals when not provided', () => {
        const mockWebVitals = {
            getCLS: jest.fn(),
            getFID: jest.fn(),
            getFCP: jest.fn(),
            getLCP: jest.fn(),
            getTTFB: jest.fn(),
        };

        jest.doMock('web-vitals', () => mockWebVitals);

        const reportWebVitals = require('./reportWebVitals').default;
        const handler = jest.fn();

        reportWebVitals(handler);

        expect(mockWebVitals.getCLS).toHaveBeenCalledWith(handler);
        expect(mockWebVitals.getFID).toHaveBeenCalledWith(handler);
        expect(mockWebVitals.getFCP).toHaveBeenCalledWith(handler);
        expect(mockWebVitals.getLCP).toHaveBeenCalledWith(handler);
        expect(mockWebVitals.getTTFB).toHaveBeenCalledWith(handler);
    });

    it('handles errors when web-vitals is not available', () => {
        // IMPORTANT: require('web-vitals') is inside the function (line 4 of source),
        // not at module load time. This means the module can be loaded safely,
        // and the require() only happens when the function is called.
        //
        // The test sets up jest.doMock to make require('web-vitals') throw.
        // When the function calls require('web-vitals'), it will throw,
        // but the error is caught by the try-catch block in the source code.
        
        // Set up the mock BEFORE loading the module
        // The mock factory throws, which will cause require('web-vitals') to throw
        // when it's called inside the function
        jest.doMock('web-vitals', () => {
            throw new Error('Module not found');
        }, { virtual: true });

        // Load the module in an isolated context
        // This is safe because require('web-vitals') is inside the function,
        // not executed during module loading
        let reportWebVitals;
        jest.isolateModules(() => {
            reportWebVitals = require('./reportWebVitals').default;
        });

        const handler = jest.fn();

        // Call the function without webVitals parameter
        // This will trigger: webVitals || require('web-vitals')
        // Since webVitals is undefined, require('web-vitals') is called,
        // which throws due to our mock. The error is caught by the try-catch
        // in the source code (lines 3-12), so the function should not throw
        expect(() => {
            reportWebVitals(handler);
        }).not.toThrow();
        
        // Handler should not be called since web-vitals failed to load
        expect(handler).not.toHaveBeenCalled();
    });
});
