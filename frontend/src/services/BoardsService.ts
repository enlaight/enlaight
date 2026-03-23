import api from "./api";
import type { Boards } from "@/types/boards";

export const BoardsService = {
	async get() {
		const { data } = await api.get<Boards>(`boards/`);
		return data;
	},

	async update(data: string, projectId?: string) {
		const response = await api.patch<Boards>(`boards/${projectId}`, { data: data });
		return response;
	},
};
