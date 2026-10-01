import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

const createLocalStorageMock = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => (store.hasOwnProperty(key) ? store[key] : null)),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i) => {
      const keys = Object.keys(store);
      return keys[i] || null;
    }),
  };
};

const localStorageMock = createLocalStorageMock();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
}

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
