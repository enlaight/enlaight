import api from "./api";

export const FavoritesService = {
	async get() {
		try {
			const { data } = await api.get(`chat-favorites/`);
			return data;
		} catch (err) {
			console.error(err);
			return [];
		}
	},

	async post(session_key: string, agent_id: string, message_id: string, text: string) {
		if (!session_key || !agent_id || !message_id) return null;
		const { data } = await api.post(`chat-favorites/`, { session_key, agent_id, message_id, text });
		return data;
	},

	async delete(message_id: string) {
		if (!message_id) return false;
		try {
			await api.delete(`chat-favorites/${message_id}`);
			return true;
		} catch (err) {
			console.error(err);
			return false;
		}
	}
};
