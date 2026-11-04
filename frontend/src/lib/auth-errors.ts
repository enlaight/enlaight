/**
 * Turning an auth failure into something the user can read.
 *
 * Kept out of AuthService on purpose: AuthService imports the axios instance,
 * which reaches `import.meta.env.VITE_API_BASE_URL` at module load, so any
 * component importing it pulls that in too. This module is pure.
 */

/** A failed auth call, described in terms the UI can render. */
export type AuthError = Error & {
	/** Locale key for a backend `code` we recognise. */
	i18nKey?: string;
	/** The backend's own `detail`, for a failure we have no key for. */
	detail?: string;
	status?: number;
};

/** Backend `code` values mapped to locale keys. */
export const ERROR_CODE_KEYS: Record<string, string> = {
	user_inactive: "login.accountNotActivated",
};

/**
 * Attach what the UI needs to an axios rejection.
 *
 * `message` on an axios error is "Request failed with status code 403" — never
 * a user-facing string — so everything the user sees comes from `i18nKey` or
 * `detail` instead.
 */
export const toAuthError = (err: any): AuthError => {
	const res = err?.response;
	const code: unknown = res?.data?.code;
	const detail: unknown = res?.data?.detail;
	return Object.assign(err instanceof Error ? err : new Error("Auth request failed"), {
		i18nKey: typeof code === "string" ? ERROR_CODE_KEYS[code] : undefined,
		detail: typeof detail === "string" ? detail : undefined,
		status: res?.status,
	}) as AuthError;
};

/**
 * The one place that decides what an auth failure says to the user: a known
 * backend code first, then the backend's own detail, then the generic
 * invalid-credentials string. Takes `t` so this stays free of i18n wiring.
 */
export const authErrorText = (err: any, t: (key: string) => string): string => {
	if (err?.i18nKey) return t(err.i18nKey);
	if (typeof err?.detail === "string" && err.detail) return err.detail;
	return t("login.invalidCredentials");
};
