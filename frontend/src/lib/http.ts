import axios from "axios";
import { getAccessToken, setAccessToken, getRefreshToken } from "@/lib/token-store";
import { API_BASE_URL } from "@/lib/constants";

const API_BASE = API_BASE_URL;

const http = axios.create({ baseURL: API_BASE });

// Acess token in every request
http.interceptors.request.use((config) => {
	const token = getAccessToken();
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

http.interceptors.response.use(
	(r) => r,
	async (error) => {
		const original = error.config;
		if (error.response?.status === 401 && !original._retry) {
			original._retry = true;
			try {
				const refresh = getRefreshToken();
				if (!refresh) throw new Error("No refresh token");
				const { data } = await axios.post(
					`${API_BASE}/refresh/`,
					{ refresh },
					{ withCredentials: true }
				);
				setAccessToken((data as any).access);
				original.headers.Authorization = `Bearer ${(data as any).access}`;
				return http(original);
			} catch {
				// optionally handle token refresh failure
			}
		}
		return Promise.reject(error);
	}
);

export default http;
