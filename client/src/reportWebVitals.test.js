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
        jest.doMock('web-vitals', () => {
            throw new Error('Module not found');
        }, { virtual: true });

        let reportWebVitals;
        jest.isolateModules(() => {
            reportWebVitals = require('./reportWebVitals').default;
        });

        const handler = jest.fn();

        expect(() => {
            reportWebVitals(handler);
        }).not.toThrow();
        expect(handler).not.toHaveBeenCalled();
    });
});
