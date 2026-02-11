# Knowledge Base (KB) Integration Flow

**Application:** Enlaight  
**Purpose:** Describe how Knowledge Bases are created, stored, managed, and accessed across the system.

---

## Overview

Knowledge Bases (KBs) in Enlaight are document repositories that agents can access to provide informed responses. This document explains how KBs are created, configured, stored, and accessed by agents and users.

---

## Key Components

### 1. n8n Service – Knowledge Base Backend

- Runs on port `5678` (localhost)
- Docker container: `n8n_dev`
- Database: PostgreSQL
- File storage: n8n local or configured external storage
- Handles KB lifecycle via webhooks

**Main Webhook Endpoints**

| Method | Endpoint | Description |
|------|---------|------------|
| POST | `/webhook/kb/create/` | Create new KB |
| POST | `/webhook/kb/file/add` | Upload file |
| DELETE | `/webhook/kb/file/delete` | Remove file |
| PATCH | `/webhook/kb/file/update` | Replace file |
| GET | `/webhook/kb/get/` | Retrieve KB metadata |
| GET | `/webhook/kb/list-all` | List all KBs |

---

### 2. Backend (Django) – KB Management Layer

- ORM Model: `KBLink`
- REST API for KB operations
- Proxies requests to n8n
- Enforces tenant isolation
- Database: MySQL (references only, no files)

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
````

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

File: `n8n/create_sample_kb.py`

* Creates KB via webhook
* Links KB to project
* Uploads sample files

---

## Database Structure & Storage

### Local Database (MySQL)

**Table:** `kb_links`

| Column      | Type         | Description     |
| ----------- | ------------ | --------------- |
| id          | UUID         | Local reference |
| external_id | VARCHAR(128) | n8n `hash_id`   |
| name        | VARCHAR(255) | KB name         |
| project_id  | UUID         | Linked project  |

**Constraint:** `UNIQUE(project_id, external_id)`

---

### n8n Storage

```text
{hash_id}/
  ├── document1.pdf
  ├── document2.txt
  ├── FAQ.md
```

* Files stored in n8n filesystem
* Metadata stored in PostgreSQL
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

All failures return `403`.

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

## Agent Usage

* Agents do not link directly to KBs in backend
* n8n workflows reference KBs internally
* Backend enforces access control only
* Agents choose KBs at workflow level

---

## Environment Configuration

```env
N8N_BASE_URL=https://n8n.enlaight.ai
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

* Service: `KnowledgeBaseService.ts`
* Components:

  * `AddEditKBModal.tsx`
  * `ManageFilesModal.tsx`

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