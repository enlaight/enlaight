import api from "@/services/api";
import type { Paginated } from "@/types/paginated";

export interface Expertise {
	id: string;
	name: string;
	description?: string;
}

export const ExpertiseService = {
	list() {
		return api.get<Paginated<Expertise>>("expertise-areas/").then((r) => r.data);
	},

	create(payload: { name: string; description?: string }) {
		return api.post<Expertise>("expertise-areas/", payload).then((r) => r.data);
	},
};
