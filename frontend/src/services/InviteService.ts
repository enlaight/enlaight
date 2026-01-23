import api from "@/services/api";

export type InvitePayload = {
	email: string;
	role: string;
	project_id: string;
	client_id?: string;
};

export type InviteErrorResponse = {
	field?: string;
	error?: string;
	message?: string;
};

export async function sendInvite(payload: InvitePayload) {
	const { data } = await api.post("invite/", payload);
	return data;
}

export async function confirmInvite(email: string, token: string, password: string) {
	const { data } = await api.post(`invite/confirm/?email=${encodeURIComponent(email)}&token=${token}`, {
		password
	});
	return data;
}
