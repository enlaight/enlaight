import axios from "axios";
import { API_BASE_URL } from "@/lib/constants";

const API_BASE = API_BASE_URL;

const ACCESS_KEY = "access";
const REFRESH_KEY = "refresh";

export function getAccessToken() {
	return localStorage.getItem(ACCESS_KEY);
}
export function getRefreshToken() {
	return localStorage.getItem(REFRESH_KEY);
}
export function setAccessToken(t: string | null) {
	if (t) localStorage.setItem(ACCESS_KEY, t);
	else localStorage.removeItem(ACCESS_KEY);
}
export function setRefreshToken(t: string | null) {
	if (t) localStorage.setItem(REFRESH_KEY, t);
	else localStorage.removeItem(REFRESH_KEY);
}
export function clearTokens() {
	localStorage.removeItem(ACCESS_KEY);
	localStorage.removeItem(REFRESH_KEY);
}

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
	const token = getAccessToken();
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

// Automatic token refresh on 401
let isRefreshing = false;
let pending: Array<(t: string) => void> = [];

api.interceptors.response.use(
	(r) => r,
	async (error) => {
		const original = error.config as any;
		if (error.response?.status === 401 && !original._retried) {
			original._retried = true;

			if (!isRefreshing) {
				isRefreshing = true;
				try {
				const { data } = await axios.post(`${API_BASE}/token/refresh/`, {
					refresh: getRefreshToken(),
				});
					setAccessToken((data as any).access);
					pending.forEach((cb) => cb((data as any).access));
					pending = [];
					return api(original);
				} catch (e) {
					pending = [];
					clearTokens();
					return Promise.reject(e);
				} finally {
					isRefreshing = false;
				}
			}

			// wait for the token to be refreshed
			return new Promise((resolve) => {
				pending.push((newToken) => {
					original.headers.Authorization = `Bearer ${newToken}`;
					resolve(api(original));
				});
			});
		}
		return Promise.reject(error);
	}
);

export default api;
