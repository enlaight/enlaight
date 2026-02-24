# Enlaight

Enlaight is a full-stack application built with modern frontend and backend technologies,
featuring a database layer, automated workflows, and integrated data visualization
and analytics, orchestrated through Docker containers.

## 🧭 Navigation

1. [Getting Started](#-getting-started-local-setup)
2. [Services & Ports](#-services--ports)
3. [Admin Credentials](#-admin-credentials-default)
4. [Backend DB Alterations](#-backend-db-alterations)
5. [n8n Configuration](#-n8n-configuration)
   - [Workflows](#workflows)
   - [Scripts](#scripts)
6. [Sprints](#-sprints)
7. [Technologies Used](#-technologies-used)

---

## 🚀 Getting Started (Local Setup)

### 1. Environment Configuration

Copy `env.sample` to `.env` and fill in any required keys, secrets, or configuration values:

```bash
cp env.sample .env
```

### 2. Build and Start the Application

```bash
make build
make start
```

### 3. Available Commands

```bash
make help
```

### 4. Reset the Installation

If you change `.env` or `docker-compose` files and need a clean setup:

```bash
make reset
```

---

## 🌐 Services & Ports

| Service | URL | Notes |
|---|---|---|
| Frontend | http://localhost:8080 | React + Vite |
| Backend API | http://localhost:8000 | Django REST Framework |
| Swagger UI | http://localhost:8000/swagger/ | OpenAPI docs |
| n8n | http://localhost:5678 | Workflow automation |
| PostgreSQL | localhost:5432 | Django app + PGVector |
| MySQL | localhost:3306 | Shared warehouse DB |
| Redis | localhost:6379 | Cache + queues |
| SMTP (Mailpit) | http://localhost:3000 | Local email catcher |

---

## 🔐 Admin Credentials (default)

### Enlaight Application

Upon initialization, the main application creates a default admin user. Additional accounts can be created from the UI. To change the defaults, edit `./backend/src/authentication/management/commands/set_admin.sql`.

**Email:** `admin@localhost.ai`
**Password:** `123456`

### Superset Application

Superset credentials are set from `.env`. The sample file ships with these defaults (not recommended for production):

**User:** `admin`
**Password:** `admin`

---

## 🧩 Backend DB Alterations

### Create a New Migration

```bash
docker compose exec backend python manage.py makemigrations authentication --name add_user_table
```

### Apply Migrations

```bash
docker compose exec backend python manage.py migrate
```

---

## 🔄 n8n Configuration

To access n8n locally you may need to add an entry to your `/etc/hosts`:

```
127.0.0.1 n8n.localhost
```

The `n8n/` directory contains reference workflows and data-pipeline scripts that new developers can use to bootstrap a local n8n instance.

### Workflows

All workflow JSON files live in `n8n/workflows/`. Import them via **n8n UI → Settings → Import workflow** or through the n8n REST API.

> **Credential placeholder:** MySQL/Postgres credential IDs inside the JSONs are placeholders (`WAREHOUSE_DB_CREDENTIAL_ID`, `Postgres account`, etc.). After importing, open each workflow and reassign the credentials to the ones you created in your local n8n instance.

#### 🤖 Agent Workflows

| File | Workflow name | Description |
|---|---|---|
| `agent-data-analyst.json` | **Agent — Data Analyst (Nora)** | RAG-enabled chat agent. Exposes a public webhook chat interface. Uses PGVector for knowledge-base retrieval, Postgres for chat memory, OpenRouter as the LLM, and OpenAI for embeddings. |

#### 📚 Knowledge Base (KB) Workflows

These seven webhook-driven workflows form a complete CRUD API for managing knowledge bases and their indexed documents. They are called by the Enlaight backend and are the backbone of the RAG pipeline.

| File | Workflow name | Method | Description |
|---|---|---|---|
| `create-kb.json` | **Create — KB** | `POST` | Creates a new knowledge base record in Postgres. Validates the payload, generates a unique hash ID, and guards against duplicate names. |
| `get-kb.json` | **Get — KB** | `GET` | Fetches a single knowledge base by ID from Postgres. |
| `get-all-kb.json` | **Get All — KB** | `GET` | Returns the full list of knowledge bases available to the requesting API key. |
| `edit-kb.json` | **Edit — KB** | `PATCH` | Updates the name or metadata of an existing knowledge base. |
| `delete-kb.json` | **Delete — KB** | `DELETE` | Deletes a knowledge base and all its associated vector embeddings from PGVector and Postgres. |
| `add-file-kb.json` | **Add File — KB** | `POST` | Uploads a document to a knowledge base. Reads the file from disk, splits it with a Recursive Character Text Splitter, embeds it with OpenAI, and stores the vectors in PGVector. Guards against re-indexing the same file. |
| `list-files-kb.json` | **List Files — KB** | `GET` | Lists all documents indexed in a given knowledge base. |
| `delete-files-kb.json` | **Delete Files — KB** | `DELETE` | Removes a specific document's vectors from PGVector and its metadata from Postgres. |

#### 🔌 YouScan Data Pipeline Workflows

Two scheduled workflows that implement the same logic as the Python scripts (see [Scripts](#scripts) below) natively inside n8n. They run back-to-back each night: the collector at 01:00 UTC, the normalizer at 02:00 UTC.

| File | Workflow name | Schedule | Description |
|---|---|---|---|
| `youscan-collect-mentions.json` | **YouScan — Collect Mentions** | Daily 01:00 UTC | Fetches active topic IDs from the warehouse DB, calls the YouScan API for each topic to paginate all mentions from the previous calendar day (cursor-based via `sinceSeq`), and writes one raw JSON file per topic to `RAW_DATA_DIR`. Supports up to 3 API keys in parallel and retries 429/5xx errors with exponential back-off. |
| `youscan-normalize-mentions.json` | **YouScan — Normalize Mentions** | Daily 02:00 UTC | Scans `RAW_DATA_DIR` for raw JSON files produced by the collector. For each file: deduplicates topics, ingestion files, and individual mentions against the warehouse DB; normalizes all fields (timestamps, source strings, engagement metrics, geo); inserts content shards (title / text / fullText) into `youscan_content`; then moves the processed file to `INGESTED_DATA_DIR`. |

**Required n8n credentials for the YouScan workflows:**

| Credential type | Used by |
|---|---|
| MySQL (`Warehouse MySQL`) | Both workflows — reads active topics, writes normalized data |

**Required environment variables (set in `.env`):**

| Variable | Description |
|---|---|
| `YOUSCAN_API_KEYS` | Comma-separated list of YouScan API keys (one per account) |
| `YOUSCAN_URL` | YouScan external API base URL (e.g. `https://api.youscan.io/api/external/`) |
| `WAREHOUSE_DATABASE_URL` | SQLAlchemy / MySQL connection URL for the warehouse DB |
| `RAW_DATA_DIR` | Local path where the collector writes raw JSON files (default: `./data/raw`) |
| `INGESTED_DATA_DIR` | Local path where the normalizer moves processed files (default: `./data/ingested`) |

---

### Scripts

The `n8n/scripts/` directory contains standalone Python scripts that implement the same YouScan data pipeline logic as the n8n workflows above. They are kept as a reference and can be run independently (e.g. via cron or for local development/debugging) without needing a running n8n instance.

> All credentials are read exclusively from environment variables — no hardcoded secrets.

#### `youscan_collect_mentions.py`

Collects social media mentions from the YouScan API for all active topics and saves them as raw JSON files to the local filesystem.

**What it does:**

1. Reads active topic IDs from the warehouse MySQL DB (`youscan_topics` table).
2. Fetches all topics from the YouScan API across all configured API keys, building a `topic_id → {name, query, api_key}` map.
3. For each active topic, paginates the YouScan mentions endpoint using cursor-based pagination (`sinceSeq`) to collect all mentions from the previous calendar day.
4. Retries transient errors (HTTP 429 / 5xx) with exponential back-off (up to 5 attempts).
5. Writes one JSON file per topic to `RAW_DATA_DIR`, named `youscan_mentions_{topic_id}_{date}_{uuid}.json`.

**Required environment variables:**

| Variable | Description |
|---|---|
| `YOUSCAN_API_KEYS` | Comma-separated YouScan API keys |
| `YOUSCAN_URL` | YouScan API base URL |
| `WAREHOUSE_DATABASE_URL` | MySQL connection URL for the warehouse DB |
| `RAW_DATA_DIR` | Output directory for raw JSON files (default: `./data/raw`) |

**Run:**

```bash
pip install requests mysql-connector-python
python n8n/scripts/youscan_collect_mentions.py
```

---

#### `youscan_normalize_mentions.py`

Reads raw JSON files produced by the collector, normalizes and deduplicates them into the warehouse MySQL database, then moves each processed file to an archive directory.

**What it does:**

1. Scans `RAW_DATA_DIR` for `*.json` files (sorted, processed in order).
2. For each file, runs a 3-level deduplication pipeline:
   - **Topic** — upserts into `youscan_topics` if the topic ID is new.
   - **File** — skips the file entirely if its UUID is already recorded in `youscan_ingestion_files`.
   - **Mention** — skips individual mentions whose `youscan_mention_id` already exists in `youscan_mentions`.
3. Normalizes all fields: timestamps parsed via `dateutil` (timezone-aware), source strings stripped of stray quotes, JSON arrays serialized for storage.
4. Inserts content shards (`title`, `text`, `fullText`) as separate rows in `youscan_content` for independent queryability.
5. Moves each fully processed file from `RAW_DATA_DIR` to `INGESTED_DATA_DIR`.

**Required environment variables:**

| Variable | Description |
|---|---|
| `WAREHOUSE_DATABASE_URL` | SQLAlchemy MySQL URL for the warehouse DB |
| `RAW_DATA_DIR` | Directory containing raw JSON files (default: `./data/raw`) |
| `INGESTED_DATA_DIR` | Archive directory for processed files (default: `./data/ingested`) |

**Run:**

```bash
pip install sqlalchemy pymysql python-dateutil
python n8n/scripts/youscan_normalize_mentions.py
```

---

## 🗓️ Sprints

### Sprint 1 — 12 Jan 2026 – 25 Jan 2026

- Single Docker Compose with the full stack (n8n, Superset, Postgres, Redis, API, Frontend)
- Makefile with `start`, `stop`, `clear`, `build`, `test` commands
- All credentials moved to environment variables; `env.sample` added
- Public repo with initial README

### Sprint 2 — 26 Jan 2026 – 08 Feb 2026

- OpenAPI spec + Swagger for API endpoints
- Basic unit test and linting structure
- Bootstrap script for first-time spin-up:
  - n8n: KB flows + endpoints, sample KB + document indexing, sample agent
  - DB: sample data points for analytics
  - Superset: sample visualisations (line, bar, pie charts)
  - API + Client: sample board with visualisations and demo agent

### Sprint 3 — 09 Feb 2026 – 22 Feb 2026

- Architecture documentation (components, responsibilities, integration patterns)
- Guide: how to create and plug in new n8n agents
- Guide: how to create and plug in new knowledge bases
- YouScan connector + normalization pipeline (scripts and n8n workflows)
- Lint coverage to 100%; unit test coverage to ≥ 70%
- Basic logging structure
- Fallback logging n8n flow

### Upcoming Sprints

> **Sprint 4:** 23 Feb 2026 – 08 Mar 2026

> **Sprint 5:** 09 Mar 2026 – 22 Mar 2026

> **Sprint 6:** 23 Mar 2026 – 05 Apr 2026

> **Sprint 7:** 06 Apr 2026 – 19 Apr 2026

---

## 🛠️ Technologies Used

### Frontend

- Vite + TypeScript
- React 18
- shadcn/ui + Tailwind CSS

### Backend

- Django 5 + Django REST Framework (Python)
- drf-yasg (OpenAPI / Swagger)
- djangorestframework-simplejwt (JWT auth)

### Databases & Services

- MySQL (warehouse + Superset metadata)
- PostgreSQL + PGVector (Django app + vector embeddings)
- Redis (cache + queues)

### Workflow Automation

- n8n (self-hosted)
- OpenRouter (LLM gateway)
- OpenAI (embeddings)

### Data Pipeline

- YouScan API (social listening)
- SQLAlchemy + PyMySQL
- python-dateutil
