import { describe, it, expect } from 'vitest';
import { authErrorText, toAuthError } from '@/lib/auth-errors';

/** Stand-in for what axios rejects with: `message` is never user-facing. */
const axiosError = (status: number, data: unknown) =>
	Object.assign(new Error(`Request failed with status code ${status}`), {
		response: { status, data },
		isAxiosError: true,
	});

const t = (key: string) => `t:${key}`;

describe('toAuthError', () => {
	it('maps a known code to a locale key and keeps the detail', () => {
		const e = toAuthError(axiosError(403, { detail: 'Conta não ativada.', code: 'user_inactive' }));
		expect(e.i18nKey).toBe('login.accountNotActivated');
		expect(e.detail).toBe('Conta não ativada.');
		expect(e.status).toBe(403);
	});

	it('leaves i18nKey unset for a code it does not know', () => {
		const e = toAuthError(axiosError(400, { detail: 'Something specific', code: 'brand_new' }));
		expect(e.i18nKey).toBeUndefined();
		expect(e.detail).toBe('Something specific');
	});

	it('survives a response with no body at all', () => {
		const e = toAuthError(new Error('Network Error'));
		expect(e.i18nKey).toBeUndefined();
		expect(e.detail).toBeUndefined();
	});
});

describe('authErrorText', () => {
	it('prefers a known code over everything else', () => {
		expect(authErrorText({ i18nKey: 'login.accountNotActivated', detail: 'raw' }, t))
			.toBe('t:login.accountNotActivated');
	});

	it('falls back to the backend detail', () => {
		expect(authErrorText({ detail: 'Credenciais inválidas' }, t)).toBe('Credenciais inválidas');
	});

	it('falls back to invalid credentials when there is nothing to show', () => {
		expect(authErrorText({}, t)).toBe('t:login.invalidCredentials');
		expect(authErrorText(undefined, t)).toBe('t:login.invalidCredentials');
	});

	it('never renders the axios message', () => {
		const err = axiosError(403, { detail: 'Conta não ativada.', code: 'user_inactive' });
		const mapped = Object.assign(err, { i18nKey: 'login.accountNotActivated', detail: 'Conta não ativada.' });
		expect(authErrorText(mapped, t)).not.toContain('Request failed with status code');
	});
});
