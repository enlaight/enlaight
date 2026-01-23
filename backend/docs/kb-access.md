# Knowledge Base — Access & Linking (EN/PT)

## EN — How a non-admin sees a KB
To see/use a KB, the user must:
- belong to the Project, and
- the KB (`hash_id`) must be linked to that Project (via `KBLink`).
Admins/superusers are global.

Essential endpoints:
- Attach user to project (admin): `POST /api/projects/{project_id}/users/attach`
- Attach existing KB: `POST /api/kb/attach?project_id=<uuid>` with body `{ hash_id, name? }`
- Create new KB and auto-link: `POST /api/kb/create` with `{ project_id, name, description? }`
- Other KB ops (secured by the same rules):
  - `GET /api/kb/files/list?hash_id=...`
  - `PATCH /api/kb/edit`
  - `POST /api/kb/file/add`, `DELETE /api/kb/file/delete`, `PATCH /api/kb/file/update`
  - `GET /api/kb/list-all?project_id=...` (lists only KBs linked to that project)

Security: If the user isn’t in the project or the KB isn’t linked, responses are 403 without leaking existence.

Quick example:
1) Admin adds user to project → `POST /api/projects/<project>/users/attach`
2) Attach KB → `POST /api/kb/attach?project_id=<project_id>` with `{ hash_id }`
3) User accesses files → `GET /api/kb/files/list?hash_id=<hash_id>`