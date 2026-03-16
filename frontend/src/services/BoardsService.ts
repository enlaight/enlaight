import api from "./api";
import type { Boards, Token } from "@/types/boards";

export const BoardsService = {
	async get() {
		const { data } = await api.get<Boards>(`boards/`);
		return data;
	},

	async update(data: string) {
		const response = await api.put<Boards>(`boards/`, { data: data });
		return response;
	},
};
