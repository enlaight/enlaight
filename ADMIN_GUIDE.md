# Enlaight — Administrator Guide

This guide covers initial setup, adding agents and knowledge bases, inviting users, and using the management pages.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Application Setup](#2-application-setup)
3. [n8n Setup (required before agents & KBs)](#3-n8n-setup)
4. [Adding Agents](#4-adding-agents)
5. [Adding Knowledge Bases](#5-adding-knowledge-bases)
6. [Inviting Users](#6-inviting-users)
7. [Management Pages Reference](#7-management-pages-reference)

---

## 1. Prerequisites

- Docker and Docker Compose
- Latest version of Node (at least v20.20.0)
- A domain name (for production deployments)
- SMTP credentials (for user invitations)
- An OpenAI API key (for knowledge base embeddings)

---

## 2. Application Setup

### 2.1 Clone and configure environment

```bash
git clone <repository-url>
cd enlaight

cp env.sample .env
cp backend/src/core/settings.sample.py backend/src/core/settings.py
```

Open `.env` and `backend/src/core/settings.py` and fill in placeholder values. The table below lists the required ones to get started:

| Variable | Description |
|---|---|
| `APP_DOMAIN` | Your domain (e.g. `enlaight.yourcompany.com`) |
| `SECRET_KEY` | Random secret string for Django — generate with `openssl rand -hex 32` |
| `ALLOWED_HOSTS` | Comma-separated list of allowed hostnames |
| `CORS_ALLOWED_ORIGINS` | Frontend origin(s), e.g. `https://enlaight.yourcompany.com` |
| `FRONTEND_URL` | Same as above, used in invitation emails |
| `POSTGRES_DB_PASSWORD` | Set a strong password |
| `EMAIL_HOST` | SMTP host (see [Inviting Users](#6-inviting-users)) |
| `EMAIL_HOST_USER` | SMTP username |
| `EMAIL_HOST_PASSWORD` | SMTP password |
| `DEFAULT_FROM_EMAIL` | Sender address for invitation emails |
| `N8N_API_KEY` | Generated after first n8n login (see step 3) |

For HTTPS (production), also set:

```
USE_X_FORWARDED_HOST=True
SECURE_SSL_REDIRECT=True
CSRF_COOKIE_SECURE=True
SESSION_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
```

### 2.2 Build and start

Make sure you have the latest Node (>=20) version before running the commands:

```bash
make build
make start
```

### 2.3 Creating defaults

With **backend server running** run the `create_defaults.sh` script (in a different tab/terminal, run `bash create_defaults.sh`)

Services and their default ports:

| Service | URL |
|---|---|
| Frontend | http://localhost:8080 |
| Backend API | http://localhost:8000 |
| n8n | http://localhost:5678 |
| Mailpit (local email) | http://localhost:3000 |


**Default admin credentials:**

| Field | Value |
|---|---|
| Email | `admin@localhost.ai` |
| Password | `admin123` |


> This account is not linked to a valid e-mail and its only purpose is for initial access of the platform. Afterwards, make sure to **invite a new user as Admin** to be registered with safe credentials of your choice and **delete this default user** for security.

---

## 3. n8n Setup

n8n orchestrates every agent webhook and knowledge base operation. It must be configured before you can create agents or KBs.

### 3.1 Create the n8n admin account

1. Open http://localhost:5678
2. Complete the setup wizard (create an email/password account)

### 3.2 Generate an API key

1. In n8n, go to **Settings → n8n API**
2. Click **Create API key** and copy the value
3. Set it in `.env`:

```
N8N_API_KEY=<paste key here>
```

4. Restart the backend container so it picks up the new value:

```bash
docker compose restart backend
```

### 3.3 Import workflows

All workflow definitions live in `n8n/workflows/`. Import them through the n8n UI:

1. Open n8n → **Workflows**
2. Click **Import from file** for each `.json` file in `n8n/workflows/`
3. Activate each workflow after import (toggle the **Active** switch)

### 3.4 Configure credentials inside n8n

The imported workflows reference placeholder credentials. You must replace them:

1. Go to **Credentials** in n8n
2. Create a **Postgres** credential pointing to the app database (use the same values as in `.env` under `POSTGRES_*`)
3. Create an **OpenAI** credential with your OpenAI API key (required for KB embeddings)
4. Open each workflow and reassign its nodes to the credentials you just created

### 3.5 Setting the n8n API Key

In case restarting the backend container after changing the .env file does not work, then set it **directly in `backend/src/core/settings.py`** as the fallback of the variable:

```python
# backend/src/core/settings.py — line ~71
N8N_KB_KEY = os.environ.get("N8N_API_KEY", "<key from webhook node>")
```

Restart the backend after saving:

```bash
docker compose restart backend
```

---

## 4. Adding Agents

Agents are AI-powered chat endpoints. Each agent maps to an n8n workflow that handles the conversation logic.

### 4.1 Create the n8n workflow for the agent

1. In n8n, create (or duplicate) a chat workflow
2. Note the **webhook URL** of the workflow's trigger node — it looks like:
   `http://localhost:5678/webhook/<code>/chat`
3. Activate the workflow

### 4.2 Register the agent in Enlaight

1. Log in as an Administrator
2. Go to **Assistant Management** (`/assistantmanagement`)
3. Click **New Agent**
4. Fill in the form:

| Field | Description |
|---|---|
| **Name** | Display name shown to users |
| **Description** | Short description of what this agent does |
| **n8n Webhook URL** | The webhook URL from step 4.1 |
| **Expertise Area** | Optional category tag |
| **Projects** | Select one or more projects to make this agent available in |

5. Click **Save**

The agent immediately becomes available in chat for users in the selected projects.

### 4.3 Attach an existing agent to more projects

1. Go to **Assistant Management**
2. Click the agent's row to open it
3. Under **Projects**, add the additional projects
4. Save

---

## 5. Adding Knowledge Bases

Knowledge bases store documents that agents can search for context (RAG). They require the n8n KB workflows and an OpenAI API key to be configured.

### 5.1 Create a knowledge base

1. Go to **Knowledge Bases** (`/knowledgebases`)
2. Click **New Knowledge Base**
3. Enter a name and select the project it belongs to
4. Click **Create**

### 5.2 Upload documents

1. Open the knowledge base you just created
2. Click **Add File**
3. Upload a PDF or text document
4. Wait for the indexing indicator to complete — n8n splits the document, embeds it with OpenAI, and stores the vectors in PGVector

Repeat for as many files as needed. Supported formats depend on the configured n8n text-splitter node (PDF and plain text by default).

### 5.3 Manage files in a KB

From the knowledge base detail view:

- **Replace a file** — click the file row → **Update File**
- **Delete a file** — click the file row → **Delete** (removes its vectors from the index)

### 5.4 Delete a knowledge base

Deleting a KB removes all its vectors from PGVector. This cannot be undone.

1. Go to **Knowledge Bases**
2. Open the KB → click **Delete**

---

## 6. Inviting Users

User invitations are sent by email. The invited user receives a link valid for **15 days** to set their password and activate their account.

### 6.1 Configure SMTP credentials

Add the following to `.env` (all fields are required):

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.yourprovider.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_smtp_username
EMAIL_HOST_PASSWORD=your_smtp_password
DEFAULT_FROM_EMAIL=noreply@yourcompany.com
```

Restart the backend after saving:

```bash
docker compose restart backend
```

**Local development:** Mailpit is included as a local SMTP catcher. Sent emails appear at http://localhost:3000 — no real SMTP account needed. Point `EMAIL_HOST` to `mailpit` and `EMAIL_PORT` to `1025`.

### 6.2 Send an invitation

As an Admin, under the **Management** tab, select **Invite User**. Make sure the e-mail system has been set up and is functional in the variables.

| Role | Access |
|---|---|
| `USER` | Can chat with agents in their assigned projects |
| `ADMINISTRATOR` | Full system access — can create agents, KBs, and invite users |

5. Click **Send Invitation**

The invitee receives an email with a confirmation link. When they open it, they set a password and their account is activated automatically.

### 6.3 Re-invite

If an invitation expires or the user didn't receive the email, send the invitation again using the same email address. The system reuses the existing token and resets the 15-day window.

---

## 7. Management Pages Reference

All management pages require an Administrator login unless noted otherwise.

### Assistant Management — `/assistantmanagement`

Create, edit, and delete agents. Manage which projects each agent is available in. Non-admin users can view the list at `/assistantlist` but cannot modify agents.

### Knowledge Bases — `/knowledgebases`

Create and manage knowledge bases and their files. Access is scoped to the user's projects; administrators see all KBs.

### Add Users — `/addusers`

Send email invitations with a role and project assignment.

### User List — `/userlist`

View all users in the system. Use the search bar to filter by name or email.

### Client Management — `/clientmanagement`

Manage top-level client accounts in the multi-tenant hierarchy. Each client contains one or more projects.

### Projects List — `/projectslist`

View and manage projects. Projects belong to a client and group users and agents together.

### Dashboard — `/dashboard`

Analytics overview: usage stats, active agents, recent conversations. Available to all authenticated users (data is scoped to their projects).

### Search — `/search`

Full-text search across agents and knowledge bases visible to the current user.
