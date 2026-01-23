import { PaginatedResponse } from "@/types/paginatedResponse";
import { Project } from "@/types/project";
import api from "@/services/api";
import { Bot } from "@/types/bots";

export async function listProjects(
	page: number,
	pageSize: number,
	search?: string
): Promise<PaginatedResponse<Project>> {
	return api
		.get<PaginatedResponse<Project>>("projects/", {
			params: {
				page,
				page_size: pageSize,
				...(search ? { search } : {}),
			},
		})
		.then((r) => r.data);
}

export const ProjectService = {
	create(data: { name: string; description?: string; client_id: string }) {
		return api.post<Project>("projects/", data).then((r) => r.data);
	},

	edit(projectId: string, data: { name: string; description?: string; client_id: string }) {
		return api.patch<Project>(`projects/${projectId}/`, data).then((r) => r.data);
	},

	delete(projectId: string) {
		return api.delete(`projects/${projectId}/`).then((r) => r.data);
	},

	bots(projectId: string) {
		return api.get<Bot[]>(`projects/${projectId}/bots/`).then((r) => r.data);
	},

	attachBots(projectId: string, ids: string[]) {
		const payload = ids.length === 1 ? { bot_id: ids[0] } : { bot_ids: ids };
		return api
			.post<{
				attached_now: string[];
				already_attached: string[];
				missing: string[];
				count_total: number;
			}>(`projects/${projectId}/bots/attach/`, payload)
			.then((r) => r.data);
	},

	detachBots(projectId: string, ids: string[]) {
		const payload = ids.length === 1 ? { bot_id: ids[0] } : { bot_ids: ids };
		return api
			.post<{
				detached_now: string[];
				not_attached: string[];
				missing: string[];
				count_total: number;
			}>(`projects/${projectId}/bots/detach/`, payload)
			.then((r) => r.data);
	},

	attachUsers(projectId: string, userIds: string[]) {
		return api.post(`projects/${projectId}/users/attach/`, { user_ids: userIds });
	},

	detachUsers(projectId: string, userIds: string[]) {
		return api.post(`projects/${projectId}/users/detach/`, { user_ids: userIds });
	},
};
