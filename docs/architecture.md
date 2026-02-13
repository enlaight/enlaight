# Enlaight — Architecture Overview

This document describes the purpose and responsibilities of each major part
of the Enlaight application: **Frontend**, **Backend**, **n8n**, **Superset**, and
**Docker**.

---

## Frontend (React + TypeScript)

### Purpose
User-facing UI for interacting with the system: projects, assistants (agents),
knowledge bases (KBs), file uploads, dashboards, and management.

### Responsibilities
- Chat services, Search, Favorites, Admin Management: display lists of entities, forms, modals (e.g. `AgentsCard`,
  `AddEditKBModal`, `AgentsChatMount`)
- Call backend REST API endpoints for CRUD operations (via services like
  `BotService`, `KnowledgeBaseService`, `ChatSessionService`)
- Embed the n8n chat widget (`@n8n/chat`) using the agent’s webhook URL
- Manage authentication (JWT tokens) and local state (contexts, store)

### Where to find it
- `frontend/src/` (components, services, pages)

---

## Backend (Django)

### Purpose
Central API, business logic, access control, and persistence for Enlaight.

### Responsibilities
- Define models (Users, Projects, Assistants, KBLink, ChatSessions, etc.)
- Enforce project-based tenant isolation and role-based permissions (admin and user)
- Provide REST endpoints used by the frontend to manage assistants, KBs, files,
  chat sessions, and user/project/client assignments
- Act as a secure proxy/bridge to n8n webhooks for KB operations and other
  integrations (validates requests and forwards them to n8n with API keys)
- Populate initial data and run migrations; expose management scripts

### Key files
- **Models:** `backend/src/authentication/models/*.py`
- **Views (proxies & APIs):** `backend/src/authentication/views/*.py`
- **Settings & env:** `backend/src/core/settings.py`, `env.sample`

---

## n8n (Workflow Automation)

### Purpose
Host workflow automation used as assistants (agents) and knowledge base backends.
Provide webhook endpoints that implement bot logic and KB file management.

### Responsibilities
- Run workflows that process chat messages, call LLMs/APIs, and access KB files
- Store KB metadata and files (n8n database + local file storage under `./n8n/`)
- Expose webhook endpoints consumed by the backend and frontend, for example:
  - `/webhook/kb/create/`
  - `/webhook/kb/file/add`
  - `/webhook/<code>/chat`

### Integration notes
- The backend forwards KB-related requests to n8n (proxy pattern) after
  validating authorization and project access
- The frontend chat widget sends messages directly to the agent’s n8n webhook
  (using the `url_n8n` stored on the `Agents` model)

### Where to find it in the repo
- `n8n/` (helper scripts and `local-files/`)
- Docker configuration in `docker-compose.yml` (service `n8n`)

---

## Superset (Data Visualization)

### Purpose
Enterprise-ready data visualization and analytics (dashboards and charts).

### Responsibilities
- Connect to metadata and data sources to create interactive dashboards
- Provide analytics tools and reporting for Enlaight data when configured
- Run as a separate service integrated via Docker and environment configs

### Integration notes
- Superset is optional and uses its own metadata database (MySQL) configured
  in `docker-compose.yml` and `.env`
- Not directly involved in chat or KB workflows, but useful for product
  analytics

### Where to find it
- `superset/`
- `docker-compose.yml` service `superset`

---

## Docker

### Purpose
Compose and run all services in a consistent local or production-like
environment using `docker compose`.

### Responsibilities
- Define services, images, networks, and volumes for:
  - `frontend` (React app)
  - `backend` (Django service)
  - `mysql` (shared MySQL for app data)
  - `postgres` (n8n database)
  - `n8n` (workflow engine)
  - `redis` (cache)
  - `superset` (dashboards)
  - `traefik` (optional ingress / TLS)
- Mount local volumes for persistence:
  - `n8n_data`
  - `mysql_data`
  - `postgres_data`
- Supply environment variables to services (via `.env` / `env.sample`)

### Developer notes
- Use `make build` / `make start` or `docker compose up --build` to start
  the stack locally as described in the repository `README.md`
- Ensure `env.sample` is copied to `.env` and required variables (`N8N_*`,
  `SECRET_KEY`, database credentials) are populated before running

---

## Quick Commands (Local Development)

To start the full stack using the included Makefile:

```bash
cp env.sample .env
make build
make start
````

Or with Docker Compose directly:

```bash
docker compose up --build
```

To run only a certain service:

```bash
make start <service>
```