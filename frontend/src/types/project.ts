export type Project = {
	id: string;
	name: string;
	client?: string | { id: string; name?: string } | null;
	client_id?: string | null;
	description?: string | null;
	created_at?: string;
	updated_at?: string;
};
