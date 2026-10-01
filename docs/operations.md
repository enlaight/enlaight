# Enlaight Operations Guide

## Table of Contents

1. [System Overview](#system-overview)
2. [Deployment](#deployment)
3. [Service Management](#service-management)
4. [Database Operations](#database-operations)
5. [Monitoring & Logging](#monitoring--logging)
6. [Backup & Recovery](#backup--recovery)
7. [Scaling](#scaling)
8. [Troubleshooting](#troubleshooting)
9. [Performance Tuning](#performance-tuning)
10. [Maintenance Tasks](#maintenance-tasks)

---

## System Overview

Enlaight is a multi-service application composed of:

- **Frontend**: React + TypeScript (Vite) running on port 8080
- **Backend**: Django REST API with JWT authentication on port 8000
- **n8n**: Workflow automation engine on port 5678
- **QuickChart.io**: Self-hosted chart-rendering HTTP API on port 3400 (consumed by n8n workflows to turn a Chart.js-style JSON payload into a chart image)
- **PostgreSQL**: main application and n8n workflow database
- **Redis**: Caching and session management
- **SMTP**: Email service (smtp4dev locally)

### Technology Stack

**Backend:**
- Django 5.2+
- Django REST Framework
- JWT authentication (SimpleJWT)
- Boto3 (AWS integration)
- Gunicorn/Uvicorn for ASGI/WSGI

**Frontend:**
- React 18+
- TypeScript
- Vite build tool
- TanStack Query for state management
- n8n Chat widget integration

**Infrastructure:**
- Docker & Docker Compose
- PostgreSQL 15
- Redis 7
- n8n Open Source

---

## Deployment

### Local Development Setup

1. **Environment Configuration**
   ```bash
   cp env.sample .env
   ```
   Update critical values (SECRET_KEY, database passwords, API keys)

2. **Build Stage**
   ```bash
   make build
   ```
   Rebuilds all services without cache

3. **Start Services**
   ```bash
   make start
   ```
   Starts all containers with logs output

4. **Initialize Defaults**
   ```bash
   make start         # Let services stabilize (~30 seconds)
   bash create_defaults.sh
   ```
   Populates sample data in n8n and database

### Production Deployment Checklist

- [ ] Copy `env.sample` to `.env` and update all production values
- [ ] Set `DEBUG=False` in `.env`
- [ ] Set `SECURE_SSL_REDIRECT=True`
- [ ] Set `CSRF_COOKIE_SECURE=True` and `SESSION_COOKIE_SECURE=True`
- [ ] Generate strong `SECRET_KEY` (minimum 50 characters)
- [ ] Configure `ALLOWED_HOSTS` with production domain
- [ ] Set up AWS credentials or email backend
- [ ] Configure n8n API credentials and webhook URLs
- [ ] Generate strong database passwords (not defaults)
- [ ] Set up reverse proxy (Traefik/Nginx) with SSL
- [ ] Configure Redis with persistence
- [ ] Configure log aggregation

### Using Traefik for SSL/TLS

Traefik is optional but recommended for production.

**Prerequisites:**
- Domain with DNS pointing to server
- Port 80 and 443 accessible

**Configuration in docker-compose.yml:**
```yaml
traefik:
  image: traefik:v2.10
  ports:
    - "80:80"
    - "443:443"
  environment:
    - TRAEFIK_ACME_EMAIL=${TRAEFIK_ACME_EMAIL}
    - TRAEFIK_ACME_STORAGE=acme.json
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
    - ./acme.json:/acme.json
```

Services are auto-configured via Docker labels.

### Running PostgreSQL outside Docker

**This is a supported deployment.** It needs configuration on three sides — the `.env` file, the
PostgreSQL server, and the host firewall — and skipping the third produces a failure that looks like
a DNS problem but is not: the container resolves the host name, then the TCP connection hangs until
it times out.

#### 1. Point the stack at the host

```env
POSTGRES_HOST=host.docker.internal
POSTGRES_PORT=5433
N8N_DB_HOST=host.docker.internal
N8N_DB_PORT=5433
```

All four are needed. `POSTGRES_HOST` / `POSTGRES_PORT` carry the Django backend; `N8N_DB_HOST` /
`N8N_DB_PORT` carry n8n's own database connection, which is a separate setting and does **not**
inherit from the first pair.

`host.docker.internal` is defined for the `backend` and `n8n` services by an `extra_hosts` mapping to
`host-gateway` in both compose files. Docker Desktop provides this name on its own; **Docker Engine
on Linux does not**, which is why the mapping is declared explicitly rather than assumed. If you
prefer a fixed address, substitute the Docker bridge gateway IP:

```bash
docker network inspect enlaight_internal \
  -f '{{range .IPAM.Config}}{{.Gateway}}{{end}}'
```

#### 2. Let the server listen for the container

In `postgresql.conf`:

```conf
listen_addresses = '*'        # or the bridge gateway address specifically
port = 5433
```

In `pg_hba.conf`, allow the Docker network. Containers reach the host from their bridge address, so
the rule must cover the bridge subnet rather than `127.0.0.1`:

```conf
# TYPE  DATABASE            USER       ADDRESS          METHOD
host    enlaight_database   enlaight   172.16.0.0/12    scram-sha-256
host    n8n_enlaight_db     n8n        172.16.0.0/12    scram-sha-256
```

`172.16.0.0/12` covers Docker's default address pool. To pin it to this stack's actual subnets:

```bash
docker network inspect enlaight_internal enlaight_public \
  -f '{{range .IPAM.Config}}{{.Subnet}}{{end}}'
```

Reload afterwards: `pg_ctl reload`, or `SELECT pg_reload_conf();`.

#### 3. Open the firewall — this is the step that bites

A resolvable name with no route is the failure mode here. The container's packets arrive on the
Docker bridge interface, and a default-deny host firewall drops them silently, so the container waits
for the full connect timeout instead of being refused.

```bash
# ufw
sudo ufw allow from 172.16.0.0/12 to any port 5433 proto tcp

# firewalld
sudo firewall-cmd --permanent --zone=trusted --add-source=172.16.0.0/12
sudo firewall-cmd --permanent --zone=trusted --add-port=5433/tcp
sudo firewall-cmd --reload
```

Note that Docker manages its own iptables chains. A rule added to `INPUT` may be bypassed or
reordered by Docker's chains, so verify the result (step 5) rather than assuming the rule took effect.

#### 4. Create the role and database by hand

`postgres/init/01-init-databases.sql` runs **only** on first start of the bundled container, via
`docker-entrypoint-initdb.d`. An external server never executes it, so create its objects yourself:

```bash
psql -h localhost -p 5433 -U postgres -f postgres/init/01-init-databases.sql
```

> ⚠️ That script hardcodes the n8n role's password as `n8n_dev_password`, while the stack
> authenticates with `N8N_DB_PASSWORD` from `.env`. Unless the two already agree, set the real
> password after running it:
>
> ```sql
> ALTER ROLE n8n WITH PASSWORD '<value of N8N_DB_PASSWORD>';
> ```
>
> Reconciling this properly is **EN-142**.

The backend's own schema arrives through migrations as usual (`python manage.py migrate`). Grants are
**not** created by the script beyond the database level, so verify them before going live — see
**Verifying database grants** in the Production Deployment Checklist above (added by EN-134).

#### 5. Verify, from inside a container

Testing from the host proves nothing: the host can always reach its own PostgreSQL. Test from where
the connection actually originates.

```bash
# Name resolves to the host gateway? Resolved through Python rather than getent:
# on this image getent reports the IPv6 address first, while PostgreSQL is
# usually listening on IPv4, which makes getent output misleading when debugging.
docker compose exec backend python -c \
  "import socket; print(socket.gethostbyname('host.docker.internal'))"

# TCP reachable? Fails here = firewall or listen_addresses, not credentials.
docker compose exec backend python -c \
  "import socket; socket.create_connection(('host.docker.internal', 5433), 5); print('tcp ok')"

# Django can authenticate and query?
docker compose exec backend python manage.py check --database default
```

`backend/scripts/wait-for-postgres.sh` already honours `POSTGRES_HOST` and `POSTGRES_PORT`, so it
works against an external server — but note that `run.sh` does not currently invoke it, and the
backend relies on the `depends_on` health gate instead. If you remove that gate (step 6), the backend
may start before an external PostgreSQL is accepting connections.

For n8n, check its startup log rather than guessing — it fails loudly when it cannot reach its
database:

```bash
docker compose logs n8n | grep -i "database\|connection\|ECONNREFUSED\|ETIMEDOUT"
```

#### 6. The bundled `postgres` service

The `backend` and `n8n` services declare `depends_on: postgres: condition: service_healthy`, so the
bundled container still starts even when nothing uses it. Two ways to handle that:

- **Leave it running.** It binds `127.0.0.1:5432` and your external server is on another port, so
  they coexist and the idle container is merely wasted memory. Nothing to edit.
- **Remove it.** Delete the `depends_on` block from `backend` and `n8n`, and the `postgres` service
  with it. Cleaner, but it is a local modification to carry across updates.

If your external PostgreSQL listens on **5432**, the bundled container cannot bind that port on the
host and the stack fails to start. Either move the external server to another port or remove the
bundled service as above; making the published port configurable is **EN-146**.
---

## Service Management

### Starting/Stopping Services

```bash
# Start all services
make start

# Stop all services (preserves volumes/data)
make stop

# Complete cleanup (removes volumes and data)
make clear

# View running services
docker compose ps

# View service logs
docker compose logs -f [service_name]

# Tail specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f n8n
```

### Service-Specific Management

#### Backend (Django)

```bash
# Run Django management commands
docker compose exec backend python manage.py <command>

# Create migrations
docker compose exec backend python manage.py makemigrations authentication

# Apply migrations
docker compose exec backend python manage.py migrate

# Create superuser/admin
docker compose exec backend python manage.py createsuperuser

# Run shell
docker compose exec backend python manage.py shell

# Collect static files
docker compose exec backend python manage.py collectstatic --noinput
```

#### PostgreSQL (db & n8n)

```bash
# Connect to PostgreSQL shell
docker compose exec postgres psql -U n8n -d n8n_enlaight_db

# Backup database
docker compose exec postgres pg_dump -U n8n n8n_enlaight_db > n8n_backup.sql

# Restore database
docker compose exec -T postgres psql -U n8n n8n_enlaight_db < n8n_backup.sql
```

```bash
# Connect to PostgreSQL shell
docker compose exec postgres psql -U enlaight -d enlaight_database

# Backup database
docker compose exec postgres pg_dump -U enlaight enlaight_database > backup.sql

# Restore database
docker compose exec -T postgres psql -U enlaight enlaight_database < backup.sql
```

#### Redis

```bash
# Connect to Redis CLI
docker compose exec redis redis-cli

# View all keys
KEYS *

# Clear cache
FLUSHALL

# Check memory
INFO memory
```

#### Frontend

```bash
# View frontend logs
docker compose logs -f frontend

# Rebuild frontend (if changes made in mounted volume)
docker compose down frontend
docker compose up -d frontend
```

#### n8n

```bash
# Access n8n UI at http://localhost:5678

# View n8n logs
docker compose logs -f n8n

# Reset n8n (removes all workflows)
docker compose exec n8n n8n db:drop
```

### Health Checks

Each service has health checks configured:

```bash
# View health status
docker compose ps

# Manual health verification
curl http://localhost:8000/health/        # Backend (process)
curl http://localhost:8000/api/health/db/ # Backend → Postgres round-trip
curl http://localhost:8080/               # Frontend
curl http://localhost:5678/healthz        # n8n
```

---

## Database Operations

### Schema Migrations

Django handles schema evolution through migrations.

**Create Migration:**
```bash
docker compose exec backend python manage.py makemigrations authentication --name descriptive_name
```

**Review Migration:**
```bash
# Check generated migration file
vim backend/src/authentication/migrations/XXXX_descriptive_name.py
```

**Apply Migrations:**
```bash
docker compose exec backend python manage.py migrate
```

**Rollback (if problematic):**
```bash
docker compose exec backend python manage.py migrate authentication XXXX
```

### Data Population

The `create_defaults.sh` script populates initial data:

```bash
bash create_defaults.sh
```

It runs (each step is skipped gracefully if the script is missing):

1. `n8n/scripts/create_sample_kb.py` — sample knowledge bases (not shipped in this repo; the script falls through with a yellow "skipped" notice)
2. `backend/scripts/populate_db.py` — populates the backend database

**To repopulate after reset:**
```bash
make clear
make start
sleep 30  # Wait for services to initialize
bash create_defaults.sh
```

### User Management

**Create Admin User:**
```bash
docker compose exec backend python manage.py createsuperuser
```

**Reset Admin Credentials (default):**

The default admin is seeded by the `seed_admin` management command, which
runs the SQL at
[`backend/src/authentication/management/commands/set_admin.sql`](../backend/src/authentication/management/commands/set_admin.sql).
Edit that file before the first `make start` to change the shipped
defaults:

```sql
-- Excerpt — see the full file for all required columns.
INSERT INTO authentication_userprofile (
    id, password, full_name, ..., email, role, ...
) VALUES (
    'a3c2f5d8-1e6a-4b3f-9a8c-2d5b6f7c8e9f'::uuid,
    'pbkdf2_sha256$1000000$...',          -- pre-hashed (use Django's make_password)
    'Admin Account',
    ...
    'admin@localhost.ai',
    'ADMINISTRATOR',
    ...
)
ON CONFLICT DO NOTHING;
```

The role value is `ADMINISTRATOR` (the only admin tier in
[`roles.py`](../backend/src/authentication/models/roles.py); `ADMIN` is also
accepted by `is_admin_by_role()` for backward compatibility).

**Add User via Django Shell:**
```bash
docker compose exec backend python manage.py shell
>>> from authentication.models import UserProfile
>>> UserProfile.objects.create_user(
...     username='user', email='user@example.com',
...     password='password123', role='USER',
... )
```

---

## Monitoring & Logging

### Log Aggregation

#### View All Logs
```bash
docker compose logs -f
```

#### View Service Logs
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f n8n
```

#### Search Logs
```bash
docker compose logs backend | grep ERROR
docker compose logs n8n | grep "workflow"
```

### Key Metrics to Monitor

1. **Container Health**
   - Memory usage: `docker stats`
   - CPU usage
   - Restart count

2. **Database Performance**
   - Query execution time
   - Connection pool status
   - Disk space

3. **API Performance**
   - Response time (backend logs)
   - Request rate
   - Error rate (5xx responses)

4. **Cache Performance (Redis)**
   - Memory usage
   - Hit/miss ratio
   - Eviction rate

### Production Monitoring Setup

Recommended tools:
- **Prometheus** - Metrics collection
- **Grafana** - Visualization
- **ELK Stack** - Log aggregation
- **Jaeger** - Distributed tracing
- **New Relic/DataDog** - Full observability

Example Prometheus scrape config:
```yaml
scrape_configs:
  - job_name: 'django-backend'
    static_configs:
      - targets: ['localhost:8000']
```

---

## Backup & Recovery

### Backup Strategy

Implement daily automated backups for production:

```bash
#!/bin/bash
# backup.sh - Run via cron daily

BACKUP_DIR="/backups/enlaight"
DATE=$(date +%Y%m%d_%H%M%S)

# Backend DB (PostgreSQL) backup
docker compose exec -T postgres pg_dump -U ${BACKEND_DB_USER} ${BACKEND_DB} \
  > ${BACKUP_DIR}/backend_${DATE}.sql

# n8n DB backup (same Postgres instance, separate database)
docker compose exec -T postgres pg_dump -U n8n n8n_enlaight_db \
  > ${BACKUP_DIR}/n8n_${DATE}.sql

# Redis Backup
docker compose exec redis redis-cli BGSAVE

# n8n Workflows & Files
tar -czf ${BACKUP_DIR}/n8n_files_${DATE}.tar.gz ./n8n/

# Cleanup old backups (keep 30 days)
find ${BACKUP_DIR} -type f -mtime +30 -delete

echo "Backup completed: ${DATE}"
```

**Crontab entry:**
```cron
0 2 * * * /home/ubuntu/backup.sh >> /var/log/enlaight-backup.log 2>&1
```

### Recovery Procedures

#### Full System Recovery

1. **Restore Backend Database (PostgreSQL)**
   ```bash
   docker compose exec postgres dropdb -U ${BACKEND_DB_USER} ${BACKEND_DB}
   docker compose exec postgres createdb -U ${BACKEND_DB_USER} ${BACKEND_DB}
   docker compose exec -T postgres psql -U ${BACKEND_DB_USER} ${BACKEND_DB} < backend_backup.sql
   ```

2. **Restore n8n Database (PostgreSQL)**
   ```bash
   docker compose exec postgres dropdb -U n8n n8n_enlaight_db
   docker compose exec postgres createdb -U n8n -O n8n n8n_enlaight_db
   docker compose exec -T postgres psql -U n8n n8n_enlaight_db < n8n_backup.sql
   ```

3. **Restore n8n Files**
   ```bash
   tar -xzf n8n_files_backup.tar.gz
   ```

4. **Verify Data Integrity**
   ```bash
   docker compose down
   docker compose up -d
   docker compose exec backend python manage.py migrate
   docker compose logs -f backend
   ```

#### Partial Recovery (Single Database)

**Restore Backend Database Only:**
```bash
docker compose stop backend
docker compose exec -T postgres psql -U ${BACKEND_DB_USER} ${BACKEND_DB} < backend_backup.sql
docker compose start backend
```

---

## Scaling

### Horizontal Scaling

#### Frontend Scaling

The frontend is stateless and can be horizontally scaled:

```yaml
# docker-compose.yml
frontend-1:
  build: ./frontend
  ports:
    - "8080:8080"

frontend-2:
  build: ./frontend
  ports:
    - "8081:8080"

# Load balance with Traefik or Nginx
```

#### Backend Scaling

Backend can be scaled with a load balancer:

```yaml
backend-1:
  build: ./backend
  ports:
    - "8000:8000"
  environment:
    - WSGI_WORKERS=4

backend-2:
  build: ./backend
  ports:
    - "8001:8000"
  environment:
    - WSGI_WORKERS=4

# Use Traefik/Nginx for load balancing
```

Load balancer configuration (Nginx example):
```nginx
upstream backend {
    server backend-1:8000;
    server backend-2:8000;
    least_conn;
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
    }
}
```

#### Database Scaling

**Read Replicas (PostgreSQL):**
```bash
docker compose exec postgres pg_basebackup -D /var/lib/postgresql/replica1 \
  -U replication -Fp -Xs -P -R
```

- Configure streaming replication on the primary (`wal_level=replica`,
  `max_wal_senders`, a `replication` role).
- Point read-only analytics queries at the replica.

### Vertical Scaling

Adjust resource limits in `docker-compose.yml`:

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 1G

postgres:
  deploy:
    resources:
      limits:
        cpus: '4'
        memory: 4G
```

---

## Troubleshooting

### Common Issues

#### Backend Won't Start

```bash
# Check logs
docker compose logs backend

# Common causes:
# 1. Postgres not ready
docker compose logs postgres

# 2. Failed migrations
docker compose exec backend python manage.py migrate --noinput

# 3. SECRET_KEY not set
docker compose exec backend printenv | grep SECRET_KEY

# 4. Permission issues
docker compose exec backend python manage.py collectstatic --noinput
```

#### Frontend Connection Issues

```bash
# Check if backend is reachable
docker compose exec frontend curl http://backend:8000/api/

# Verify environment variables
docker compose exec frontend printenv | grep VITE_API_BASE_URL

# Check CORS settings
curl -H "Origin: http://localhost:8080" http://localhost:8000/api/
```

#### Database Connection Errors

```bash
# Check Postgres health
docker compose exec postgres pg_isready -U ${BACKEND_DB_USER} -d ${BACKEND_DB}

# Check connection from backend
docker compose exec backend python manage.py dbshell

# Verify credentials in .env
docker compose exec backend printenv | grep -E 'POSTGRES_|BACKEND_DB'
```

#### n8n Integration Issues

```bash
# Check n8n health
curl http://localhost:5678/healthz

# Verify backend → n8n config
docker compose exec backend python manage.py shell
>>> from django.conf import settings
>>> print(settings.N8N_BASE_URL)
>>> print(settings.N8N_KB_KEY)   # secret used in the `key` header on every webhook call
>>> print(settings.N8N_TIMEOUT)
```

#### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker artifacts
docker system prune -a

# Remove old volumes
docker volume prune

# Check container sizes
docker compose exec postgres du -sh /var/lib/postgresql/data/*
```

#### Memory Issues (OOMKilled)

```bash
# Increase container memory limits in docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 4G  # Increase from 2G

# Or restart with more resources
docker compose down
# Edit docker-compose.yml
docker compose up -d
```

#### Slow Queries

```bash
# Enable slow-query logging in Postgres (runtime; persist via postgresql.conf)
docker compose exec postgres psql -U ${BACKEND_DB_USER} -d ${BACKEND_DB} -c \
  "ALTER SYSTEM SET log_min_duration_statement = 500;"  # ms
docker compose exec postgres psql -U ${BACKEND_DB_USER} -d ${BACKEND_DB} \
  -c "SELECT pg_reload_conf();"

# Tail Postgres logs for slow queries
docker compose logs -f postgres | grep 'duration:'

# Analyze a query
docker compose exec postgres psql -U ${BACKEND_DB_USER} -d ${BACKEND_DB} \
  -c "EXPLAIN ANALYZE SELECT * FROM authentication_userprofile;"
```

---

## Performance Tuning

### Backend Optimization

**Django Settings:**
```python
# settings.py
DATABASES["default"]["CONN_MAX_AGE"] = 600  # Connection pooling
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://redis:6379/1",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "CONNECTION_POOL_KWARGS": {"max_connections": 50}
        }
    }
}
```

**WSGI/ASGI Workers:**
```bash
# Gunicorn with multiple workers
docker compose exec backend gunicorn core.wsgi:application \
  --workers 4 --worker-class gevent --worker-connections 1000
```

### PostgreSQL Optimization

```conf
# Key tunables (postgresql.conf or ALTER SYSTEM ...)
shared_buffers = 2GB                # ~25% of host memory
effective_cache_size = 6GB          # ~50–75% of host memory
work_mem = 16MB                     # per-operation sort/hash
maintenance_work_mem = 512MB        # VACUUM / CREATE INDEX
max_connections = 200               # pair with pgbouncer if higher
wal_compression = on
log_min_duration_statement = 500    # ms — log slow queries
```

Run `ANALYZE;` after large imports and enable `auto_explain` if you need
per-query plan logging.

### Redis Optimization

```bash
# Configure Redis persistence
docker compose exec redis redis-cli CONFIG SET save "900 1 300 10 60 10000"

# Monitor Redis
docker compose exec redis redis-cli INFO stats
```

### Frontend Optimization

```bash
# Enable gzip compression
# In nginx or web server config
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1024;

# Enable caching headers
add_header Cache-Control "public, max-age=31536000";
```

---

## Maintenance Tasks

### Daily Tasks

- [ ] Monitor disk space
- [ ] Check error logs
- [ ] Verify backup completion

### Weekly Tasks

- [ ] Review performance metrics
- [ ] Check for required updates
- [ ] Test backup restoration
- [ ] Review failed login attempts

### Monthly Tasks

- [ ] Update Docker images
- [ ] Audit user access
- [ ] Database optimization (ANALYZE/OPTIMIZE)
- [ ] Security patch updates
- [ ] Capacity planning review

### Quarterly Tasks

- [ ] Load testing
- [ ] Disaster recovery drill
- [ ] Security audit
- [ ] Performance baseline review

### Annual Tasks

- [ ] Full system audit
- [ ] Technology stack review
- [ ] Capacity expansion planning
- [ ] Security penetration test

### Update Procedures

**Check for Updates:**
```bash
docker compose pull
```

**Update Services (with testing):**
```bash
# Create backup first
bash backup.sh

# Download new images
docker compose pull

# Test in staging
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# If OK, update production
docker compose down
docker compose pull
docker compose up -d
docker compose exec backend python manage.py migrate
```

---

## Useful Commands Reference

```bash
# System Status
docker compose ps                    # Container status
docker stats                         # Real-time resource usage
docker compose logs -f               # Follow all logs

# Database Operations
docker compose exec postgres psql -U ${BACKEND_DB_USER} -d ${BACKEND_DB}   # backend DB shell
docker compose exec postgres psql -U n8n -d n8n_enlaight_db                # n8n DB shell

# Cleanup
docker system prune                  # Remove unused images
docker volume prune                  # Remove unused volumes
make clear                          # Complete reset

# Development
make start                           # Start all services
make stop                            # Stop services
make reset                           # Full reset and restart
bash create_defaults.sh              # Initialize sample data
```

---

## Emergency Contacts & Escalation

- **Database Down**: Check Postgres logs, verify disk space, attempt restore
- **API Down**: Check Django logs, verify database connectivity, restart backend
- **n8n Issues**: Check PostgreSQL (shared instance), verify workflow status, review n8n logs
- **Performance Degradation**: Check resource usage, database load, cache hit rate

For production emergencies, maintain runbooks in `/docs/runbooks/`.
