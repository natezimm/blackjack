import { describe, it, expect, vi } from 'vitest';
import reportWebVitals, { __invokeWebVitals } from './reportWebVitals';

describe('reportWebVitals', () => {
  it('invokes web-vitals callbacks when a handler is provided', async () => {
    const handler = vi.fn();
    const webVitals = {
      getCLS: vi.fn(),
      getFID: vi.fn(),
      getFCP: vi.fn(),
      getLCP: vi.fn(),
      getTTFB: vi.fn(),
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
      getCLS: vi.fn(),
      getFID: vi.fn(),
    };

    await reportWebVitals(undefined, webVitals);

    expect(webVitals.getCLS).not.toHaveBeenCalled();
    expect(webVitals.getFID).not.toHaveBeenCalled();
  });

  it('does nothing when handler is null', async () => {
    const webVitals = {
      getCLS: vi.fn(),
      getFID: vi.fn(),
    };

    await reportWebVitals(null, webVitals);

    expect(webVitals.getCLS).not.toHaveBeenCalled();
    expect(webVitals.getFID).not.toHaveBeenCalled();
  });

  it('falls back to importing web-vitals when not provided', async () => {
    const handler = vi.fn();
    await expect(reportWebVitals(handler)).resolves.not.toThrow();
  });

  it('handles errors when web-vitals fails', async () => {
    const handler = vi.fn();
    const brokenModule = {
      getCLS: () => {
        throw new Error('boom');
      },
    };

    await expect(
      __invokeWebVitals(handler, brokenModule)
    ).resolves.not.toThrow();
  });
});
