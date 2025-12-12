// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Silence ReactDOMTestUtils.act deprecation warning from React 18+/react-dom internals
const originalConsoleError = console.error;
console.error = (...args) => {
	try {
		const msg = args[0];
		if (typeof msg === 'string' && msg.includes('ReactDOMTestUtils.act') && msg.includes('deprecated in favor of `React.act`')) {
			return;
		}
	} catch (e) {
		// ignore parsing errors and fall through to original
	}
	originalConsoleError(...args);
};
