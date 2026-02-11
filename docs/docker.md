# Docker & Infrastructure

## Overview

Enlaight uses **Docker Compose** to orchestrate all services in a consistent, reproducible environment. All components (frontend, backend, databases, n8n, Superset) run as isolated containers with defined networks, volumes, and dependencies.

**Key Benefits:**
- **Reproducibility**: Same setup on laptop, staging, production
- **Isolation**: Services don't conflict with system packages
- **Scaling**: Easy horizontal/vertical scaling
- **Networking**: Services communicate via DNS
- **Persistence**: Volumes preserve data across restarts
- **Development**: Hot-reload for frontend/backend code

---

## Docker Compose Architecture

### Services Overview

**docker-compose.yml** defines:

```yaml
services:
  frontend          # React app (8080)
  backend           # Django API (8000)
  mysql             # Main database (3306)
  postgres          # n8n database (5432)
  redis             # Cache (6379)
  n8n               # Workflow automation (5678)
  superset          # Analytics (8088)
  smtp              # Email service (25, 80, 3000)
```

**Networks:**
- `internal` - Backend-only services
- `public` - Frontend, backend, SMTP
- `default` - All services (superset_network)

**Volumes:**
- `mysql_data` - Database persistence
- `postgres_data` - n8n database
- `redis` - Cache persistence
- `superset_home` - Superset configuration
- Source code mounts (development)

---

## Service Definitions

### Frontend Service

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
  image: enlaight-frontend
  container_name: enlaight_frontend
  command: sh -c "npm run devmode -- --host 0.0.0.0"
  ports:
    - "8080:8080"
  environment:
    - CHOKIDAR_USEPOLLING=true  # Hot reload on mounted volumes
    - CHOKIDAR_INTERVAL=300
  volumes:
    - ./frontend/src:/app/src  # Hot reload
  networks:
    - public
```

**Key Points:**
- Port 8080 accessible from host
- Source code mounted for hot-reload
- Environment variable polling for file changes

### Backend Service

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  image: enlaight-service
  container_name: enlaight_backend
  working_dir: /src
  command: ["sh", "/scripts/run.sh"]
  ports:
    - "8000:8000"
  depends_on:
    mysql:
      condition: service_healthy
  env_file:
    - .env
  environment:
    MYSQL_DATABASE: ${BACKEND_DB}
    MYSQL_USER: ${BACKEND_DB_USER}
    MYSQL_PASSWORD: ${BACKEND_DB_PASSWORD}
    MYSQL_HOST: ${MYSQL_HOST}
  volumes:
    - ./backend/src:/src           # Code mount
    - ./backend/scripts:/scripts   # Scripts mount
    - ./n8n:/app/n8n              # n8n access
    - ./superset:/app/superset     # Superset access
  networks:
    - internal    # Can't access frontend
    - public      # Accessible to frontend
```

**Health Check:**
- Waits for MySQL to be healthy before starting
- Runs migrations on startup
- Collects static files

### MySQL Service

```yaml
mysql:
  image: mysql:8.4
  container_name: enlaight_mysql
  command: >
    --character-set-server=utf8mb4
    --collation-server=utf8mb4_unicode_ci
    --log-bin-trust-function-creators=1
  environment:
    MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
    TZ: America/Sao_Paulo
  ports:
    - "3306:3306"
  volumes:
    - mysql_data:/var/lib/mysql                    # Data persistence
    - ./backend/mysql/init:/docker-entrypoint-initdb.d:ro
  healthcheck:
    test: ["CMD", "mysqladmin", "ping", "-h", "127.0.0.1"]
    interval: 5s
    timeout: 3s
    retries: 30
  networks:
    - internal
```

**Key Features:**
- Character set UTF8MB4 (emoji support)
- Health check ensures ready state
- Initialization scripts in `mysql/init/`
- Data persisted in volume

### PostgreSQL Service

```yaml
postgres:
  image: postgres:15
  container_name: postgres_dev
  environment:
    POSTGRES_DB: n8n_enlaight_db
    POSTGRES_USER: n8n
    POSTGRES_PASSWORD: n8n_dev_password
  volumes:
    - postgres_data:/var/lib/postgresql/data
  ports:
    - "5432:5432"
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U n8n -d n8n_enlaight_db"]
    interval: 5s
    timeout: 5s
    retries: 5
  networks:
    - internal
```

**Purpose:** Database for n8n workflows and metadata

### Redis Service

```yaml
redis:
  image: redis:7-alpine
  container_name: enlaight_cache
  volumes:
    - redis:/data
  command: redis-server --appendonly yes  # RDB + AOF persistence
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 30s
    timeout: 10s
    retries: 3
```

**Uses:**
- Session storage
- Query result caching
- Rate limiting
- Task queue (Celery)

### n8n Service

```yaml
n8n:
  image: n8n:latest
  container_name: n8n_service
  ports:
    - "5678:5678"
  environment:
    - N8N_HOST=${N8N_HOST}
    - N8N_PORT=5678
    - N8N_PROTOCOL=http
    - DB_TYPE=postgresdb
    - DB_POSTGRESDB_HOST=postgres
    - DB_POSTGRESDB_PORT=5432
    - DB_POSTGRESDB_DATABASE=n8n_enlaight_db
    - DB_POSTGRESDB_USER=n8n
    - DB_POSTGRESDB_PASSWORD=n8n_dev_password
    - N8N_BASIC_AUTH_ACTIVE=true
    - N8N_BASIC_AUTH_USER=${N8N_USER}
    - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
  depends_on:
    - postgres
  volumes:
    - n8n_data:/home/node/.n8n
    - ./n8n:/data/n8n
```

### Superset Service

```yaml
superset:
  image: superset-custom:latest
  container_name: superset_app
  ports:
    - "8088:8088"
  environment:
    SUPERSET_SECRET_KEY: ${SUPERSET_SECRET_KEY}
    DATABASE_URL: mysql+mysqldb://${SUPERSET_DB_USER}:${SUPERSET_DB_PASSWORD}@mysql:3306/${SUPERSET_DB_NAME}
    REDIS_URL: redis://redis:6379/0
  depends_on:
    - mysql
    - redis
  volumes:
    - ./superset/docker:/app/docker
    - superset_home:/app/superset_home
```

### SMTP Service

```yaml
smtp:
  image: rnwood/smtp4dev
  container_name: smtp4dev
  ports:
    - "3000:80"      # Web UI
    - "2525:25"      # SMTP port
  networks:
    - internal
    - public
```

**Purpose:** Local email capture for development

**Features:**
- Web UI: `http://localhost:3000`
- Captures all outgoing emails
- No actual email sending
- Useful for testing email flows

---

## Networking

### Network Types

**internal**
- Isolated network (only backend services)
- MySQL, PostgreSQL, Redis, n8n
- Not accessible from frontend
- More secure for databases

**public**
- Frontend, backend, SMTP visible
- Frontend can reach backend API
- SMTP accessible to backend

**superset_network** (default)
- Named network for Superset
- All services participate
- Legacy approach for Superset

### Service Communication

**From Frontend → Backend:**
```
Frontend (port 8080) 
  → http://backend:8000/api/
  → Resolved by Docker DNS
  → Routes to Backend container
```

**From Backend → MySQL:**
```
Backend
  → MYSQL_HOST=mysql (env variable)
  → Docker DNS resolves to MySQL service
  → Routes to MySQL container
```

**From Backend → n8n:**
```
Backend
  → N8N_BASE_URL=http://n8n:5678
  → Passes through public/internal networks
  → Routes to n8n container
```

---

## Volumes

### Data Persistence

**mysql_data**
```yaml
volumes:
  - mysql_data:/var/lib/mysql
```
- Persists all database files
- Survives container restart
- Required for production

**postgres_data**
```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
```
- n8n workflows and metadata
- Survives restart

**redis**
```yaml
volumes:
  - redis:/data
```
- Redis persistence (RDB + AOF)
- Session data, cache

**n8n_data**
```yaml
volumes:
  - n8n_data:/home/node/.n8n
```
- n8n configuration
- Credentials, workflows, settings

**superset_home**
```yaml
volumes:
  - superset_home:/app/superset_home
```
- Superset cache and config
- User settings

### Source Code Mounts (Development)

**Frontend Hot Reload:**
```yaml
volumes:
  - ./frontend/src:/app/src
  - ./frontend/public:/app/public
```
- Changes to code instantly reload
- Middleware watches for changes

**Backend Hot Reload:**
```yaml
volumes:
  - ./backend/src:/src
  - ./backend/tests:/tests
```
- Django reloads on file save
- Static files auto-collected

---

## Build Process

### Building Images

**Official Build:**
```bash
docker compose build --no-cache
```

**Build Specific Service:**
```bash
docker compose build --no-cache frontend
docker compose build --no-cache backend
```

### Dockerfile Structure

**Frontend Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["npm", "run", "devmode"]
```

**Backend Dockerfile:**
```dockerfile
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /src
COPY pyproject.toml ./
RUN pip install poetry && poetry install --no-dev
COPY . .
RUN python manage.py collectstatic --noinput
EXPOSE 8000
ENTRYPOINT ["sh", "/scripts/entrypoint.sh"]
```

---

## Startup Flow

### Initialization Script (create_defaults.sh)

```bash
#!/bin/bash
#!/bin/bash

# 1. Wait for backend to be healthy
docker compose ps backend --format "{{.State}}" | grep running

# 2. Create n8n sample knowledge bases
docker compose exec -T backend python /app/n8n/create_sample_kb.py

# 3. Populate backend database with sample data
docker compose exec -T backend python /scripts/populate_db.py

# 4. Create Superset sample charts
docker compose exec -T backend python superset/create_sample_charts.py
```

**Execution:**
```bash
make start       # Start all services
sleep 30         # Wait for stabilization
bash create_defaults.sh
```

---

## Resource Management

### CPU & Memory Limits

**Set Resource Constraints:**
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

**Monitor Resource Usage:**
```bash
docker stats                    # Real-time view
docker compose stats            # Compose-specific
```

### Health Checks

**Purpose:** Ensure service readiness before dependent services start

**MySQL Health Check:**
```yaml
healthcheck:
  test: ["CMD", "mysqladmin", "ping", "-h", "127.0.0.1"]
  interval: 5s      # Check every 5 seconds
  timeout: 3s       # Wait 3 seconds for response
  retries: 30       # Try 30 times before marking unhealthy
  start_period: 10s # Begin checks after 10s
```

**Backend Dependency:**
```yaml
depends_on:
  mysql:
    condition: service_healthy  # Wait for MySQL health check
```

---

## Networking Troubleshooting

### Service Discovery

**Test DNS Resolution:**
```bash
docker compose exec backend nslookup mysql
docker compose exec backend nslookup postgres
docker compose exec backend nslookup redis
```

**Test Connectivity:**
```bash
# Backend to MySQL
docker compose exec backend mysql -h mysql -u enlaight -p

# Backend to n8n
docker compose exec backend curl http://n8n:5678/api/v1/status

# Frontend to Backend
docker compose exec frontend curl http://backend:8000/api/
```

### Network Inspection

```bash
# List networks
docker network ls

# Inspect network
docker network inspect enlaight-public_public

# View connected services
docker network inspect enlaight-public_internal
```

---

## Production Considerations

### Multi-Host Deployment

**Using Docker Swarm:**
```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml enlaight

# Scale service
docker service scale enlaight_backend=3
```

**Using Kubernetes:**
- Convert compose to Helm charts
- Use persistent volumes for data
- Enable health checks and auto-restart
- Configure ingress for external access

### Reverse Proxy (Traefik)

**Optional service for SSL/TLS:**
```yaml
traefik:
  image: traefik:v2.10
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
    - ./acme.json:/acme.json
  environment:
    - TRAEFIK_ACME_EMAIL=${TRAEFIK_ACME_EMAIL}
```

**Service Labels (for Traefik):**
```yaml
backend:
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.backend.rule=Host(\`api.example.com\`)"
    - "traefik.http.routers.backend.entrypoints=websecure"
```

---

## Maintenance

### Cleanup Commands

**Remove Stopped Containers:**
```bash
docker compose down
```

**Remove Volumes (⚠️ Deletes Data):**
```bash
docker compose down --volumes
```

**Remove All Docker Artifacts:**
```bash
docker system prune -a --volumes
```

### Image Management

**View Images:**
```bash
docker images | grep enlaight
```

**Remove Old Images:**
```bash
docker image prune -a -f
```

**Save Image:**
```bash
docker save enlaight-backend > enlaight-backend.tar
```

**Load Image:**
```bash
docker load < enlaight-backend.tar
```

---

## Monitoring & Logging

### View Logs

**All Services:**
```bash
docker compose logs -f
```

**Specific Service:**
```bash
docker compose logs -f backend
docker compose logs -f mysql
docker compose logs -f n8n
```

**Filter Logs:**
```bash
docker compose logs backend | grep ERROR
docker compose logs backend --tail 100
```

### Container Inspection

**View Container Info:**
```bash
docker compose ps
docker ps -a
```

**Inspect Container:**
```bash
docker inspect enlaight_backend
docker compose exec backend env | grep MYSQL
```

---

## Development Workflow

### Local Development

1. **Clone Repository**
   ```bash
   git clone <repo-url>
   cd enlaight-public
   ```

2. **Environment Setup**
   ```bash
   cp env.sample .env
   # Edit .env with local values
   ```

3. **Build & Start**
   ```bash
   make build
   make start
   ```

4. **Initialize Data**
   ```bash
   sleep 30
   bash create_defaults.sh
   ```

5. **Verify Services**
   ```bash
   # Frontend: http://localhost:8080
   # Backend: http://localhost:8000/api/
   # n8n: http://localhost:5678
   # Superset: http://localhost:8088
   # SMTP: http://localhost:3000
   ```

### Hot Reload Development

**Code Changes Auto-Apply:**
- Frontend: Edit `frontend/src/` files → auto-reload
- Backend: Edit `backend/src/` files → Django reloads

**If Hot Reload Fails:**
```bash
# Restart service
docker compose restart backend
docker compose restart frontend
```

---

## Deployment Checklist

- [ ] All services building successfully
- [ ] Health checks passing
- [ ] Networks properly configured
- [ ] Volumes mounted correctly
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] Static files collected
- [ ] Resource limits appropriate
- [ ] Logging configured
- [ ] Backup strategy in place
- [ ] Reverse proxy configured (if needed)
- [ ] SSL certificates generated
- [ ] Monitoring tools running

