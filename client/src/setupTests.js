import '@testing-library/jest-dom';

const originalConsoleError = console.error;
console.error = (...args) => {
	try {
		const msg = args[0];
		if (typeof msg === 'string' && msg.includes('ReactDOMTestUtils.act') && msg.includes('deprecated in favor of `React.act`')) {
			return;
		}
	} catch (e) {
		originalConsoleError(...args);
		return;
	}
	originalConsoleError(...args);
};
