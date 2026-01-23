export type ProjectSummary = {
	id: string;
	name: string;
};

export type ExpertiseArea = {
	id: string;
	name: string;
	description?: string | null;
};

export type ChatSession = {
	id: string;
	data: string;
	agent: string;
	session_key: string;
	user: string;
	updated_at?: string | null;
}

export type Bot = {
	id: string;
	name: string;
	image: string;
	description?: string | null;
	url_n8n: string;
	expertise_area: ExpertiseArea | null;
	projects: ProjectSummary[];
	sessionKey?: string | null;
	chat_sessions?: ChatSession[] | null;
};
