import api from "@/services/api";
import type { Paginated } from "@/types/paginated";
import type { User } from "@/types/user";

export async function listUsers(page: number, pageSize: number, search?: string) {
	return api
		.get("users/", {
			params: { page, page_size: pageSize, ...(search ? { search } : {}) },
		})
		.then((r) => r.data);
}
