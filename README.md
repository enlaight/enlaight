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
6. [FAQ](#-faq)
7. [Technologies Used](#-technologies-used)

📐 For a detailed breakdown of every component and how they connect, see **[INTEGRATIONS.md](./INTEGRATIONS.md)**.

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
**Password:** `admin123`

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

### Initial Setup (required before using Knowledge Bases or Agents)

> ⚠️ **You must complete these steps before creating or using any Knowledge Base (KB) or Agent in Enlaight.** Both the KB and Agent features call n8n via its REST API, which requires an API key — without it, agent creation, agent chat, and KB operations will fail.

1. Open the n8n UI at [http://localhost:5678](http://localhost:5678) (or `http://n8n.localhost:5678` if you added the `/etc/hosts` entry above).
2. Create the **owner / admin account** by completing the n8n setup form on first launch.
3. Once logged in, go to **Settings → n8n API → Create an API key** and copy the generated token.
4. Paste the token into your `.env` file as the n8n API key variable, then restart the stack so the backend picks up the new value:

   ```bash
   make reset
   ```

5. Import the KB and Agent workflows from `n8n/workflows/` (see [Workflows](#workflows) below) and reassign their credentials.

### Workflows

All workflow JSON files live in `n8n/workflows/`. Import them via **n8n UI → Settings → Import workflow** or through the n8n REST API.

> **Credential placeholder:** MySQL/Postgres credential IDs inside the JSONs are placeholders (`WAREHOUSE_DB_CREDENTIAL_ID`, `Postgres account`, etc.). After importing, open each workflow and reassign the credentials to the ones you created in your local n8n instance.

#### All sample workflows at a glance

| File | Category | Trigger | Description |
|---|---|---|---|
| `agent-data-analyst.json` | Agent | Chat webhook | RAG chat agent (Nora) — PGVector retrieval + OpenRouter LLM |
| `create-kb.json` | KB CRUD | Webhook `POST` | Create a new knowledge base |
| `get-kb.json` | KB CRUD | Webhook `GET` | Fetch a single knowledge base by ID |
| `get-all-kb.json` | KB CRUD | Webhook `GET` | List all knowledge bases |
| `edit-kb.json` | KB CRUD | Webhook `PATCH` | Update knowledge base name / metadata |
| `delete-kb.json` | KB CRUD | Webhook `DELETE` | Delete a knowledge base and its vectors |
| `add-file-kb.json` | KB CRUD | Webhook `POST` | Index a document into a knowledge base via PGVector |
| `list-files-kb.json` | KB CRUD | Webhook `GET` | List all indexed files in a knowledge base |
| `delete-files-kb.json` | KB CRUD | Webhook `DELETE` | Remove a document's vectors from a knowledge base |
| `youscan-collect-mentions.json` | Data pipeline | Schedule 01:00 UTC | Collect previous day's mentions from YouScan API → local JSON |
| `youscan-normalize-mentions.json` | Data pipeline | Schedule 02:00 UTC | Normalize raw JSON files → warehouse DB, move to archive |

---

#### 🤖 Agent Workflows

##### `agent-data-analyst.json` — Agent — Data Analyst (Nora)

A RAG-enabled conversational agent that exposes a public chat webhook.

| Component | Detail |
|---|---|
| **Trigger** | Public chat webhook (allows any origin) |
| **LLM** | OpenRouter Chat Model (configurable model, custom system prompt) |
| **Memory** | PostgreSQL Chat Memory — retains last 10 messages, keyed by session ID |
| **Knowledge base** | PGVector Store — semantic search over indexed documents |
| **Embeddings** | OpenAI Embeddings |

**Required n8n credentials:** OpenRouter API key, OpenAI API key, Postgres connection.

---

#### 📚 Knowledge Base (KB) Workflows

These eight webhook-driven workflows form a complete CRUD API for managing knowledge bases and their indexed documents. They are called by the Enlaight backend and power the RAG pipeline.

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

**Required n8n credentials:** Postgres connection (PGVector), OpenAI API key.

---

#### 🔌 YouScan Data Pipeline Workflows

Two scheduled workflows that implement the same logic as the Python scripts in `n8n/scripts/` (see [Scripts](#scripts) below), running natively inside n8n. They run back-to-back each night.

##### `youscan-collect-mentions.json` — YouScan — Collect Mentions

**Schedule:** daily at 01:00 UTC

**What it does:**

1. **Build Date Range** — computes `startDate` / `endDate` for the previous calendar day (UTC).
2. **Get Active Topics from DB** — queries `youscan_topics` in the warehouse MySQL DB.
3. **Fetch Topics (API Key 1/2/3)** — parallel HTTP calls to the YouScan `/topics/` endpoint for each configured key.
4. **Merge & Filter Topics** — builds a `topicId → {name, query, api_key}` map, filtered to only topics active in the DB.
5. **Collect Mentions (Paginated)** — cursor-based pagination via `sinceSeq`, with exponential back-off retry for 429 / 5xx (max 5 attempts), runs per topic in parallel.
6. **Write JSON to Disk** — writes one `youscan_mentions_{topic_id}_{date}_{uuid}.json` file per topic to `RAW_DATA_DIR`.

| Nodes used | Types |
|---|---|
| Schedule Trigger, Code (×4), HTTP Request (×3), MySQL | n8n built-in |

---

##### `youscan-normalize-mentions.json` — YouScan — Normalize Mentions

**Schedule:** daily at 02:00 UTC

**What it does:**

1. **Scan Raw Directory** — lists all `*.json` files in `RAW_DATA_DIR`; short-circuits gracefully if empty.
2. **Read JSON File** — parses each raw file (one n8n item per file).
3. **Topic dedup** — checks `youscan_topics`; inserts if new, resolves the internal DB `id`.
4. **File dedup** — checks `youscan_ingestion_files` by UUID; skips the entire file if already processed.
5. **Insert Ingestion File Record** — records the file metadata.
6. **Explode Mentions** — fans out one n8n item per mention.
7. **Mention dedup** — checks `youscan_mentions` by `youscan_mention_id`; skips duplicates.
8. **Build Mention Row** — normalizes all fields: timestamps via JS `Date`, source string cleaned, JSON arrays serialized.
9. **Insert Mention** — writes to `youscan_mentions`.
10. **Explode Content Shards → Insert Content Shard** — inserts `title`, `text`, `fullText` as separate rows in `youscan_content`.
11. **Move File to Ingested** — `fs.renameSync` moves the processed file to `INGESTED_DATA_DIR`.

| Nodes used | Types |
|---|---|
| Schedule Trigger, Code (×9), Filter (×4), MySQL (×8) | n8n built-in |

**Required n8n credentials for both YouScan workflows:**

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

## ❓ FAQ

### Why do my Knowledge Base or Agent operations fail right after a fresh install?

n8n must be fully configured **before** you create or use any KB or Agent in Enlaight. In particular:

1. The n8n owner/admin account must be created and an n8n API key generated and saved into your `.env` (see [Initial Setup](#initial-setup-required-before-using-knowledge-bases-or-agents)).
2. **All workflows** under `n8n/workflows/` must be imported into your local n8n instance, and their credentials reassigned to the ones you created locally.

If either step is skipped, the backend will return errors when the UI tries to call n8n.

### I ran `create_defaults` and got default agents, but their chat doesn't work — why?

The `create_defaults` script (and `n8n/scripts/create_sample_kb.py`) seeds the database with default Knowledge Bases and Agents. These defaults reference n8n chat webhook URLs, **but n8n generates a new webhook URL every time a workflow is imported** — so the seeded URLs will not match your local n8n instance.

To fix it, for each default-created agent:

1. Open the corresponding agent workflow in n8n (e.g. `agent-data-analyst.json`).
2. Open the **Chat Trigger** (or webhook) node and copy its **production webhook URL**.
3. In Enlaight, edit the agent and paste the new URL into its webhook field, then save.

The `agent-data-analyst.json` workflow is included as a **reference / template** — you can duplicate it in n8n to model new agents after it, then register them in Enlaight using the same webhook-update flow.

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
