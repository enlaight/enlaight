import '@testing-library/jest-dom';

import { beforeAll, afterAll } from 'vitest';

// Suppress specific React Router Future Flag warnings
beforeAll(() => {
	const originalWarn = console.warn;

	console.warn = (msg: unknown, ...args: unknown[]) => {
		const message = String(msg);
		if (
			message.includes('React Router Future Flag Warning') ||
			message.includes('React startTransition') ||
			message.includes('Missing `Description` or `aria-describedby`')
		) {
			// Ignore the warning
			return;
		}
		originalWarn(msg, ...args);
	};

	// Optional: restore after all tests
	afterAll(() => {
		console.warn = originalWarn;
	});
});