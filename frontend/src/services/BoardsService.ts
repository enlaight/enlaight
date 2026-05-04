import api from "./api";
import type { Boards } from "@/types/boards";

export const BoardsService = {
	async get() {
		const { data } = await api.get<Boards>(`boards/`);
		return data;
	},

	async update(config: string, boardId: string) {
		const response = await api.patch<Boards>(`boards/${boardId}/`, { config });
		return response;
	},

	async create(projectId: string) {
		const { data } = await api.post<Boards>(`boards/`, { project_id: projectId });
		return data;
	},
};
