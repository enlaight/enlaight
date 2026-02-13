export type UserRole = 'ADMINISTRATOR' | 'MANAGER' | 'USER';

export type User = {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
	username: string;
	role: UserRole;
	is_active: boolean;
	date_joined: string; // ISO string
	job_title?: string | null;
	department?: string | null;
	avatar?: string | null;
	client_id?: string | null;
	projects?: string[];
	status?: string | null;
};
