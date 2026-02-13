import api from "./api";
import type { Bot } from "@/types/bots";

export const BotService = {
	async list(params?: { page?: number; page_size?: number; search?: string; active?: boolean }) {
		const { data } = await api.get<{
			count: number;
			next: string | null;
			previous: string | null;
			results: Bot[];
		}>("/bots/", { params });
		return data;
	},

	async get(id: string) {
		const { data } = await api.get<Bot>(`/bots/${id}/`);
		return data;
	},

	async create(payload: {
		name: string;
		description?: string;
		url_n8n: string;
		active?: boolean;
	}) {
		const { data } = await api.post<Bot>("/bots/", payload);
		return data;
	},

	async patch(
		id: string,
		payload: Partial<Pick<Bot, "name" | "description" | "url_n8n">> & {
			projects?: string[];
			expertise_area?: string | null;
		}
	) {
		const { data } = await api.patch<Bot>(`/bots/${id}/`, payload);
		return data;
	},

	async setExpertise(id: string, expertiseIdOrNull: string | null) {
		const { data } = await api.post<Bot>(`/bots/${id}/expertise/`, {
			expertise_area: expertiseIdOrNull,
		});
		return data;
	},

	async updateProjects(id: string, projectIds: string[]) {
		const { data } = await api.patch<Bot>(`/bots/${id}/`, { projects: projectIds });
		return data;
	},

	async remove(id: string) {
		await api.delete(`/bots/${id}/`);
	},
};
