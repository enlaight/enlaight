import api from "./api";

export interface Bot {
	id: string;
	name: string;
	description?: string;
	url_n8n: string;
}

export class BotsService {
	static async list(): Promise<Bot[]> {
		const { data } = await api.get<Bot[]>("bots/");
		return data;
	}
}
