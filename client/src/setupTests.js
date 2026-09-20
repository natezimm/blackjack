import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.jest = vi;

const originalConsoleError = console.error;
console.error = (...args) => {
  try {
    const msg = args[0];
    if (
      typeof msg === 'string' &&
      msg.includes('ReactDOMTestUtils.act') &&
      msg.includes('deprecated in favor of `React.act`')
    ) {
      return;
    }
  } catch (e) {
    originalConsoleError(...args);
    return;
  }
  originalConsoleError(...args);
};
