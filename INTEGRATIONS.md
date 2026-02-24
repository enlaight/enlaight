# Enlaight — Architecture & Integrations

This document explains every component of the Enlaight platform, what it is responsible for, and how it communicates with the other parts of the system.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Frontend](#2-frontend)
3. [Backend API](#3-backend-api)
4. [n8n Workflow Engine](#4-n8n-workflow-engine)
5. [Databases](#5-databases)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Knowledge Base Pipeline](#7-knowledge-base-pipeline)
8. [Data Ingestion Pipeline (YouScan)](#8-data-ingestion-pipeline-youscan)
9. [Superset (BI)](#9-superset-bi)
10. [Docker Networking](#10-docker-networking)
11. [Environment Variables Reference](#11-environment-variables-reference)

---

## 1. High-Level Architecture

```
                        ┌─────────────────────────────────────────────────────┐
                        │                    Browser / Client                  │
                        └────────────┬──────────────────────┬─────────────────┘
                                     │ HTTP REST             │ Webhook (chat)
                                     ▼                       ▼
              ┌──────────────────────────┐      ┌─────────────────────────────┐
              │      Frontend            │      │         n8n                  │
              │  React 18 + Vite         │      │  Workflow Automation         │
              │  Port 8080               │      │  Port 5678                   │
              └──────────┬───────────────┘      └──────┬───────────┬───────────┘
                         │ REST + JWT                   │           │
                         ▼                              │           │
              ┌──────────────────────────┐              │           │
              │      Backend API         │◄─────────────┘           │
              │  Django 5 + DRF          │  Webhook proxy           │
              │  Port 8000               │                          │
              └────┬────────┬────────────┘                          │
                   │        │                                        │
                   ▼        ▼                                        ▼
         ┌─────────────┐  ┌───────────────┐            ┌────────────────────────┐
         │    MySQL     │  │    Redis       │            │      PostgreSQL         │
         │  Port 3306   │  │  Port 6379     │            │  + PGVector extension  │
         │  (app data)  │  │  (cache)       │            │  Port 5432             │
         └─────────────┘  └───────────────┘            └────────────────────────┘
```

**Communication summary:**

| From | To | Protocol | Auth |
|---|---|---|---|
| Browser | Frontend | HTTP | — |
| Frontend | Backend API | HTTPS REST | JWT Bearer token |
| Frontend | n8n | HTTPS Webhook | None (public chat webhook) |
| Backend | n8n | HTTPS Webhook | `N8N_KB_KEY` header |
| Backend | MySQL | TCP | DB credentials |
| Backend | Redis | TCP | — |
| n8n | PostgreSQL | TCP | DB credentials |

---

## 2. Frontend

**Stack:** React 18 · TypeScript · Vite 7 · React Router 6 · Axios · TanStack Query 5 · Zustand · shadcn/ui + Tailwind CSS

### Responsibilities

- Renders the full Enlaight SPA (single-page application).
- Manages JWT token lifecycle (storage, refresh, injection into every request).
- Embeds the n8n chat widget for agent conversations.
- Optionally embeds Superset dashboards via guest token.

### Pages & Routes

| Route | Page | Description |
|---|---|---|
| `/login` | Login | Email + password authentication |
| `/signup` | Sign Up | New account registration |
| `/forgot-password` | Forgot Password | Trigger password reset email |
| `/reset-password` | Reset Password | Consume reset token |
| `/confirm-invite` | Confirm Invite | Accept user invitation |
| `/` | Dashboard | Main landing after login |
| `/search` | Search | Global semantic search (proxied via n8n) |
| `/favorites` | Favorites | Saved chat threads |
| `/assistantmanagement` | Bot Management | Create / edit AI agents |
| `/knowledgebases` | Knowledge Bases | Manage document collections |
| `/userlist` | User List | Admin: manage users |
| `/assistantlist` | Assistant List | Browse available agents |
| `/projectslist` | Projects | Manage client projects |
| `/clientmanagement` | Clients | Manage client organisations |
| `/addusers` | Add Users | Invite new users |
| `/user/:id` | User Detail | View / edit a single user |

### API Communication

All HTTP calls go through a shared Axios instance configured in `src/lib/http.ts`:

- **Base URL:** `VITE_API_BASE_URL` environment variable (e.g. `http://localhost:8000/api` locally).
- **Auth header:** `Authorization: Bearer <access_token>` injected automatically via request interceptor.
- **Token storage:** `localStorage` keys `enlaight_access_token` and `enlaight_refresh_token`.
- **Auto-refresh:** On a `401` response the interceptor silently calls `POST /api/refresh/` with the refresh token and retries the original request.

### n8n Chat Integration

The frontend communicates **directly** with n8n for real-time chat sessions — the backend is not involved in the message exchange:

- Embedded via the `@n8n/chat` v0.65 widget (`AgentsChatContext`).
- Each bot/agent record in the DB stores its own n8n webhook URL.
- Environment variables for built-in agents:
  - `VITE_N8N_CHAT_URL` — main data-analyst agent chat endpoint.
  - `VITE_N8N_SUPPORT_ASSISTANT_URL` — support assistant chat endpoint.

---

## 3. Backend API

**Stack:** Django 5.2 · Django REST Framework · drf-yasg (OpenAPI/Swagger) · djangorestframework-simplejwt · Python 3.11

**Swagger UI:** `http://localhost:8000/swagger/`

### Responsibilities

- Owns all business logic: users, clients, projects, agents, chat sessions, boards, expertise areas, knowledge-base metadata.
- Acts as a **secure proxy** between the frontend and n8n for all Knowledge Base operations — the frontend never holds the `N8N_KB_KEY` secret.
- Issues and validates JWT tokens.
- Sends invitation and password-reset emails via SMTP.

### API Endpoints

#### Authentication

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/login/` | Email + password → access + refresh tokens |
| `POST` | `/api/refresh/` | Refresh token → new access token |
| `POST` | `/api/logout/` | Blacklist refresh token |
| `GET` | `/api/me/` | Current user profile |
| `POST` | `/api/me/update/` | Update current user profile |
| `POST` | `/api/verify-token/` | Check whether a token is valid |
| `POST` | `/api/password/forgot/` | Send password-reset email |
| `POST` | `/api/password/reset/` | Consume reset token + set new password |

#### Users & Roles

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users/` | List all users |
| `GET` | `/api/users/<user_id>/roles/` | Get roles for a user |
| `POST` | `/api/users/<user_id>/roles/add/` | Assign role to user |
| `POST` | `/api/users/<user_id>/roles/remove/` | Remove role from user |
| `GET` | `/api/roles/` | List all available roles |
| `POST` | `/api/login-as/<user_id>/` | Admin: impersonate another user |
| `POST` | `/api/invite/` | Send invitation email |
| `POST` | `/api/invite/confirm/` | Accept invitation + create account |

#### Clients & Projects

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/api/clients/` | List or create clients |
| `GET/PATCH/DELETE` | `/api/clients/<id>/` | Retrieve, update, or delete a client |
| `GET/POST` | `/api/projects/` | List or create projects |
| `GET/PATCH/DELETE` | `/api/projects/<id>/` | Retrieve, update, or delete a project |

#### Agents (Bots)

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/api/bots/` | List or create agents |
| `GET/PATCH/DELETE` | `/api/bots/<id>/` | Retrieve, update, or delete an agent |
| `POST` | `/api/bots/<id>/expertise/` | Set expertise area for an agent |

#### Knowledge Base (Proxy → n8n)

The backend forwards these calls to n8n webhooks, injecting the `N8N_KB_KEY` secret that the frontend never sees.

| Method | Path | n8n webhook called |
|---|---|---|
| `GET` | `/api/kb/list-all/` | `GET /webhook/kb/list-all/` |
| `GET` | `/api/kb/get/` | `GET /webhook/kb/get/` |
| `POST` | `/api/kb/create/` | `POST /webhook/kb/create/` |
| `POST` | `/api/kb/edit/` | `POST /webhook/kb/edit/` |
| `DELETE` | `/api/kb/delete/` | `DELETE /webhook/kb/delete/` |
| `GET` | `/api/kb/files/list/` | `GET /webhook/kb/file/list/` |
| `POST` | `/api/kb/file/add/` | `POST /webhook/kb/file/add/` |
| `PATCH` | `/api/kb/file/update/` | `PATCH /webhook/kb/file/update/` |
| `DELETE` | `/api/kb/file/delete/` | `DELETE /webhook/kb/file/delete/` |
| `POST` | `/api/kb/attach/` | Links KB to a project in MySQL |

#### Other Endpoints

| Method | Path | Description |
|---|---|---|
| `GET/POST/DELETE` | `/api/chat-session/` | Manage chat sessions |
| `GET/POST/DELETE` | `/api/chat-favorites/` | Manage favourite chats |
| `GET/POST/PATCH/DELETE` | `/api/boards/` | Manage dashboard boards |
| `GET/POST/PATCH/DELETE` | `/api/expertise-areas/` | Manage expertise areas |
| `GET` | `/api/search/` | Semantic search (proxied to n8n) |
| `POST` | `/api/i18n/translate/` | Translate text |
| `POST` | `/api/i18n/translate/batch/` | Batch translate |
| `POST` | `/api/superset/guest-token/` | Get Superset embedded guest token |
| `GET` | `/api/health/` | Service health check |
| `GET` | `/api/health/db/` | Database health check |

### How the Backend calls n8n

```python
# Pattern used in all KB view files
import requests
from django.conf import settings

response = requests.post(
    f"{settings.N8N_BASE_URL}/webhook/kb/create/",
    headers={"key": settings.N8N_KB_KEY},
    json={"name": name, "description": description},
    timeout=settings.N8N_TIMEOUT,  # default: 15 s
)
```

Relevant environment variables:

| Variable | Description |
|---|---|
| `N8N_BASE_URL` | Base URL of the n8n instance (e.g. `http://n8n:5678` inside Docker) |
| `N8N_KB_KEY` | Shared secret injected as the `key` header in every webhook call |
| `N8N_TIMEOUT` | HTTP request timeout in seconds (default `15`) |

---

## 4. n8n Workflow Engine

**Version:** 1.113.0 (self-hosted)
**Local UI:** `http://localhost:5678`

### Responsibilities

- Executes all Knowledge Base CRUD workflows (triggered by backend webhooks).
- Hosts the RAG chat agent (Nora) — triggered directly by the frontend chat widget.
- Owns the PGVector embedding pipeline (document ingestion → chunk → embed → store).
- Runs the YouScan data collection and normalization schedules.
- Maintains persistent chat memory in PostgreSQL.

### Workflow Catalogue

All reference workflow JSONs are in `n8n/workflows/`. See the [README Workflows section](./README.md#workflows) for the full import guide.

| Workflow | Trigger | What it does |
|---|---|---|
| **Agent — Data Analyst (Nora)** | Chat webhook (frontend) | RAG Q&A over indexed documents |
| **Create — KB** | Webhook `POST` | Creates a KB record in PostgreSQL |
| **Get — KB** | Webhook `GET` | Returns a KB record |
| **Get All — KB** | Webhook `GET` | Returns all KB records |
| **Edit — KB** | Webhook `PATCH` | Updates a KB record |
| **Delete — KB** | Webhook `DELETE` | Drops KB record + all PGVector embeddings |
| **Add File — KB** | Webhook `POST` | Chunks → embeds → stores document in PGVector |
| **List Files — KB** | Webhook `GET` | Lists files indexed in a KB |
| **Delete Files — KB** | Webhook `DELETE` | Removes file vectors from PGVector |
| **YouScan — Collect Mentions** | Schedule 01:00 UTC | Paginates YouScan API → raw JSON on disk |
| **YouScan — Normalize Mentions** | Schedule 02:00 UTC | Raw JSON → warehouse MySQL DB |

### n8n ↔ PostgreSQL

n8n uses PostgreSQL both for its own internal storage **and** as the PGVector store for embeddings:

- **Internal:** workflows, credentials, executions, variables — stored in `n8n_enlaight_db`.
- **PGVector:** document chunks and their embedding vectors are stored in the same PostgreSQL instance using the `pgvector` extension. Each Knowledge Base maps to a collection (table) in PGVector.

### n8n ↔ External Services

| Service | Credential type | Used by |
|---|---|---|
| OpenRouter | API key | Nora agent LLM |
| OpenAI | API key | Embeddings (all KB flows + Nora) |
| PostgreSQL | DB connection | Chat memory + PGVector store |
| MySQL | DB connection | YouScan normalize workflow |

---

## 5. Databases

### MySQL — Application Data

**Container:** `enlaight_mysql` (MySQL 8.4)
**Internal host:** `mysql:3306`
**Used by:** Django backend (exclusively)

Stores all transactional business data managed by the Django ORM:

| Table / Model | Description |
|---|---|
| `UserProfile` | User accounts, roles, departments, avatar |
| `Clients` | Client organisations |
| `Projects` | Projects linked to clients |
| `Agents` (Bots) | AI agent definitions: name, description, n8n webhook URL |
| `ChatSession` | Chat history: session key, agent ID, user ID, message data |
| `KBLink` | Links between knowledge bases (external IDs) and projects |
| `ChatFavorite` | User-bookmarked chat threads |
| `ExpertiseArea` | Categorisation tags for agents |
| `Boards` | Dashboard board configurations |
| `UserInvite` | Pending invitation tokens |
| `ProjectsAgentsThrough` | Many-to-many: projects ↔ agents |

### PostgreSQL + PGVector — n8n & Embeddings

**Container:** `postgres_dev` (PostgreSQL with pgvector)
**Internal host:** `postgres:5432`
**Database:** `n8n_enlaight_db`
**Used by:** n8n (exclusively)

| Data | Description |
|---|---|
| n8n internal tables | Workflows, credentials, executions, variables, tags |
| PGVector collections | Document chunks + float vector embeddings per Knowledge Base |
| Chat memory | Conversation history keyed by session ID (Nora agent) |

### Redis — Cache

**Container:** `enlaight_cache` (Redis 7 Alpine)
**Internal host:** `redis:6379`
**Used by:** Backend (session cache, throttle counters)

---

## 6. Authentication & Authorization

### JWT Token Flow

```
1.  POST /api/login/  { email, password }
                │
                ▼
2.  Django validates credentials
                │
                ▼
3.  SimpleJWT generates:
    ├── Access token  (HS256, 2-hour lifetime)
    │   Custom claims: id, full_name, email, role, avatar
    └── Refresh token (1-day lifetime)
                │
                ▼
4.  Frontend stores both tokens in localStorage
                │
                ▼
5.  All API requests include:
    Authorization: Bearer <access_token>
                │
         ┌──────┴──────┐
         │ 401?         │ OK
         ▼              ▼
6.  POST /api/refresh/  → new access token
    Old refresh token blacklisted (rotation)
```

### Roles & Permissions

| Role | Access |
|---|---|
| `ADMIN` | Full system access, including `login-as` impersonation |
| `USER` | Standard access to own data and assigned projects/bots |

Custom permission classes in the backend:

- `IsAuthenticated` — valid JWT required.
- `IsAdminByRole` — user must carry the `ADMIN` role claim.
- `IsAdminOrRelatedToBot` — admin, or the authenticated user is linked to the bot being accessed.

### Password Security

- Hashing: PBKDF2PasswordHasher (Django default)
- Validators: minimum length 8, similarity check, common-password list, numeric-only guard
- Reset: time-limited token (1 hour) delivered via email (SMTP)

---

## 7. Knowledge Base Pipeline

The KB pipeline spans three services. Here is the end-to-end flow for **adding a document**:

```
Frontend                Backend                   n8n                      PostgreSQL
   │                       │                        │                           │
   │  POST /api/kb/         │                        │                           │
   │  file/add/  ─────────►│                        │                           │
   │  (multipart form)      │                        │                           │
   │                        │  POST /webhook/        │                           │
   │                        │  kb/file/add/  ───────►│                           │
   │                        │  { key: N8N_KB_KEY }   │                           │
   │                        │                        │  Read file from disk      │
   │                        │                        │  Split into chunks        │
   │                        │                        │  Embed via OpenAI ────────►
   │                        │                        │                           │
   │                        │                        │  Store vectors in         │
   │                        │                        │  PGVector  ──────────────►│
   │                        │                        │                           │
   │                        │◄───────────────────────│  { success: true }        │
   │◄───────────────────────│                        │                           │
```

**For chat / semantic search:**

```
Frontend                                 n8n                      PostgreSQL
   │                                       │                           │
   │  Chat message via @n8n/chat widget ──►│                           │
   │                                       │  Embed query (OpenAI)     │
   │                                       │  Vector search ──────────►│
   │                                       │◄──────────────────────────│
   │                                       │  Top-k chunks             │
   │                                       │  LLM (OpenRouter) generates│
   │                                       │  answer with citations    │
   │◄──────────────────────────────────────│  Stream response          │
```

---

## 8. Data Ingestion Pipeline (YouScan)

The YouScan pipeline collects social media mentions and normalizes them into the warehouse MySQL database. It runs on a nightly schedule and can be operated in two ways:

### Option A — n8n Workflows (recommended)

Import and activate `youscan-collect-mentions.json` and `youscan-normalize-mentions.json` in n8n. They run automatically at 01:00 and 02:00 UTC respectively.

### Option B — Python Scripts (standalone / debug)

Run `n8n/scripts/youscan_collect_mentions.py` and `n8n/scripts/youscan_normalize_mentions.py` directly with the appropriate environment variables set.

### Data Flow

```
YouScan API
    │
    │  Paginated HTTP (sinceSeq cursor)
    │  Exponential back-off on 429 / 5xx
    ▼
RAW_DATA_DIR  (local filesystem)
    │  youscan_mentions_{topic_id}_{date}_{uuid}.json
    │
    ▼
Normalize & deduplicate
    │
    ├──► youscan_topics          (MySQL)
    ├──► youscan_ingestion_files (MySQL)
    ├──► youscan_mentions        (MySQL)
    └──► youscan_content         (MySQL — title / text / fullText shards)
    │
    ▼
INGESTED_DATA_DIR  (local filesystem archive)
```

### Required Environment Variables

| Variable | Description |
|---|---|
| `YOUSCAN_API_KEYS` | Comma-separated YouScan API keys (one per account) |
| `YOUSCAN_URL` | YouScan API base URL |
| `WAREHOUSE_DATABASE_URL` | MySQL connection URL for the warehouse DB |
| `RAW_DATA_DIR` | Local path for raw collected files (default: `./data/raw`) |
| `INGESTED_DATA_DIR` | Local path for archived processed files (default: `./data/ingested`) |

---

## 9. Superset (BI)

> **Note:** Superset is excluded from the local dev compose (`docker-compose-dev.yml`). It is available in the full `docker-compose.yml` for production / staging use only.

**Purpose:** Embedded business intelligence dashboards.
**Integration:** Backend issues guest tokens that allow the frontend to embed Superset charts without requiring users to have a Superset account.

```
Frontend                Backend                   Superset
   │                       │                          │
   │  POST /api/superset/  │                          │
   │  guest-token/  ───────►                          │
   │                        │  POST /api/v1/          │
   │                        │  security/guest_token/──►
   │                        │◄─────────────────────────
   │◄───────────────────────│  { token }              │
   │                        │                          │
   │  Embed Superset chart  │                          │
   │  via @superset-ui/ ───────────────────────────────►
   │  embedded-sdk          │                          │
```

**Relevant environment variables:**

| Variable | Description |
|---|---|
| `SUPERSET_BASE_URL` | Superset instance URL |
| `SUPERSET_ADMIN_USER` | Admin username for guest-token generation |
| `SUPERSET_ADMIN_PASSWORD` | Admin password for guest-token generation |

---

## 10. Docker Networking

Two Docker networks keep services isolated:

| Network | Purpose |
|---|---|
| `internal` | Backend-to-database and backend-to-n8n communication. Never exposed to the host. |
| `public` | Services that need to be reachable from the host machine or browser. |

### Service Network Membership

| Container | Networks | Internal hostname | Exposed port |
|---|---|---|---|
| `enlaight_frontend` | public | — | `8080` |
| `enlaight_backend` | internal, public | `backend` | `8000` |
| `enlaight_mysql` | internal | `mysql` | `3306` |
| `postgres_dev` | internal | `postgres` | `5432` |
| `enlaight_cache` | internal | `redis` | — |
| `n8n_dev` | internal, public | `n8n` | `5678` |
| `smtp4dev` | internal, public | `smtp4dev` | `3000`, `2525` |

### Service Start-up Dependencies

```
postgres_dev  ──(healthy)──► n8n_dev
enlaight_mysql ──(healthy)──► enlaight_backend
```

---

## 11. Environment Variables Reference

### Frontend (`VITE_*`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL (e.g. `http://localhost:8000/api`) |
| `VITE_N8N_CHAT_URL` | n8n chat webhook for the main data-analyst agent |
| `VITE_N8N_SUPPORT_ASSISTANT_URL` | n8n chat webhook for the support assistant |

### Backend

| Variable | Description |
|---|---|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `true` / `false` |
| `ALLOWED_HOSTS` | Comma-separated allowed hostnames |
| `FRONTEND_URL` / `REACT_URL` | Frontend origin (used for CORS) |
| `BACKEND_DB` | MySQL database name |
| `BACKEND_DB_USER` | MySQL user |
| `BACKEND_DB_PASSWORD` | MySQL password |
| `MYSQL_HOST` | MySQL host (default: `mysql`) |
| `MYSQL_PORT` | MySQL port (default: `3306`) |
| `N8N_BASE_URL` | n8n base URL (e.g. `http://n8n:5678`) |
| `N8N_KB_KEY` | Shared secret for n8n webhook authentication |
| `N8N_TIMEOUT` | HTTP timeout for n8n calls in seconds (default: `15`) |
| `JWT_ALGORITHM` | JWT signing algorithm (default: `HS256`) |
| `JWT_SIGNING_KEY` | JWT signing secret |
| `SUPERSET_BASE_URL` | Superset instance URL |
| `SUPERSET_ADMIN_USER` | Superset admin username |
| `SUPERSET_ADMIN_PASSWORD` | Superset admin password |

### n8n

| Variable | Description |
|---|---|
| `DB_POSTGRESDB_HOST` | PostgreSQL host (default: `postgres`) |
| `DB_POSTGRESDB_PORT` | PostgreSQL port (default: `5432`) |
| `DB_POSTGRESDB_DATABASE` | PostgreSQL database name |
| `DB_POSTGRESDB_USER` | PostgreSQL user |
| `DB_POSTGRESDB_PASSWORD` | PostgreSQL password |
| `N8N_HOST` | n8n server hostname |
| `N8N_PORT` | n8n server port |
| `N8N_PROTOCOL` | `http` or `https` |
| `WEBHOOK_URL` | External URL n8n uses to generate webhook links |

### YouScan Pipeline

| Variable | Description |
|---|---|
| `YOUSCAN_API_KEYS` | Comma-separated API keys |
| `YOUSCAN_URL` | YouScan API base URL |
| `WAREHOUSE_DATABASE_URL` | MySQL SQLAlchemy URL for the warehouse DB |
| `RAW_DATA_DIR` | Raw file output directory (default: `./data/raw`) |
| `INGESTED_DATA_DIR` | Archive directory for processed files (default: `./data/ingested`) |
