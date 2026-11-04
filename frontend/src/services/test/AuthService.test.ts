import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted above these declarations, so the stubs it closes over
// have to be created with vi.hoisted rather than as plain consts.
const { post, set } = vi.hoisted(() => ({ post: vi.fn(), set: vi.fn() }));

vi.mock('@/services/api', () => ({
	default: { post },
	tokens: { set, clear: vi.fn() },
	__esModule: true,
}));

import { AuthService } from '@/services/AuthService';

/** Stand-in for what axios rejects with: `message` is never user-facing. */
const axiosError = (status: number, data: unknown) =>
	Object.assign(new Error(`Request failed with status code ${status}`), {
		response: { status, data },
		isAxiosError: true,
	});

const t = (key: string) => `t:${key}`;

beforeEach(() => {
	post.mockReset();
	set.mockReset();
});

describe('AuthService.login', () => {
	it('stores the access token on success', async () => {
		post.mockResolvedValue({ data: { access: 'tok' } });
		await expect(AuthService.login('a@b.c', 'pw')).resolves.toEqual({ access: 'tok' });
		expect(set).toHaveBeenCalledWith('tok');
	});

	it('maps the inactive-account code to a locale key', async () => {
		post.mockRejectedValue(axiosError(403, { detail: 'Conta não ativada.', code: 'user_inactive' }));
		await expect(AuthService.login('a@b.c', 'pw')).rejects.toMatchObject({
			i18nKey: 'login.accountNotActivated',
			detail: 'Conta não ativada.',
			status: 403,
		});
	});

	it('carries the backend detail through for a code it does not know', async () => {
		post.mockRejectedValue(axiosError(400, { detail: 'Something specific', code: 'brand_new' }));
		await expect(AuthService.login('a@b.c', 'pw')).rejects.toMatchObject({
			i18nKey: undefined,
			detail: 'Something specific',
		});
	});

	it('does not store a token when login fails', async () => {
		post.mockRejectedValue(axiosError(401, { detail: 'Credenciais inválidas' }));
		await expect(AuthService.login('a@b.c', 'pw')).rejects.toBeTruthy();
		expect(set).not.toHaveBeenCalled();
	});
});
