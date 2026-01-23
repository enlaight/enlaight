export type Role = {
	value: string;
	label: string;
};

export type Client = {
	id: string;
	name: string;
};

export type InvitePayload = {
	email: string;
	role: string;
	client_id: string;
};
