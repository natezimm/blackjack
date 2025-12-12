jest.resetModules();

const reportWebVitals = require('./reportWebVitals').default;

describe('reportWebVitals', () => {
    it('invokes web-vitals callbacks when a handler is provided', async () => {
        const handler = jest.fn();
        const webVitals = {
            getCLS: jest.fn(),
            getFID: jest.fn(),
            getFCP: jest.fn(),
            getLCP: jest.fn(),
            getTTFB: jest.fn(),
        };

        await reportWebVitals(handler, webVitals);

        expect(webVitals.getCLS).toHaveBeenCalledWith(handler);
        expect(webVitals.getFID).toHaveBeenCalledWith(handler);
        expect(webVitals.getFCP).toHaveBeenCalledWith(handler);
        expect(webVitals.getLCP).toHaveBeenCalledWith(handler);
        expect(webVitals.getTTFB).toHaveBeenCalledWith(handler);
    });

    it('does nothing when handler is not a function', async () => {
        const webVitals = {
            getCLS: jest.fn(),
            getFID: jest.fn(),
        };

        await reportWebVitals(undefined, webVitals);

        expect(webVitals.getCLS).not.toHaveBeenCalled();
        expect(webVitals.getFID).not.toHaveBeenCalled();
    });
});
