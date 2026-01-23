import api from "@/services/api";
import type { Client } from "@/types/client";

export async function listClients() {
	const { data } = await api.get<Client[]>("clients/");
	return data;
}

export async function createClient(client: { name: string }) {
	const { data } = await api.post<Client>("clients/", client);
	return data;
}

export async function updateClient(clientId: string, client: { name: string }) {
	const { data } = await api.patch<Client>(`clients/${clientId}/`, client);
	return data;
}

export async function deleteClient(clientId: string) {
	await api.delete(`clients/${clientId}/`);
}
