# Knowledge Base (KB) Integration Flow

## Overview

Knowledge Bases (KBs) in Enlaight are document repositories that assistants can access to provide informed responses. This document explains how KBs are created, configured, stored, and accessed by assistants/agents and users.

---

## Key Components

### 1. n8n Service – Knowledge Base Backend

- Runs on port `5678` (localhost)
- Docker container: `n8n` (see `container_name` in `docker-compose.yml`)
- Database: PostgreSQL `n8n_enlaight_db` — holds n8n's own tables, the
  `enlaight_knowledge_bases` registry and the PGVector tables
- File storage: n8n local or configured external storage
- Handles KB lifecycle via webhooks

**Main Webhook Endpoints**

Paths below are the live registered paths, taken from the `path` parameter of each
workflow's webhook node and cross-checked against the `target_path` the Django proxy
view calls.

| Method | n8n webhook path | Django route | Workflow |
|---|---|---|---|
| POST | `/webhook/kb/create/` | `POST /api/kb/create/` | `create-kb.json` |
| GET | `/webhook/kb/get/` | `GET /api/kb/get/` | `get-kb.json` |
| GET | `/webhook/kb/list-all` | `GET /api/kb/list-all/` | `get-all-kb.json` |
| PATCH | `/webhook/kb/edit/` | `PATCH /api/kb/edit/` | `edit-kb.json` |
| DELETE | `/webhook/kb/delete` | `DELETE /api/kb/delete/` | `delete-kb.json` |
| POST | `/webhook/kb/file/add` | `POST /api/kb/file/add/` | `add-file-kb.json` |
| DELETE | `/webhook/webhook/kb/file/delete` | `DELETE /api/kb/file/delete/` | `delete-files-kb.json` |
| GET | `/webhook/webhook/kb/file/list` | `GET /api/kb/files/list/` | `list-files-kb.json` |

Two things in that table are deliberate records of the current state, not typos:

- **The doubled `/webhook/webhook/` prefix is real.** The webhook nodes in
  `delete-files-kb.json` and `list-files-kb.json` have `path` values that already begin
  with `webhook/`, and n8n prefixes `/webhook/` again. The Django views match it
  exactly (`kb_file_delete.py:24`, `kb_list.py:17`), so both calls work — but the paths
  are inconsistent with every other endpoint. Normalizing them means changing the
  workflow and the view together; that is **EN-136**.
- **`PATCH /api/kb/file/update/` has no n8n webhook of its own.** `kb_update.py`
  composes it from the add and delete webhooks (`target_add`, `target_del`), so a file
  replacement is an add followed by a delete. Earlier revisions of this document listed a
  `/webhook/kb/file/update` endpoint; no such webhook exists.

`delete-kb.json` registers its path as `/kb/delete` while `kb_delete.py:24` calls
`/webhook/kb/delete/` with a trailing slash. Confirm this pair against a running
instance before relying on it.

---

### 2. Backend (Django) – KB Management Layer

- ORM Model: `KBLink`
- REST API for KB operations
- Proxies requests to n8n
- Enforces tenant isolation
- Database: PostgreSQL `enlaight_database` (references only, no files)

---

### 3. Frontend (React + TypeScript)

- Displays KBs per project
- Manages file upload and deletion
- Uses `KnowledgeBaseService`
- Core components:
  - `AddEditKBModal`
  - `ManageFilesModal`

---

## Architecture & Flow

### Knowledge Base Creation

#### Method 1: Frontend UI (Recommended)

1. User navigates to **Project → Knowledge Bases**
2. Clicks **Create New KB**
3. Completes name and description
4. Frontend calls:

```http
POST /api/kb/create/
```

```json
{
  "name": "Customer Support KB",
  "description": "FAQs and support documents",
  "project_id": "<project_uuid>"
}
```

**Backend Flow**

* Auth validation (JWT)
* Project access verification
* Forward request to n8n
* Receive `hash_id`
* Create `KBLink` record
* Return metadata to frontend

---

#### Method 2: Direct n8n Creation

* Admin creates KB in n8n UI
* Receives `hash_id`
* Frontend attaches KB:

```http
POST /api/kb/attach/?project_id=<project_id>
```

---

#### Method 3: Python Automation

> ⚠️ **Not shipped in this repository.** `create_defaults.sh` looks for
> `n8n/scripts/create_sample_kb.py` and, not finding it, prints a yellow "skipped"
> notice and carries on (`create_defaults.sh:28-50`). `n8n/scripts/` contains only
> `create_n8n_workflow.py`, `youscan_collect_mentions.py` and
> `youscan_normalize_mentions.py`. The description below records what the script did,
> for whoever restores it.

A script at `n8n/scripts/create_sample_kb.py` would:

* Create a KB via webhook
* Link the KB to a project
* Upload sample files

---

## Database Structure & Storage

A knowledge base is recorded in **two** tables, in two different databases. They are not
alternative names for one another, and both are required.

### Application database — `enlaight_database`

Django's own record, mapping a project to a KB. This is the tenant-isolation boundary:
`project_id` exists only here, which is why n8n can stay project-agnostic.

**Table:** `kb_links` (Django model `KBLink`, `backend/src/authentication/models/kb.py`)

| Column      | Type         | Description     |
| ----------- | ------------ | --------------- |
| id          | UUID         | Local reference |
| external_id | VARCHAR(128) | n8n `hash_id`   |
| name        | VARCHAR(255) | KB name         |
| project_id  | UUID         | Linked project  |

**Constraint:** `UNIQUE(project_id, external_id)`

### n8n database — `n8n_enlaight_db`

n8n's own KB registry, keyed by the `hash_id` that `external_id` above points at. The KB
CRUD workflows query this table, and the vector tables that hold the indexed document
chunks sit beside it in the same database, reached by the same credential.

**Table:** `enlaight_knowledge_bases`

| Queried by | For |
|---|---|
| `create-kb.json`, `edit-kb.json`, `delete-kb.json` | KB lifecycle |
| `get-kb.json`, `get-all-kb.json` | Metadata reads |
| `add-file-kb.json`, `list-files-kb.json`, `delete-files-kb.json` | Guarding file operations by `hash_id` |

Related tables in the same database: `n8n_vectors` and `n8n_vector_collections`, written
by the PGVector Store node.

> ⚠️ **Nothing in this repository creates `enlaight_knowledge_bases`.**
> `postgres/init/01-init-databases.sql` creates only the `n8n` role and the
> `n8n_enlaight_db` database, so a fresh install fails with
> `relation "enlaight_knowledge_bases" does not exist`. Supplying it at init is
> **EN-143**.

---

### n8n Storage

```text
{hash_id}/
  ├── document1.pdf
  ├── document2.txt
  ├── FAQ.md
```

* Files stored in n8n filesystem
* Metadata stored in `enlaight_knowledge_bases` in `n8n_enlaight_db`; document chunks and
  their embeddings in `n8n_vectors` / `n8n_vector_collections`
* Accessed only via webhooks

---

## Backend Integration

### KB Listing

```http
GET /api/kb/list-all/?project_id=<project_id>
```

* Queries `KBLink`
* Fetches KB metadata from n8n
* Returns project-scoped KBs

---

### File Management

| Action     | Endpoint                      |
| ---------- | ----------------------------- |
| List files | `GET /api/kb/files/list/`     |
| Upload     | `POST /api/kb/file/add/`      |
| Delete     | `DELETE /api/kb/file/delete/` |
| Update     | `PATCH /api/kb/file/update/`  |

All operations:

* Validate access
* Forward to n8n
* Return webhook response

---

## Access Control & Authorization

**Permission Function:** `assert_user_kb_access()`

Access is granted if:

* User is admin or superuser **OR**
* KB exists **AND**
* KB is linked to a project **AND**
* User belongs to that project

A failed permission check returns `403`. Other error responses these
endpoints can produce: `400` (missing query/body fields), `404` (project or
KB not found), `500` (n8n config missing — `N8N_BASE_URL` / `N8N_KB_KEY`),
`502` (n8n returned a non-JSON or otherwise invalid response), `504` (n8n
request timed out). The full status-code catalogue lives in
[docs/openapi.md](../openapi.md#4-error-responses).

---

## Frontend Integration

### KnowledgeBaseService

```ts
listAll(projectId)
create(data)
edit(data)
delete(hashId)
listFiles(hashId)
addFile(hashId, projectId, file)
deleteFile(hashId, fileName)
updateFile(hashId, projectId, newFile)
```

---

### UI Components

**AddEditKBModal**

* Create/edit KB metadata

**ManageFilesModal**

* Upload
* Delete
* Replace files

---

## Assistant/Agent Usage

* Assistants/agents do not link directly to KBs in backend
* n8n workflows reference KBs internally
* Backend enforces access control only
* Assistants choose KBs at workflow level

---

## Environment Configuration

```env
N8N_BASE_URL=https://n8n.enlaight.example
N8N_KB_KEY=your_key
N8N_TIMEOUT=15
```

---

## Security & Tenant Isolation

* Project-based access control
* All KB operations validated locally
* n8n remains project-agnostic
* Backend acts as isolation layer

---

## Key File Locations

### Backend

* Models: `backend/src/authentication/models/kb.py`
* Views: `backend/src/authentication/views/kb*.py`
* Permissions: `permissions.py`

### Frontend

* Service: `frontend/src/services/KnowledgeBaseService.ts`
* Components:

  * `frontend/src/components/AddEditKBModal.tsx`
  * `frontend/src/components/ManageFilesModal.tsx`

---

## Troubleshooting

**KB not appearing**

* Check project linkage
* Verify `KBLink` exists

**File upload fails**

* Verify n8n service
* Check env variables
* Confirm project access

**Permission denied**

* Verify user-project relationship
* Verify KB linkage

---

## Workflow Summary

1. KB created via UI or n8n
2. Backend stores `KBLink`
3. Files stored in n8n
4. Access enforced by backend
5. Agents consume KBs via n8n workflows