# n8n Agents / Bots Integration Flow  
**Enlaight Application**

---

## Overview

The Enlaight application integrates **n8n (workflow automation) agents/bots**
that users can interact with via chat. This document explains how agents are
created, configured, plugged into the application, and accessed by end users.

---

## Key Components

### 1. n8n Service
- Runs on port **5678** (localhost)
- Docker container: `n8n_dev`
- Database: **PostgreSQL** (`postgres` service)
- Local URL: `http://localhost:5678`
- Hosts automated workflows that power the agents
- Chat interface embedded in the frontend via `@n8n/chat`

### 2. Backend (Django)
- ORM models: `Agents` model represents each bot/agent
- API endpoints: REST endpoints for managing agents and chat sessions
- Proxy layer: Forwards KB operations to n8n webhooks
- Database: **MySQL** (Enlaight application data)

### 3. Frontend (React + TypeScript)
- Displays available agents/bots to users
- Embeds n8n chat widget for direct interaction
- `BotService` handles API calls to list and manage agents

---

## Architecture & Flow

### How Agents Are Created

#### Step 1: n8n Workflow Creation
- Admins create workflows in the n8n UI (`http://localhost:5678`)
- Each workflow is designed to handle chat interactions
- Workflow exposes a webhook endpoint that accepts chat messages

Example webhook URL:
```

[http://localhost:5678/webhook/](http://localhost:5678/webhook/)<unique-code>/chat

```

---

#### Step 2: Register Agent in Database
Admins create an Agent record using the Enlaight backend.

**Model**
- `authentication.models.agents.Agents`

**Key Fields**
- `name` — string (e.g. *Data Analyst Bot*)
- `description` — text (optional)
- `avatar` — image (optional)
- `url_n8n` — **URL (required)**: webhook URL from n8n
- `expertise_area` — foreign key (optional)
- `id` — UUID (auto-generated)

**API Endpoint**
```

POST /api/bots/

````

Example body:
```json
{
  "name": "Data Analyst Bot",
  "description": "Analyzes data and provides insights",
  "url_n8n": "http://n8n:5678/webhook/abc123xyz/chat"
}
````

> Admin-only endpoint

---

#### Step 3: Assign Agents to Projects

Agents must be linked to projects so users can access them.

**Database Relationship**

* Table: `authentication_projects_bots`
* Relationship: Projects ↔ Agents (many-to-many)
* Result: Users can only see agents assigned to their projects

**API Endpoint**

```
PATCH /api/bots/{agent_id}/
```

Example body:

```json
{
  "projects": ["project_id_1", "project_id_2"]
}
```

> Admin-only endpoint

---

## How Agents Are Plugged In

### Backend Integration

#### 1. Bot List Endpoint

```
GET /api/bots/
```

**Behavior**

* Admin users → see all agents
* Regular users → see only agents in their projects

**Returns**

* List of Agent objects with metadata and chat sessions

---

#### 2. Agent Data Structure (API Response)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Data Analyst Bot",
  "description": "Analyzes data and provides insights",
  "url_n8n": "http://n8n:5678/webhook/abc123xyz/chat",
  "expertise_area": {
    "id": "...",
    "name": "Data Analysis"
  },
  "projects": [
    { "id": "...", "name": "Project A" }
  ],
  "chat_sessions": [
    {
      "id": "...",
      "session_key": "session_123",
      "agent_id": "550e8400...",
      "created_at": "2026-02-10T10:30:00Z"
    }
  ]
}
```

---

#### 3. Backend Environment Variables

* `N8N_BASE_URL` — Base URL of n8n service
* `N8N_KB_KEY` — API key for n8n webhook calls
* `N8N_TIMEOUT` — Request timeout (seconds)
* `N8N_UI_BASE_URL` — Base URL for n8n UI (optional)
* `N8N_UI_WORKFLOW_PATH_TEMPLATE` — Template for workflow URLs

---

### Frontend Integration

#### 1. n8n Chat Library

* Package: `@n8n/chat`
* Styles: `@n8n/chat/style.css`
* `createChat()` initializes the embedded chat widget

---

#### 2. Components & Flow

**a) BotService**
`frontend/src/services/BotService.ts`

* Fetches available agents
* Calls `GET /api/bots/`
* Handles pagination and search

**b) AgentsCard**
`frontend/src/components/AgentsCard.tsx`

* Displays agent card (avatar, name, expertise, description)
* Launches chat modal on **New Chat**

**c) AgentsChatMount**
`frontend/src/components/AgentsChatMount.tsx`

* Embeds the n8n chat widget

Required props:

* `webhookUrl` — agent’s `url_n8n`
* `agentId` — agent UUID
* `containerId` — DOM container ID
* `metadata` — custom metadata sent to n8n
* `sessionKey` — existing session or `null`

**d) ChatSessionService**
`frontend/src/services/ChatSessionService.ts`

* Creates chat sessions on first message
* `POST /api/chat-session/`
* Tracks agent, user, and session metadata

---

### User Workflow

1. User sees available agents (`GET /api/bots/`)
2. User clicks **New Chat** on an agent
3. `AgentsChatMount` mounts with `agent.url_n8n`
4. n8n chat widget opens (fullscreen)
5. User sends first message
6. Chat session is created in the backend
7. Message is sent to n8n via webhook
8. n8n workflow processes the message
9. n8n returns a response
10. Chat history is displayed in the UI

---

## How Users Access Agents

### Access Control Mechanism

#### Project-Based Access

* Agents ↔ Projects
* Users ↔ Projects
* Users can access only agents in their projects

#### Role-Based Access

* **Admins** → access all agents
* **Regular users** → access only project-assigned agents

#### Database Relationships

```
UserProfile ⇄ Projects ⇄ Agents
     M2M         M2M
```

---

### Access Flow

1. **User logs in**

   * JWT issued
   * `GET /api/me/` returns user profile and projects

2. **User requests agent list**

   ```
   GET /api/bots/
   Authorization: Bearer <JWT>
   ```

3. **User selects agent**

   ```
   GET /api/bots/{agent_id}/
   ```

   * Access validated (admin or project member)

4. **User starts chat**

   ```
   POST /api/chat-session/
   ```

5. **Chat messages flow**

   * Frontend → n8n webhook
   * n8n processes workflow
   * Response returned to frontend

---

## Managing Agents

### Create New Agent (Admin)

1. Create n8n workflow with webhook trigger
2. Copy webhook URL
3. `POST /api/bots/`
4. Assign agent to projects

---

### Update Agent (Admin)

```
PATCH /api/bots/{agent_id}/
```

Updatable fields:

* `name`
* `description`
* `url_n8n`
* `expertise_area`
* `projects`

---

### Delete Agent (Admin)

```
DELETE /api/bots/{agent_id}/
```

* Removes agent record
* Chat sessions remain as immutable history

---

### Delete Chat Session (User)

```
DELETE /api/chat-session/
```

* Removes session record
* Chat history deleted

---

## n8n Webhook Structure

### Request

```
POST {url_n8n}
```

Example body:

```json
{
  "chatInput": "User message text",
  "sessionId": "session_key",
  "metadata": {
    "agentId": "agent_uuid",
    "customSessionId": "session_key"
  }
}
```

---

### Processing

* Workflow handles logic
* May integrate with:

  * Knowledge bases
  * External APIs
  * LLMs (OpenAI, Anthropic, etc.)
  * Databases
  * Custom scripts

---

### Response

```json
{
  "output": "Response text from bot",
  "sessionId": "session_key"
}
```

---

### Session Management

* n8n tracks sessions via `sessionId`
* `loadPreviousSession: true` loads history
* Frontend and webhook maintain session context

---

## Configuration & Environment

### Key Environment Variables

* `N8N_BASE_URL`
* `N8N_KB_KEY`
* `N8N_TIMEOUT`
* `VITE_N8N_CHAT_URL`

### Docker Services

* `n8n` — workflow engine
* `postgres` — n8n database
* `backend` — Django API
* `frontend` — React UI

---

## Troubleshooting

**Agent not appearing**

* Check agent is assigned to user’s project
* Check user is in that project
* Admins always see all agents

**Chat not loading**

* Verify `agent.url_n8n`
* Ensure n8n service is running
* Verify webhook trigger and response

**Session not created**

* Verify JWT authentication
* Ensure first message was sent
* Check browser console

**Permission denied**

* Verify project membership
* Verify admin role if applicable

---

## Summary

**Flow Overview**

1. Admin creates n8n workflow
2. Admin registers agent in Enlaight
3. Admin assigns agent to projects
4. Users see assigned agents
5. User starts chat
6. Frontend loads n8n chat widget
7. Messages flow between frontend and n8n
8. Sessions tracked in database

**Key Files**

* Backend: `authentication/models/agents.py`
* Backend: `authentication/views/bot.py`
* Backend: `authentication/serializers/bot_serializer.py`
* Frontend: `services/BotService.ts`
* Frontend: `components/AgentsChatMount.tsx`
* Frontend: `components/AgentsCard.tsx`
* Frontend: `contexts/AgentsChatContext.tsx`

**Database Tables**

* `agents`
* `authentication_projects_bots`
* `chat_sessions`
* `chat_favorites`
