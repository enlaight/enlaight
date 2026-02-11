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
- **Superset**: Data visualization and analytics on port 8088
- **MySQL**: Main application and Superset metadata database
- **PostgreSQL**: n8n workflow database
- **Redis**: Caching and session management
- **SMTP**: Email service (smtp4dev locally)

### Technology Stack

**Backend:**
- Django 5.2+
- Django REST Framework
- JWT authentication (SimpleJWT)
- MySQL driver (mysqlclient)
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
- MySQL 8.4
- PostgreSQL 15
- Redis 7
- n8n Open Source
- Apache Superset

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
- [ ] Set up MySQL backups
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

#### MySQL

```bash
# Connect to MySQL shell
docker compose exec mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD}

# Backup database
docker compose exec mysql mysqldump -uroot -p${MYSQL_ROOT_PASSWORD} enlaight_database > backup.sql

# Restore database
docker compose exec -T mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} enlaight_database < backup.sql
```

#### PostgreSQL (n8n)

```bash
# Connect to PostgreSQL shell
docker compose exec postgres psql -U n8n -d n8n_enlaight_db

# Backup database
docker compose exec postgres pg_dump -U n8n n8n_enlaight_db > n8n_backup.sql

# Restore database
docker compose exec -T postgres psql -U n8n n8n_enlaight_db < n8n_backup.sql
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
curl http://localhost:8000/api/    # Backend
curl http://localhost:8080/        # Frontend
curl http://localhost:5678/        # n8n
curl http://localhost:8088/        # Superset
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

This runs:
1. `n8n/create_sample_kb.py` - Creates sample knowledge bases
2. `backend/scripts/populate_db.py` - Populates backend database

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
Edit `backend/mysql/init/set_admin.sql` before initial `make start`:
```sql
-- Default admin user setup
INSERT INTO authentication_userprofile (email, password, role, is_active)
VALUES ('admin@localhost.ai', '<hashed_password>', 'ADMIN', 1);
```

**Add User via Django Shell:**
```bash
docker compose exec backend python manage.py shell
>>> from authentication.models import UserProfile
>>> UserProfile.objects.create_user(email='user@example.com', password='password123', role='USER')
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
docker compose logs -f mysql
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

# MySQL Backup
docker compose exec -T mysql mysqldump -uroot -p${MYSQL_ROOT_PASSWORD} \
  --all-databases > ${BACKUP_DIR}/mysql_${DATE}.sql

# PostgreSQL Backup (n8n)
docker compose exec -T postgres pg_dump -U n8n n8n_enlaight_db \
  > ${BACKUP_DIR}/n8n_${DATE}.sql

# Redis Backup
docker compose exec redis redis-cli BGSAVE

# n8n Workflows & Files
tar -czf ${BACKUP_DIR}/n8n_files_${DATE}.tar.gz ./n8n/

# Superset Backup
tar -czf ${BACKUP_DIR}/superset_${DATE}.tar.gz ./superset/

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

1. **Restore MySQL Database**
   ```bash
   docker compose exec -T mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} < mysql_backup.sql
   ```

2. **Restore PostgreSQL Database**
   ```bash
   docker compose exec postgres dropdb -U n8n n8n_enlaight_db
   docker compose exec -T postgres psql -U n8n < n8n_backup.sql
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
docker compose exec -T mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} enlaight_database < enlaight_database_backup.sql
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

**Read Replicas:**
```bash
# For PostgreSQL (n8n)
docker compose exec postgres pg_basebackup -D /var/lib/postgresql/replica1
```

**MySQL Replication:**
- Set up binary logging on primary
- Create read replicas for analytics queries

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

mysql:
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
# 1. MySQL not ready
docker compose logs mysql

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
# Check MySQL health
docker compose exec mysql mysqladmin ping -uroot -p${MYSQL_ROOT_PASSWORD}

# Check connection from backend
docker compose exec backend python manage.py dbshell

# Verify credentials in .env
docker compose exec backend printenv | grep MYSQL
```

#### n8n Integration Issues

```bash
# Check n8n health
curl http://localhost:5678/api/v1/status

# Verify credentials
docker compose exec backend python manage.py shell
>>> from django.conf import settings
>>> print(settings.N8N_API_KEY)
>>> print(settings.N8N_BASE_URL)
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
docker compose exec backend du -sh /var/lib/mysql/*
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
# Enable MySQL query log
docker compose exec mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} -e \
  "SET GLOBAL slow_query_log = 'ON';"

# View slow queries
docker compose exec mysql tail -f /var/log/mysql/slow.log

# Analyze query
docker compose exec mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} \
  -e "EXPLAIN SELECT * FROM authentication_userprofile;"
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

### MySQL Optimization

```sql
-- Key configurations in docker-compose.yml
--character-set-server=utf8mb4
--collation-server=utf8mb4_unicode_ci
--innodb_buffer_pool_size=2G
--innodb_log_file_size=512M
--max_connections=1000
--query_cache_type=1
--query_cache_size=256M
```

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
docker compose exec mysql mysql -u...  # MySQL shell
docker compose exec postgres psql -U...  # PostgreSQL shell

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

- **Database Down**: Check MySQL logs, verify disk space, attempt restore
- **API Down**: Check Django logs, verify database connectivity, restart backend
- **n8n Issues**: Check PostgreSQL, verify workflow status, review n8n logs
- **Performance Degradation**: Check resource usage, database load, cache hit rate

For production emergencies, maintain runbooks in `/docs/runbooks/`.
