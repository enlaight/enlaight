# n8n Workflow Automation - Agents & Knowledge Bases

## Overview

**n8n** is a workflow automation engine that powers intelligent agents (bots) and manages knowledge bases within Enlaight. It enables non-technical users to build complex workflows that interact with LLMs, APIs, and data sources, exposing them as chatbots accessible through the Enlaight frontend.

**Key Purpose:**
- Host automated workflows as agents/bots
- Store and manage knowledge base files and metadata
- Provide webhook endpoints for chat interactions
- Integrate with external APIs, LLMs, and data sources

**Port**: 5678 (locally)

**Database**: PostgreSQL 15

**Local URL**: `http://localhost:5678`

---

## Architecture

### System Components

```
┌────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                       │
│                  - Lists available bots/agents                 │
│                  - Embeds n8n chat widget                      │
└────────────────────────────────────────────────────────────────┘
                              ↑ ↓
                        Webhook URLs
                              ↓ ↑
┌────────────────────────────────────────────────────────────────┐
│                    Backend (Django) Proxy Layer                │
│  - Validates user authorization                               │
│  - Forwards KB operations to n8n                              │
│  - Stores bot/KB references in MySQL                          │
└────────────────────────────────────────────────────────────────┘
                              ↑ ↓
              API Key Authentication (N8N_API_KEY)
                              ↓ ↑
┌────────────────────────────────────────────────────────────────┐
│                      n8n Workflow Engine                        │
│  - Executes bot workflows                                      │
│  - Manages knowledge base storage                              │
│  - Exposes webhook endpoints                                   │
│  - Connects to LLMs, APIs, databases                          │
│  Database: PostgreSQL                                          │
└────────────────────────────────────────────────────────────────┘
```

---

## Assistants (Agents)

### What is an Assistant?

An **Assistant** (also called "agent" in code) is a workflow in n8n that accepts chat messages and returns intelligent responses. Assistants:
- Are powered by LLM models (GPT-4, Claude, etc.)
- Can access knowledge bases
- Can call external APIs
- Have memory of conversation history
- Are assigned to projects for multi-tenancy
- Have expertise areas for categorization

### Bot Lifecycle

#### 1. Creation in n8n

Admin creates a workflow in n8n UI:

**Steps:**
1. Access n8n at `http://localhost:5678`
2. Create new workflow
3. Configure nodes:
   - **Webhook node** - Listen for chat messages
   - **Chat model node** - LLM integration (OpenAI, Anthropic, etc.)
   - **Knowledge base retrieval** - Optional KB lookup
   - **Response node** - Format bot response
   - **Sub-webhook node** - Return response

**Webhook URL Format:**
```
http://localhost:5678/webhook/<unique-code>/chat
```

**Expected Input (from frontend/backend):**
```json
{
  "message": "What is artificial intelligence?",
  "sessionId": "uuid",
  "userId": "uuid"
}
```

**Expected Output:**
```json
{
  "response": "Artificial intelligence is...",
  "sessionId": "uuid"
}
```

#### 2. Registration in Database

Admin registers agent in Enlaight backend:

**API Endpoint:** `POST /api/bots/`

**Request Body:**
```json
{
  "name": "Data Analyst",
  "description": "Analyzes data and provides insights",
  "avatar": "image_url_or_file",
  "url_n8n": "http://n8n:5678/webhook/abc123/chat",
  "expertise_area": "uuid_of_expertise_category",
  "projects": ["uuid_project1", "uuid_project2"]
}
```

**Backend Creates:**
- `Agents` database record
- Stores webhook URL for later use
- Associates with projects

#### 3. Frontend Display

Frontend displays assistant:
1. Fetches list: `GET /api/bots/`
2. Shows assistant card with name, avatar, description
3. On click, embeds n8n chat widget
4. Chat widget communicates directly to assistant's webhook URL

#### 4. User Interaction

```
User Types Message
    ↓
Frontend n8n Chat Widget
    ↓
POST to webhook URL: http://n8n:5678/webhook/<code>/chat
    ↓
n8n Receives Request
    ↓
Workflow Executes:
  - Parse message
  - Query knowledge base
  - Call LLM model
  - Format response
    ↓
n8n Returns Response
    ↓
Chat Widget Displays Message
```

### Assistant Database Model

**Agents Table:**
```python
class Agents(models.Model):
    id = UUIDField(primary_key=True)
    name = CharField(max_length=255)
    description = TextField(null=True)
    avatar = ImageField(upload_to='bots/')
    url_n8n = URLField()              # Webhook URL
    expertise_area = ForeignKey(ExpertiseArea)
    projects = ManyToManyField(Project)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

**API Endpoints:**
```bash
GET    /api/bots/              # List bots user can access
POST   /api/bots/              # Create bot (admin only)
GET    /api/bots/<uuid>/       # Get bot detail
PATCH  /api/bots/<uuid>/       # Update bot
DELETE /api/bots/<uuid>/       # Delete bot
```

---

## Knowledge Bases (KB)

### What is a Knowledge Base?

A **Knowledge Base** is a collection of documents and files that agents can reference when answering questions. It enables agents to provide accurate, context-specific information.

**Examples:**
- Product documentation
- Company policies
- FAQ documents
- Research papers
- Training materials

### KB Lifecycle

#### 1. Creation

**Via API:** `POST /api/kb/create/`

**Request (Proxied to n8n):**
```json
{
  "name": "Product Documentation",
  "description": "Complete product user guide",
  "project_id": "uuid"
}
```

**Backend → n8n Flow:**
1. Backend validates user has project access
2. Backend sends request to n8n webhook
3. n8n creates KB in its database
4. n8n returns KB metadata with `external_id` (hash)
5. Backend stores KBLink record in MySQL:
   ```python
   KBLink(
       external_id=hash_from_n8n,
       name="Product Documentation",
       project=project,
       description="..."
   )
   ```

#### 2. File Management

**Add File to KB:** `POST /api/kb/files/add/`

**Request (Proxied):**
```json
{
  "kb_id": "external_id_from_n8n",
  "file": "<binary_file_data>",
  "filename": "product_guide.pdf"
}
```

**Backend → n8n Flow:**
1. Validate user project access
2. Forward multipart form data to n8n
3. n8n processes file:
   - Extract text content
   - Create embeddings (for semantic search)
   - Store in n8n_data volume
   - Index in vector database
4. Backend stores file reference

**Delete File:** `DELETE /api/kb/files/delete/`

**Request:**
```json
{
  "kb_id": "external_id",
  "file_id": "file_hash"
}
```

**Proxy Endpoints:**
```bash
POST   /api/kb/create/         # Create knowledge base
GET    /api/kb/get/            # Get KB details
PATCH  /api/kb/edit/           # Edit KB metadata
DELETE /api/kb/delete/         # Delete KB
POST   /api/kb/files/add/      # Upload file
DELETE /api/kb/files/delete/   # Remove file
GET    /api/kb/files/list/     # List KB files
GET    /api/kb/list/           # List all KBs
POST   /api/kb/attach/         # Link KB to project
```

### KB Database Model

**KBLink Table (References n8n KB):**
```python
class KBLink(models.Model):
    id = UUIDField(primary_key=True)
    external_id = CharField(max_length=255)  # Hash from n8n
    name = CharField(max_length=255)
    project = ForeignKey(Project)
    description = TextField(null=True)
    created_at = DateTimeField(auto_now_add=True)
```

**Key Point:** Backend doesn't store KB files; n8n handles storage and retrieval.

### KB-Agent Integration

Agents can use KBs:

1. **In Workflow:** n8n workflow includes KB retrieval node
2. **Query Flow:**
   - User asks question to bot
   - Workflow retrieves relevant documents from KB
   - Documents provided as context to LLM
   - LLM generates response based on KB + context
3. **Example Workflow:**
   ```
   Webhook (receive message)
     ↓
   Retrieve from KB (semantic search)
     ↓
   LLM with context (answer based on KB)
     ↓
   Response webhook
   ```

---

## n8n Workflows

### Workflow Structure

A typical n8n workflow for a bot:

```
Webhook Trigger (input)
    ↓
Parse Message
    ↓
Check Intent
    ├─ → Query Knowledge Base (if needed)
    └─ → Call External API (if needed)
    ↓
LLM Chat Model (GPT-4 / Claude)
    ↓
Format Response
    ↓
Webhook Response (output)
```

### Key Nodes

**Webhook Node:**
- Listens for incoming requests
- Extracts message, user ID, session
- Passes to next node

**Chat Memory Node:**
- Stores conversation history
- Retrieves previous messages
- Context for multi-turn conversations

**Knowledge Base Node:**
- Searches KB for relevant documents
- Uses semantic/keyword search
- Returns top matching documents

**LLM Chat Node:**
- Calls OpenAI, Anthropic, or other LLM
- Includes system prompt
- Uses KB documents as context

**Code Node:**
- Custom JavaScript logic
- Data transformation
- Complex processing

**HTTP Node:**
- Call external APIs
- REST endpoints
- Third-party integrations

**Response Node:**
- Formats final response
- Handles streaming (if supported)
- Error handling

### Webhook Identification

Each workflow has a unique webhook code:

```
http://localhost:5678/webhook/<unique-code>/chat
                                    ↑
                        Auto-generated per workflow
```

**Getting Webhook Code:**
1. Open workflow in n8n
2. Click webhook trigger node
3. Copy URL in "Webhook URL" field
4. Extract the unique code

**Security:**
- Webhook tokens can be configured
- API Key header authentication available
- IP whitelist options

---

## n8n-Backend Integration

### Proxy Pattern

Backend acts as a security proxy:

```
Frontend Request
    ↓
Backend Route Receives Request
    ↓
Validate JWT Token
    ↓
Check User Authorization (Project Access)
    ↓
Forward to n8n with API Key
    ↓
n8n Processes Request
    ↓
Return Response to Backend
    ↓
Backend Returns to Frontend
```

### Implementation

**Socket Proxy View (Example):**

```python
# views/kb_create.py
class KBCreateProxyView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # 1. Authenticate (JWT)
        user = request.user
        
        # 2. Validate project access
        project_id = request.data.get('project_id')
        project = Project.objects.get(id=project_id)
        assert_user_project_access(user, project)
        
        # 3. Forward to n8n with API key
        headers = {
            "Authorization": f"Bearer {settings.N8N_API_KEY}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{settings.N8N_BASE_URL}/webhook/kb/create/",
            json=request.data,
            headers=headers,
            timeout=settings.N8N_TIMEOUT
        )
        
        # 4. Handle response
        if response.status_code != 200:
            return Response(
                {"error": response.text},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 5. Store KB link in backend database
        kb_data = response.json()
        KBLink.objects.create(
            external_id=kb_data['id'],
            name=kb_data['name'],
            project=project
        )
        
        return Response(kb_data)
```

### Environment Variables

**Configuration (from env.sample):**

```env
N8N_BASE_URL=https://n8n.enlaight.ai
N8N_API_KEY=your_n8n_api_key_here
N8N_KB_KEY=your_n8n_kb_key_here
N8N_TIMEOUT=15
N8N_SSL_HOST=enlaight.ai
N8N_HOST=localhost
WEBHOOK_URL=http://localhost:5678
```

**Settings.py Configuration:**
```python
N8N_BASE_URL = os.environ.get("N8N_BASE_URL", "").rstrip("/")
N8N_API_KEY = os.environ.get("N8N_API_KEY", "")
N8N_KB_KEY = os.environ.get("N8N_KB_KEY", "")
N8N_TIMEOUT = int(os.environ.get("N8N_TIMEOUT", "15"))
N8N_UI_BASE_URL = os.environ.get("N8N_UI_BASE_URL", "")
```

---

## Data Storage

### n8n Data Volume

**Local Storage (Development):**
```
./n8n/                          # n8n data directory
├── local-files/               # KB files stored here
│   ├── kb_<id>/
│   │   ├── file1.pdf
│   │   ├── file2.txt
│   │   └── embeddings/
│   └── ...
```

**Production:**
- Cloud storage (S3, Azure Blob, etc.)
- Configured in n8n environment
- Automatic backups recommended

### PostgreSQL Database

n8n uses PostgreSQL to store:
- Workflow definitions
- Execution history
- Credentials and secrets
- KB metadata
- Chat history

**Connection Info:**
```env
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=n8n_enlaight_db
POSTGRES_USER=n8n
POSTGRES_PASSWORD=<strong_password>
```

---

## Workflow Examples

### Example 1: Simple FAQ Bot

**Nodes:**
1. Webhook → Receive message
2. Chat Memory → Get conversation history
3. If Intent is FAQ → Knowledge Base search
4. LLM Chat → Answer with KB context
5. Response → Return to user

### Example 2: Data Analysis Bot

**Nodes:**
1. Webhook → Receive data query
2. HTTP → Connect to database/API
3. LLM → Analyze data with instructions
4. Format → Create response
5. Response → Send results

### Example 3: Multi-Agent Workflow

**Nodes:**
1. Webhook → Receive message
2. Classify Intent
3. Route based on intent:
   - Sales questions → Sales Bot
   - Technical issues → Support Bot
   - General info → FAQ Bot
4. Aggregate responses
5. Response → Return combined answer

---

## Setup & Configuration

### Initial Setup

**Docker Environment:**
```bash
# Ensure n8n service is running
docker compose up -d n8n

# Wait for startup (check logs)
docker compose logs -f n8n

# Access UI at http://localhost:5678
```

**First Login:**
1. Open http://localhost:5678
2. Set up admin credentials
3. Install required nodes (if any)
4. Configure credentials for LLMs, APIs

**Generate API Key:**
1. Settings → Personal Settings → API Token
2. Generate token
3. Copy to `N8N_API_KEY` in `.env`

### Connecting to LLM

**OpenAI Integration:**
1. In n8n, create OpenAI credential
2. Provide API key
3. Use in Chat Model nodes
4. Test completion

**Alternative LLMs:**
- Anthropic (Claude)
- Google PaLM
- Hugging Face
- Local LLaMA (self-hosted)

### Knowledge Base Setup

**Enable Vector Embeddings:**
1. Install vector DB node (Pinecone, Weaviate, etc.)
2. Configure connection
3. Create embeddings in KB workflows
4. Set up semantic search

---

## Development & Debugging

### Viewing Workflow Execution

**In n8n UI:**
1. Open workflow
2. Click "Execute" button
3. View execution logs
4. Debug individual nodes

### Testing Webhooks Locally

**Using curl:**
```bash
curl -X POST http://localhost:5678/webhook/abc123/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello bot",
    "sessionId": "test-session"
  }'
```

### Checking n8n Logs

```bash
docker compose logs -f n8n

# Check for errors
docker compose logs n8n | grep -i error
```

### Accessing n8n Database

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U n8n -d n8n_enlaight_db

# Query workflows
SELECT id, name FROM n8n_workflow_entity;

# Query executions
SELECT id, finished, data FROM n8n_execution_data LIMIT 10;
```

---

## Production Considerations

### Security

- **API Keys**: Store `N8N_API_KEY` in secrets manager
- **Credentials**: Don't hardcode LLM keys; use n8n credential system
- **Network**: Restrict n8n access to backend only (internal network)
- **HTTPS**: Use TLS for webhook URLs
- **Rate Limiting**: Implement rate limits on webhook endpoints

### Performance

- **Timeout**: Set reasonable timeouts (`N8N_TIMEOUT=15`)
- **Concurrent Executions**: Limit max parallel workflow runs
- **Database**: Monitor PostgreSQL performance
- **File Storage**: Use efficient vector DB for KB searches
- **Caching**: Cache KB search results

### Monitoring

- **Execution Logs**: Monitor workflow failures
- **n8n Logs**: Check for errors and warnings
- **Database**: Monitor PostgreSQL disk usage
- **API Performance**: Track webhook response times

### Backup & Recovery

**Backup n8n:**
```bash
# Backup PostgreSQL
docker compose exec postgres pg_dump -U n8n n8n_enlaight_db > n8n_backup.sql

# Backup workflow files
tar -czf n8n_workflows_backup.tar.gz ./n8n/

# Backup to external storage
aws s3 cp n8n_backup.sql s3://backup-bucket/
```

**Disaster Recovery:**
```bash
# Restore PostgreSQL
docker compose exec postgres psql -U n8n n8n_enlaight_db < n8n_backup.sql

# Restore workflow files
tar -xzf n8n_workflows_backup.tar.gz
```

---

## Common Workflows

### Pre-built Template: Customer Support Bot

**Purpose**: Answer customer questions using knowledge base

**Workflow:**
```
→ Webhook (customer message)
→ Retrieve from KB (FAQ documents)
→ LLM (Chat with context)
→ Return response
```

### Pre-built Template: Data Dashboard Bot

**Purpose**: Generate analytics from database

**Workflow:**
```
→ Webhook (data query)
→ Database query (SQL execution)
→ LLM (data analysis)
→ Format charts/graphs
→ Return results
```

### Pre-built Template: Multi-Language Bot

**Purpose**: Support multiple languages

**Workflow:**
```
→ Webhook
→ Detect language
→ Translate to English
→ Process (same as other bots)
→ Translate back to original
→ Return response
```

---

## Integration Checklist

- [ ] n8n service running on port 5678
- [ ] PostgreSQL database configured
- [ ] Admin user created in n8n
- [ ] n8n API key generated and stored in `.env`
- [ ] Sample workflows created (or imported)
- [ ] Webhook URLs configured for bots
- [ ] Knowledge bases set up with sample files
- [ ] Backend proxy endpoints tested
- [ ] Frontend bot list displaying correctly
- [ ] Chat widget communicating with n8n
- [ ] LLM integration configured (OpenAI, etc.)
- [ ] Logging and monitoring set up

