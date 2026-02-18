import axios from "axios";
import { API_BASE_URL } from "@/lib/constants";

export const API_BASE = API_BASE_URL;

const AUTH_SCHEME = ((import.meta.env.VITE_AUTH_SCHEME as string) || "Bearer").trim();

const ACCESS_KEY = "enlaight_access_token";
const REFRESH_KEY = "enlaight_refresh_token";

export const tokenStore = {
	set(access?: string | null, refresh?: string | null) {
		if (access) localStorage.setItem(ACCESS_KEY, access);
		else localStorage.removeItem(ACCESS_KEY);

		if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
		else localStorage.removeItem(REFRESH_KEY);
	},
	clear() {
		localStorage.removeItem(ACCESS_KEY);
		localStorage.removeItem(REFRESH_KEY);
	},
	get access() {
		return (
			localStorage.getItem(ACCESS_KEY) ||
			localStorage.getItem("accessToken") ||
			localStorage.getItem("access")
		);
	},
	get refresh() {
		return (
			localStorage.getItem(REFRESH_KEY) ||
			localStorage.getItem("refreshToken") ||
			localStorage.getItem("refresh")
		);
	},
};

const api = axios.create({ baseURL: `${API_BASE}/` });
const existing = tokenStore.access;
if (existing) (api.defaults.headers.common as any).Authorization = `${AUTH_SCHEME} ${existing}`;

api.interceptors.request.use((cfg) => {
	const t = tokenStore.access;
	if (t) {
		if (!cfg.headers) cfg.headers = new axios.AxiosHeaders();
		cfg.headers.set('Authorization', `${AUTH_SCHEME} ${t}`);
	}
	return cfg;
});

let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
	const r = tokenStore.refresh;
	if (!r) return null;
	try {
		const { data } = await axios.post(`${API_BASE}/refresh/`, { refresh: r });
		if ((data as any)?.access) {
			tokenStore.set((data as any).access, r);
			return (data as any).access as string;
		}
	} catch (e) {
		console.error(e);
	}
	tokenStore.clear();
	return null;
}

api.interceptors.response.use(
	(r) => r,
	async (error) => {
		const res = error.response;
		const original: any = error.config || {};
		if (res?.status === 401 && !original._retry) {
			original._retry = true;

			refreshing = refreshing || doRefresh();
			const newAccess = await refreshing.finally(() => (refreshing = null));

			if (newAccess) {
				(original.headers ||= {}).Authorization = `${AUTH_SCHEME} ${newAccess}`;
				return api(original); // retry
			}
		}
		return Promise.reject(error);
	}
);

export const fetchUserData = async () => {
	const response = await api.get("me/");
	return response;
};
export const tokens = tokenStore;
export default api;
