import api from "@/services/api";

export async function requestPasswordReset(email: string) {
	const { data } = await api.post("password/forgot/", { email });
	return data;
}

export async function resetPassword(email: string, token: string, new_password: string) {
	const { data } = await api.post(`password/reset/?email=${encodeURIComponent(email)}&token=${token}`, {
		new_password
	});
	return data;
}
