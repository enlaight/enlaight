import api, { tokens } from "./api";
import type {
	User,
	LoginResponse,
	RegisterPayload,
	ForgotPayload,
	ResetPayload,
} from "@/types/auth";

export class AuthService {
	static async login(email: string, password: string): Promise<LoginResponse> {
		const { data } = await api.post<LoginResponse>("login/", { email, password });
		tokens.set(data.access, data.refresh);
		return data;
	}

	static async register(payload: RegisterPayload) {
		const fd = new FormData();
		fd.append("email", payload.email);
		fd.append("username", payload.username);
		fd.append("password", payload.password);
		if (payload.first_name) fd.append("first_name", payload.first_name);
		if (payload.last_name) fd.append("last_name", payload.last_name);
		if (payload.avatar) fd.append("avatar", payload.avatar);
		const { data } = await api.post("create/", fd);
		return data;
		// optionally: after register, you might auto-login and store tokens if your API returns them
	}

	static async me(): Promise<User> {
		const { data } = await api.get<User>("me/");
		return data;
	}

	static async logout() {
		const refresh = tokens.refresh;
		if (!refresh) {
			tokens.clear();
			return;
		}
		try {
			await api.post("logout/", { refresh });
		} finally {
			tokens.clear();
		}
	}

	static async forgotPassword(payload: ForgotPayload) {
		const { data } = await api.post("forgot-password/", payload);
		return data;
	}

	static async resetPassword(payload: ResetPayload) {
		const { data } = await api.post("reset-password/", payload);
		return data;
	}
}
