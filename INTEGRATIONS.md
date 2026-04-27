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
9. [QuickChart.io (Chart Rendering)](#9-quickchartio-chart-rendering)
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
                   │        ▼                                        ▼
                   │  ┌───────────────┐            ┌────────────────────────┐
                   │  │    Redis       │            │      PostgreSQL         │
                   │  │  Port 6379     │            │  + PGVector extension  │
                   │  │  (cache)       │            │  Port 5432             │
                   │  └───────────────┘            └───────────┬────────────┘
                   │                                           ▲
                   └───────────────────────────────────────────┘
                                      (app data + n8n data)
```

**Communication summary:**

| From | To | Protocol | Auth |
|---|---|---|---|
| Browser | Frontend | HTTP | — |
| Frontend | Backend API | HTTPS REST | JWT Bearer token |
| Frontend | n8n | HTTPS Webhook | None (public chat webhook) |
| Backend | n8n | HTTPS Webhook | `N8N_KB_KEY` header |
| Backend | PostgreSQL | TCP | DB credentials |
| Backend | Redis | TCP | — |
| n8n | PostgreSQL | TCP | DB credentials |

---

## 2. Frontend

**Stack:** React 18 · TypeScript · Vite 7 · React Router 6 · Axios · TanStack Query 5 · Zustand · shadcn/ui + Tailwind CSS

### Responsibilities

- Renders the full Enlaight SPA (single-page application).
- Manages JWT token lifecycle (storage, refresh, injection into every request).
- Embeds the n8n chat widget for agent conversations.
- Displays chart images rendered by the self-hosted QuickChart.io service (URLs produced by n8n workflows).

### Pages & Routes

Source: [`frontend/src/App.tsx`](./frontend/src/App.tsx). Anything outside this list falls through to `Navigate to="/login"`.

| Route | Page | Description |
|---|---|---|
| `/login` | Login | Email + password authentication |
| `/signup` | Sign Up | New account registration |
| `/forgot-password` | Forgot Password | Trigger password reset email |
| `/reset-password` | Reset Password | Consume reset token (`?email=...&token=...`) |
| `/confirm-invite` | Confirm Invite | Accept user invitation (`?email=...&token=...`) |
| `/` | Dashboard | Main landing after login |
| `/dashboard` | Dashboard | Same as `/` |
| `/search` | Search | Global semantic search (proxied via n8n) |
| `/favorites` | Favorites | Saved chat threads |
| `/assistantmanagement` | Bot Management | Admin: create / edit AI agents |
| `/assistantlist` | Assistant List | Browse available agents |
| `/knowledgebases` | Knowledge Bases | Manage document collections |
| `/projectslist` | Projects | Manage client projects |
| `/clientmanagement` | Clients | Manage client organisations |
| `/userlist` | User List | Admin: list users |
| `/usermanagement` | User Management | Admin: edit users |
| `/user/:id` | User Detail | View / edit a single user |
| `/addusers` | Add Users | Invite new users |

### API Communication

All HTTP calls go through a shared Axios instance configured in [`frontend/src/services/api.ts`](./frontend/src/services/api.ts):

- **Base URL:** `VITE_API_BASE_URL` environment variable (e.g. `http://localhost:8000/api` locally).
- **Auth header:** `Authorization: Bearer <access_token>` injected automatically via request interceptor (scheme overridable via `VITE_AUTH_SCHEME`).
- **Token storage:** access token kept **in memory only** (`tokenStore` module-local variable). Refresh token is delivered as an `httpOnly`, path-scoped cookie on `/api/refresh/` — never visible to JS, never written to `localStorage`.
- **Auto-refresh:** on any `401`, the response interceptor calls `POST /api/refresh/` with `withCredentials: true` and an empty body — the browser sends the refresh cookie automatically. Concurrent refreshes are coalesced via a single in-flight promise. The original request is retried with the new access token.
- **Hard refresh / page reload:** the in-memory access token is lost; the first authenticated call 401s and silently re-bootstraps a new access token from the refresh cookie.

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
| `POST` | `/api/login/` | Email + password → access token in body, refresh token as `httpOnly` cookie |
| `POST` | `/api/refresh/` | Rotates the refresh cookie, returns new access token |
| `POST` | `/api/logout/` | Blacklist refresh token |
| `GET` | `/api/me/` | Current user profile |
| `PATCH` | `/api/me/update/` | Update current user profile (`multipart/form-data`) |
| `POST` | `/api/verify-token/` | Check whether a token is valid |
| `POST` | `/api/password/forgot/` | Send password-reset email |
| `POST` | `/api/password/reset/` | Consume reset token + set new password |

#### Users & Roles

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users/` | List all users |
| `GET` | `/api/users/<user_id>/roles/` | Get roles for a user |
| `POST` | `/api/users/<user_id>/roles/add/` | Assign role to user |
| `DELETE` | `/api/users/<user_id>/roles/remove/` | Remove role from user |
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
| `POST` | `/api/kb/attach/` | Links KB to a project in PostgreSQL |

#### Other Endpoints

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/api/chat-session/` | List recent / create chat sessions |
| `DELETE` | `/api/chat-session/delete/` | Delete a chat session |
| `GET/POST/DELETE` | `/api/chat-favorites/` | Manage favourite chats |
| `GET/POST/PATCH/DELETE` | `/api/boards/` | Manage dashboard boards |
| `GET/POST/PATCH/DELETE` | `/api/expertise-areas/` | Manage expertise areas |
| `POST` | `/api/search/` | Semantic search (proxied to n8n) |
| `GET` | `/api/i18n/translate/` | Translate a single text (`?text=&lang=`) |
| `POST` | `/api/i18n/translate/batch/` | Batch translate |
| `GET` | `/api/health/` | Service health check |
| `GET` | `/api/health/db/` | Database health check |

### How the Backend calls n8n

```python
# Pattern used in every KB / search proxy view
import requests
from django.conf import settings

response = requests.post(
    f"{settings.N8N_BASE_URL}/webhook/kb/create/",
    headers={"key": settings.N8N_KB_KEY},   # custom header, NOT Authorization
    json={"name": name, "description": description},
    timeout=settings.N8N_TIMEOUT,           # default: 15 s
)
```

Relevant environment variables:

| Variable | Description |
|---|---|
| `N8N_BASE_URL` | Base URL of the n8n instance (e.g. `http://n8n:5678` inside Docker) |
| `N8N_KB_KEY` | Shared secret injected as the `key` header in every webhook call |
| `N8N_TIMEOUT` | HTTP request timeout in seconds (default `15`) |

> `N8N_API_KEY` exists in `env.sample` for forks that wire up the n8n
> management API but is **not** read by any view in the current backend.

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

### PostgreSQL— Application Data

**Container:** `postgres_dev` (PostgreSQL)
**Internal host:** `postgres:5432`
**Database:** `enlaight_database`
**Used by:** Django backend

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
**Used by:** n8n

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
1.  POST /api/login/  { email | username, password }
                │
                ▼
2.  Django validates credentials
                │
                ▼
3.  SimpleJWT generates:
    ├── Access token  (HS256, 2-hour lifetime)
    │   Custom claims: id, full_name, email, username, role, avatar, …
    └── Refresh token (1-day lifetime)
                │
                ▼
4.  Response:
    ├── { "access": "..." } in JSON body  → frontend stores in MEMORY only
    └── Set-Cookie: refresh=…; HttpOnly; Path=/api/refresh/  (not visible to JS)
                │
                ▼
5.  All API requests include:
    Authorization: Bearer <access_token>
                │
         ┌──────┴──────┐
         │ 401?         │ OK
         ▼              ▼
6.  POST /api/refresh/  (no body — browser sends the refresh cookie)
    → new access token; refresh cookie rotated; old refresh blacklisted
```

### Roles & Permissions

| Role | Access |
|---|---|
| `ADMINISTRATOR` | Full system access, including `login-as` impersonation |
| `USER` | Standard access to own data and assigned projects/bots |

Defined in [`backend/src/authentication/models/roles.py`](./backend/src/authentication/models/roles.py). The `is_admin_by_role()` helper in [`permissions.py`](./backend/src/authentication/permissions.py) accepts both `ADMINISTRATOR` and the legacy literal `ADMIN` for backward compatibility.

Custom permission classes in the backend:

- `IsAuthenticated` — valid JWT required.
- `IsAdminByRole` — user must carry the `ADMINISTRATOR` (or legacy `ADMIN`) role claim.
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

## 9. QuickChart.io (Chart Rendering)

**Stack:** [QuickChart](https://quickchart.io/) — self-hosted HTTP chart-rendering API, based on Chart.js.

### Responsibilities

- Renders charts (PNG/SVG/PDF) from a Chart.js-style JSON configuration.
- Serves as the visualization layer for n8n workflows that need to return a chart image to the user as part of an agent response.
- Runs entirely inside the Docker network — no data leaves the deployment.

### How it runs

- Service name in `docker-compose.yml`: `quickchart`
- Default host port: `3400` (internal container port: `3400`)
- No authentication by default — relies on network isolation (do **not** expose port 3400 publicly).

### Request shape

QuickChart accepts either a GET with the chart config in the query string or a POST with a JSON body. n8n workflows typically POST because charts can exceed URL length limits.

```http
POST http://quickchart:3400/chart
Content-Type: application/json

{
  "chart": {
    "type": "bar",
    "data": {
      "labels": ["Jan", "Feb", "Mar"],
      "datasets": [{ "label": "Mentions", "data": [12, 19, 7] }]
    },
    "options": { "title": { "display": true, "text": "Monthly mentions" } }
  },
  "width": 800,
  "height": 400,
  "format": "png"
}
```

Response: the raw image bytes (or a JSON object with a URL if you use the `/chart/create` endpoint to pre-render and cache).

### n8n integration pattern

1. A workflow gathers raw data (from the warehouse DB, a KB, an external API, etc.).
2. A **Code** or **Set** node transforms that data into a Chart.js JSON payload.
3. An **HTTP Request** node POSTs that payload to `http://quickchart:3400/chart`.
4. The response is either:
   - attached to the agent's chat reply as an image URL, or
   - uploaded / embedded in a document the workflow returns.

### Integration notes

- Because QuickChart is self-hosted, charts may contain internal / sensitive data safely.
- Chart configs can reference the full Chart.js feature set (mixed types, annotations, custom colors). Refer to the [Chart.js docs](https://www.chartjs.org/docs/) for the schema.
- If a fork needs higher rendering throughput, scale the `quickchart` service horizontally behind the internal Docker network — it is stateless.

### Environment variables

| Variable | Description |
|---|---|
| *(none required)* | The service runs with defaults; consumers reference it via the internal hostname `quickchart`. |

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
| `postgres_dev` | internal | `postgres` | `5432` |
| `enlaight_cache` | internal | `redis` | — |
| `n8n_dev` | internal, public | `n8n` | `5678` |
| `quickchart` | internal | `quickchart` | `3400` |
| `smtp4dev` | internal, public | `smtp4dev` | `3000`, `2525` |

### Service Start-up Dependencies

```
postgres_dev  ──(healthy)──► enlaight_backend, n8n_dev
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
| `BACKEND_DB` | Postgres database name |
| `BACKEND_DB_USER` | Postgres user |
| `BACKEND_DB_PASSWORD` | Postgres password |
| `POSTGRES_HOST` | PostgreSQL host (default: `postgres`) |
| `POSTGRES_PORT` | PostgreSQL port (default: `5432`) |
| `N8N_BASE_URL` | n8n base URL (e.g. `http://n8n:5678`) |
| `N8N_KB_KEY` | Shared secret for n8n webhook authentication |
| `N8N_TIMEOUT` | HTTP timeout for n8n calls in seconds (default: `15`) |
| `JWT_ALGORITHM` | JWT signing algorithm (default: `HS256`) |
| `JWT_SIGNING_KEY` | JWT signing secret |

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
