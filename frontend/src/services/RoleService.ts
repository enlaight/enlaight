import api from "@/services/api";
import type { Role } from "@/types/role";

export async function listRoles() {
	const { data } = await api.get<{ roles: Role[] }>("roles/");
	return data.roles;
}
