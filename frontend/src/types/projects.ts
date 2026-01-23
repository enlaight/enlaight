import type { Bot } from "./bots";

export interface Project {
	id: string;
	name: string;
	client: string;
	created_at: string;
	updated_at: string | null;
	bots: Bot[];
}
