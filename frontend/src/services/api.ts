import axios from "axios";
import { API_BASE_URL } from "@/lib/constants";

export const API_BASE = API_BASE_URL;

const AUTH_SCHEME = ((import.meta.env.VITE_AUTH_SCHEME as string) || "Bearer").trim();

// Access token lives only in memory — never written to localStorage.
// It is lost on page close/hard refresh and silently restored via the
// httpOnly refresh cookie by the 401 interceptor below.
let _accessToken: string | null = null;

export const tokenStore = {
	set(access?: string | null) {
		_accessToken = access ?? null;
	},
	clear() {
		_accessToken = null;
	},
	get access() {
		return _accessToken;
	},
};

const api = axios.create({ baseURL: `${API_BASE}/`, withCredentials: true });

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
	try {
		// No body needed — the browser sends the httpOnly refresh cookie automatically
		// because withCredentials: true is set on both the instance and this call.
		const { data } = await axios.post(`${API_BASE}/refresh/`, {}, { withCredentials: true });
		if ((data as any)?.access) {
			tokenStore.set((data as any).access);
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
