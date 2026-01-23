import api from "./api";
import type { ChatSession } from "@/types/chatSession";

export const ChatSessionService = {
	async get() {
		const { data } = await api.get(`chat-session/`);
		return data;
	},

	async post(session_key: string, agent_id: string, first_message: string) {
		const { data } = await api.post<ChatSession>(`chat-session/`, { session_key, agent_id, first_message });
		return data;
	},

	async delete(session_key: string, agent_id: string) {
		const { data } = await api.delete<ChatSession>(`chat-session/`, { data: { session_key, agent_id } });
		return data;
	},
};
