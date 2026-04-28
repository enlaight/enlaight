import api from "@/services/api";
import type { PaginatedResponse } from "@/types/paginatedResponse";
import type { User } from "@/types/user";

export async function listUsers(page: number, pageSize: number, search?: string): Promise<PaginatedResponse<User>> {
	return api
		.get<PaginatedResponse<User>>("users/", {
			params: { page, page_size: pageSize, ...(search ? { search } : {}) },
		})
		.then((r) => r.data);
}
