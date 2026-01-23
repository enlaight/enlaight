export type User = {
	id: string;
	email: string;
	username: string;
	first_name: string;
	last_name: string;
	avatar: string | null;
	role: string;
	is_active: boolean;
};

export type LoginResponse = {
	access: string;
	refresh?: string;
	user?: User;
};

export type RegisterPayload = {
	email: string;
	username: string;
	first_name: string;
	last_name: string;
	password: string;
	avatar?: File | null;
};

export type ForgotPayload = { email: string };

export type ResetPayload = {
	token: string;
	new_password: string;
};
