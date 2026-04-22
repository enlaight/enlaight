# Enlaight Security Guide

## Table of Contents

1. [Security Overview](#security-overview)
2. [Environment Variables & Secrets](#environment-variables--secrets)
3. [Authentication & Authorization](#authentication--authorization)
4. [Transport Security](#transport-security)
5. [Database Security](#database-security)
6. [API Security](#api-security)
7. [Credential Management](#credential-management)
8. [Access Control](#access-control)
9. [Third-Party Integrations](#third-party-integrations)
10. [Security Checklist](#security-checklist)

---

## Security Overview

Enlaight implements multiple layers of security:

- JWT-based API authentication
- Role-based access control (RBAC)
- Project-based multi-tenancy isolation
- Encrypted credential storage
- HTTPS/TLS for data in transit
- CSRF and XSS protections
- Secure password hashing (PBKDF2)
- Environment-based configuration

**Security Principles:**
- Deny by default; allow explicitly
- Separate concerns (frontend, backend, services)
- Encrypt sensitive data in transit
- Hash passwords and sensitive credentials
- Audit authentication and authorization
- Regular security updates and patching

---

## Environment Variables & Secrets

### Secret Generation

All secrets must be generated before deployment. **NEVER use default values in production.**

#### Django SECRET_KEY

Generate a strong 50+ character secret:

```bash
# Generate using Python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Or using OpenSSL
openssl rand -base64 64 | head -c 50
```

Store in `.env`:
```
SECRET_KEY=<your_generated_secret_key>
```

#### JWT Signing Key

```python
# In .env
JWT_ALGORITHM=HS256
JWT_SIGNING_KEY=<same_as_SECRET_KEY_or_separate>
```

JWT configuration (from `env.sample`):
```
# Token lifetime settings
# Access tokens expire after 2 hours (from settings.py)
# Refresh tokens expire after 1 day
# Tokens are rotated on refresh; old tokens blacklisted
```

#### Database Credentials

**NEVER use defaults (`enlaight`/`enlaight`) in production.**

```env
# PostgreSQL (db & n8n)
POSTGRES_PASSWORD=<strong_password_min_16_chars>
```

Generate strong passwords:
```bash
# Using OpenSSL (printable characters)
openssl rand -base64 32

# Or using Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Critical Environment Variables

| Variable | Purpose | Production Value | Risk Level |
|----------|---------|------------------|-----------|
| `SECRET_KEY` | Django secret | Strong 50+ char random | **CRITICAL** |
| `DEBUG` | Debug mode | `False` | **CRITICAL** |
| `ALLOWED_HOSTS` | Allowed domains | Production domain only | **HIGH** |
| `CORS_ALLOWED_ORIGINS` | Frontend origins | Production frontend URL(s) | **HIGH** |
| `USE_X_FORWARDED_HOST` | Proxy headers | `True` if behind proxy | **HIGH** |
| `SECURE_SSL_REDIRECT` | Force HTTPS | `True` | **HIGH** |
| `CSRF_COOKIE_SECURE` | CSRF cookie | `True` | **HIGH** |
| `SESSION_COOKIE_SECURE` | Session cookie | `True` | **HIGH** |
| `SECURE_HSTS_SECONDS` | HSTS max-age | `31536000` once HTTPS is confirmed | **MEDIUM** |
| `X_FRAME_OPTIONS` | Clickjacking defense | `DENY` | **MEDIUM** |
| `N8N_BIND_HOST` | n8n port bind interface | `127.0.0.1` unless fronted by proxy | **HIGH** |
| `POSTGRES_BIND_HOST` | Postgres port bind interface | `127.0.0.1` | **HIGH** |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE` | Sandbox Execute Code nodes | `true` | **HIGH** |
| `ENABLE_DRF_THROTTLE` | DRF rate limiting | `True` (unless proxy-level throttling) | **MEDIUM** |
| `ALLOW_UNVERIFIED_JWT` | Debug JWT fallback | **unset** — never set in prod | **CRITICAL** |
| `N8N_API_KEY` | n8n access | Generated secret | **CRITICAL** |
| `N8N_KB_KEY` | Knowledge base key | Generated secret | **CRITICAL** |
| `EMAIL_HOST_USER` | SMTP username | SMTP credentials | **HIGH** |
| `EMAIL_HOST_PASSWORD` | SMTP password | SMTP credentials | **CRITICAL** |

### Secrets Management Best Practices

**Development:**
```bash
# Store in .env (never commit)
echo ".env" >> .gitignore
cp env.sample .env
# Edit .env with development values
```

**Staging/Production:**
- Use **AWS Secrets Manager** or **HashiCorp Vault**
- Never pass secrets via environment variables in logs
- Rotate secrets quarterly
- Audit secret access logs

**CI/CD Integration:**
```yaml
# GitHub Actions example
env:
  SECRET_KEY: ${{ secrets.DJANGO_SECRET_KEY }}
  N8N_API_KEY: ${{ secrets.N8N_API_KEY }}
  # Never log or echo secrets
```

---

## Authentication & Authorization

### JWT Authentication

The application uses JWT (JSON Web Tokens) via `djangorestframework-simplejwt`:

**Token Lifecycle:**
1. User provides email/password credentials
2. Backend validates against UserProfile model
3. System returns access_token (2-hour lifetime) + refresh_token (1-day lifetime)
4. Client stores tokens (access_token in memory, refresh_token in httpOnly cookie)
5. On token expiration, client exchanges refresh_token for new access_token
6. Old tokens are blacklisted after rotation

**Token Configuration (from settings.py):**
```python
SIMPLE_JWT = {
    "ALGORITHM": "HS256",                          # Signing algorithm
    "SIGNING_KEY": os.getenv("JWT_SIGNING_KEY"),  # Must be strong secret
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=2),  # 2-hour expiration
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),  # 1-day expiration
    "ROTATE_REFRESH_TOKENS": True,                # Refresh tokens rotate
    "BLACKLIST_AFTER_ROTATION": True,             # Old tokens invalidated
    "LEEWAY": 30,                                 # 30-second clock skew tolerance
    "AUTH_HEADER_TYPES": ("Bearer",)              # Authorization: Bearer <token>
}
```

**API Authentication Header:**
```http
Authorization: Bearer <access_token>
```

### Role-Based Access Control (RBAC)

Users have roles that determine permissions:

**Available Roles:**
- `ADMINISTRATOR` — Full system access
- `USER` — Project-based access

The `LoginAs` impersonation endpoint blocks `USER`, so only `ADMINISTRATOR`
can issue tokens for other accounts. If additional role tiers are added in
the future, [`login_as.py`](../backend/src/authentication/views/login_as.py)
must gain a role-rank check to prevent upward impersonation.


**Permission Enforcement:**

All API endpoints enforce permissions via `IsAdminByRole` and `IsAdminOrRelatedToBot` classes:

```python
# From permissions.py
def is_admin_by_role(user) -> bool:
    return str(getattr(user, "role", "")).upper() in {"ADMIN", "ADMINISTRATOR"}

def assert_user_project_access(user, project):
    # Admins bypass
    if is_admin_by_role(user):
        return
    # Non-admins must be explicitly related to project
    if not project.users.filter(id=user.id).exists():
        raise PermissionDenied("No project access")
```

### Multi-Tenancy Isolation

Projects provide tenant isolation:

**Project-Based Access:**
- Each project has associated users and bots
- Users can only access projects they're assigned to
- Admins bypass project restrictions
- Knowledge Base access validated through KBLink.project relationship

**Implementation:**
```python
# Knowledge base access validation
def assert_user_kb_access(user, hash_id: str):
    if not KBLink.objects.filter(
        external_id=hash_id, 
        project__users__id=user.id
    ).exists():
        raise PermissionDenied("No KB access")
```

---

## Transport Security

### HTTPS/TLS Configuration

**Environment Variables (from env.sample):**
```env
# Development (HTTP)
SECURE_SSL_REDIRECT=False
CSRF_COOKIE_SECURE=False
SESSION_COOKIE_SECURE=False
USE_X_FORWARDED_HOST=False

# Production (HTTPS via reverse proxy)
SECURE_SSL_REDIRECT=True
CSRF_COOKIE_SECURE=True
SESSION_COOKIE_SECURE=True
USE_X_FORWARDED_HOST=True
```

**Django Security Headers:**
```python
# settings.py
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
```

**Traefik SSL Configuration:**
```yaml
# docker-compose.yml - Traefik service
traefik:
  environment:
    - TRAEFIK_ACME_EMAIL=${TRAEFIK_ACME_EMAIL}
    - TRAEFIK_CAPSULE_STORAGE=acme.json
    - TRAEFIK_ENTRYPOINTS_WEBSECURE_ADDRESS=:443
    - TRAEFIK_ENTRYPOINTS_WEBSECURE_TLS=true
    - TRAEFIK_ENTRYPOINTS_WEBSECURE_TLS_CERTRESOLVER=letsencrypt
```

### CORS Policy

**Frontend URL Configuration:**
```env
FRONTEND_URL=http://localhost:8080                # Used in reset/invite email links
CORS_ALLOWED_ORIGINS=http://localhost:8080        # Comma-separated allowlist
# Production: https://app.example.com
```

**CORS Settings ([settings.sample.py](../backend/src/core/settings.sample.py)):**

CORS is env-driven. `CORS_ALLOW_ALL_ORIGINS` is always `False`; the allowlist
comes from the `CORS_ALLOWED_ORIGINS` env var. If the var is empty the template
falls back to local dev ports (`http://localhost:8080`, `http://127.0.0.1:8080`).

```python
# settings.sample.py
_cors_origins = [o.strip() for o in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if o.strip()]
if _cors_origins:
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = _cors_origins
else:
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = ["http://localhost:8080", "http://127.0.0.1:8080"]

CORS_ALLOW_CREDENTIALS = True  # required to send the httpOnly refresh cookie
```

`CORS_ALLOW_CREDENTIALS = True` is necessary because the refresh token is sent
as an httpOnly cookie; the CORS spec forbids credentials with a wildcard origin,
so the allowlist must always be explicit.

### CSRF Protection

**Django CSRF Settings:**
```python
MIDDLEWARE = [
    "django.middleware.csrf.CsrfViewMiddleware",
    # ...
]
```

### HTTP Security Headers

Default-on headers (set in [`settings.sample.py`](../backend/src/core/settings.sample.py)):

```python
SECURE_CONTENT_TYPE_NOSNIFF = True              # blocks MIME sniffing
X_FRAME_OPTIONS = os.getenv("X_FRAME_OPTIONS", "DENY")  # clickjacking defense
```

**HSTS (opt-in via env var):**

HSTS is off by default because enabling it on a domain that isn't fully HTTPS
can lock browsers out. Once HTTPS is confirmed end-to-end, enable it via `.env`:

```env
SECURE_HSTS_SECONDS=31536000        # 1 year (recommended)
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=False           # only set True after submitting to the preload list
```

The settings file only emits the HSTS headers when `SECURE_HSTS_SECONDS > 0`,
so forks running on HTTP skip it automatically.

---

## Database Security

### PostgreSQL Security

The Enlaight backend uses PostgreSQL 15 (single container, two databases:
the Django app DB and the n8n DB share one Postgres instance).

**Credentials (from env.sample):**
```env
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
BACKEND_DB=enlaight_database
BACKEND_DB_USER=enlaight
BACKEND_DB_PASSWORD=<strong_password>       # change from the shipped default
POSTGRES_BIND_HOST=127.0.0.1                # host interface the DB port publishes to
```

**Connection Security:**

The Postgres container exposes port 5432 only on `${POSTGRES_BIND_HOST:-127.0.0.1}`
(see [`docker-compose.yml`](../docker-compose.yml)). Backend and n8n reach the
DB over the internal Docker network (`POSTGRES_HOST=postgres`). Override
`POSTGRES_BIND_HOST=0.0.0.0` only if the DB must be reachable from outside
the host *and* a firewall restricts access to trusted sources.

**Database Configuration ([settings.sample.py](../backend/src/core/settings.sample.py)):**
```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME":     os.environ.get("BACKEND_DB", "enlaight_database"),
        "USER":     os.environ.get("BACKEND_DB_USER", "enlaight"),
        "PASSWORD": os.environ.get("BACKEND_DB_PASSWORD", "enlaight"),
        "HOST":     os.environ.get("POSTGRES_HOST", "postgres"),
        "PORT":     os.environ.get("POSTGRES_PORT", "5432"),
    }
}
```

**Privilege separation:**

- `BACKEND_DB_USER` owns only `BACKEND_DB` (`enlaight_database` by default).
- The `n8n` role owns only `n8n_enlaight_db` (created by
  [`postgres/init/01-init-databases.sql`](../postgres/init/01-init-databases.sql)).
- Neither application runs as the `postgres` superuser.

**Non-Root User:**
PostgreSQL runs with dedicated `n8n` user (not root), limiting damage from compromise.

### Password Hashing

**Django Configuration (settings.py):**
```python
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    # PBKDF2 with thousands of iterations
]
```

Passwords are hashed with PBKDF2 (168,000+ iterations as of Django 5.2), making rainbow table attacks infeasible.

---

## API Security

### Input Validation

**Django REST Framework Serializers:**
All inputs are validated through DRF serializers:
```python
# Automatic validation:
# - Required fields
# - Type validation
# - Length constraints
# - Format validation (email, URL, etc.)
```

**SQL Injection Prevention:**
```python
# Always use ORM, never raw SQL
# Good:
User.objects.filter(email=user_input)

# Never:
User.objects.raw(f"SELECT * FROM users WHERE email = '{user_input}'")
```

### Rate Limiting

DRF throttling is enabled by default in
[`settings.sample.py`](../backend/src/core/settings.sample.py) and gated by
`ENABLE_DRF_THROTTLE` so forks that rate-limit at the proxy/CDN layer
(Cloudflare, nginx, etc.) can turn it off cleanly:

```python
if env_bool("ENABLE_DRF_THROTTLE", True):
    REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ]
    REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {
        "anon":           os.getenv("THROTTLE_ANON",           "30/minute"),
        "user":           os.getenv("THROTTLE_USER",           "120/minute"),
        "login":          os.getenv("THROTTLE_LOGIN",          "5/minute"),
        "password_reset": os.getenv("THROTTLE_PASSWORD_RESET", "3/minute"),
    }
```

**Per-view scopes:**

- [`LoginView`](../backend/src/authentication/views/authentication.py) → `throttle_scope = "login"`
- [`ForgotPasswordView`](../backend/src/authentication/views/authentication.py) → `throttle_scope = "password_reset"`
- [`ResetPasswordView`](../backend/src/authentication/views/authentication.py) → `throttle_scope = "password_reset"`

These scopes apply on top of the global `anon` / `user` limits, so brute-force
on authentication is capped tightly (5 login attempts / 3 password resets per
minute per IP) without crippling normal API traffic.

**Tuning:** override any rate in `.env` — e.g. `THROTTLE_LOGIN=10/minute`.
The default unit is `minute`; DRF also accepts `second`, `hour`, `day`.

### API Documentation

**Swagger/OpenAPI Endpoint:**
```
GET /api/schema/swagger/
GET /api/schema/redoc/
```

Security definitions in Swagger (settings.py):
```python
SWAGGER_SETTINGS = {
    "SECURITY_DEFINITIONS": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "Insert JWT token: Bearer <token>"
        }
    }
}
```

### Logging & Monitoring

Log all authentication attempts:

**Django Logging Configuration (recommended):**
```python
LOGGING = {
    "version": 1,
    "handlers": {
        "file": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": "/var/log/enlaight/auth.log",
            "maxBytes": 1024 * 1024 * 10,  # 10MB
            "backupCount": 10
        }
    },
    "loggers": {
        "authentication.views": {
            "level": "INFO",
            "handlers": ["file"]
        }
    }
}
```

---

## Credential Management

### Email Service Credentials

**AWS SES Configuration (from env.sample):**
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=email-smtp.eu-central-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=<aws_verified_email_or_iam_user>
EMAIL_HOST_PASSWORD=<aws_smtp_password_not_iam_password>
DEFAULT_FROM_EMAIL=noreply@example.com
```

**Generating AWS SMTP Credentials:**
```
1. AWS Console → SES → SMTP Settings
2. Create SMTP credentials (separate from IAM credentials)
3. Never use IAM user access keys for SMTP
4. Rotate credentials annually
```

**Fallback: Local SMTP (Development only)**
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp
EMAIL_PORT=25
EMAIL_USE_TLS=False
# smtp4dev service handles email locally without authentication
```

### n8n API Credentials

**Configuration (from env.sample):**
```env
N8N_API_KEY=<your_n8n_api_key_here>
N8N_BASE_URL=https://n8n.enlaight.ai
N8N_KB_KEY=<your_n8n_kb_key_here>
N8N_TIMEOUT=15
N8N_SSL_HOST=enlaight.ai
```

**Generating n8n API Key:**
```
1. Access n8n UI: http://localhost:5678
2. Settings → Personal Settings → API Token
3. Generate and store securely
4. Rotate regularly (quarterly)
```

**Webhook URL Validation:**
```env
WEBHOOK_URL=http://localhost:5678
# Production: https://n8n.example.com (must be HTTPS)
```

### Google OAuth (Optional)

If using Google authentication:
```env
GOOGLE_CLIENT_ID=<your_google_client_id>
# NEVER include Google Client Secret in .env
# Store in secure credential manager only
```

---

## Access Control

### User Assignment to Projects

**Roles in Multi-Tenant Context:**

1. **System Admins** (ADMIN role)
   - Manage all projects
   - Create users
   - Modify global settings

2. **Project Members** (USER role)
   - Manage assigned projects only
   - Create/modify bots in assigned projects
   - Access knowledge bases linked to assigned projects

3. **Guest Users** (GUEST role)
   - Read-only access to embedded dashboards
   - Cannot modify any data

**Project Access Model:**
```python
# User must be assigned to project to access its resources
project.users.filter(id=user.id).exists()  # Required for access
```

### File Upload Security

**Frontend Upload Handling:**
- Validate file types before sending
- Limit file size (enforce on backend)
- Scan for malware (recommend ClamAV in production)

**Backend Protection:**
```python
# In views.py - enforce file type restrictions
ALLOWED_FILE_TYPES = [".pdf", ".txt", ".docx", ".xlsx", ".csv"]
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

def validate_upload(file):
    if file.size > MAX_FILE_SIZE:
        raise ValidationError("File too large")
    if not any(file.name.lower().endswith(ext) for ext in ALLOWED_FILE_TYPES):
        raise ValidationError("Invalid file type")
```

---

## Third-Party Integrations

### n8n Integration Security

**Host port binding:**

The n8n container publishes port 5678 only to the interface defined by
`N8N_BIND_HOST` (default `127.0.0.1`). On a public VM this prevents the n8n UI
and REST API from being reachable from the internet before the owner account
has been set up. To expose n8n through Traefik/nginx in production, keep
`N8N_BIND_HOST=127.0.0.1` and let the reverse proxy route to the container
over the Docker network — never set `0.0.0.0` unless you have a firewall
or authenticating proxy in front.

**Execute Code node sandboxing:**

`N8N_BLOCK_ENV_ACCESS_IN_NODE=true` (default) prevents `Execute Code` nodes
from calling `process.env` and reading the container's environment — including
`SECRET_KEY`, `JWT_SIGNING_KEY`, DB passwords, and AWS keys. Only set to
`false` if a workflow legitimately needs env access, and prefer passing
specific values through n8n credentials instead.

**API Key Protection:**
- Store `N8N_API_KEY` in secrets manager
- Rotate quarterly
- Restrict n8n network access to backend only
- Use dedicated API user for integration

**Webhook URL Security:**
- Must use HTTPS in production
- Include API key in every request
- Validate response signatures
- Set timeout (N8N_TIMEOUT=15 seconds)

**Implementation (Backend → n8n):**
```python
# backend/src/authentication/services/kb_service.py
import requests

def create_kb_in_n8n(name, description):
    headers = {"Authorization": f"Bearer {N8N_API_KEY}"}
    payload = {"name": name, "description": description}
    
    response = requests.post(
        f"{N8N_BASE_URL}/webhook/kb/create/",
        json=payload,
        headers=headers,
        timeout=N8N_TIMEOUT
    )
    
    if response.status_code != 200:
        raise Exception(f"n8n error: {response.text}")
    
    return response.json()
```

### Database URL Security

**Environment Variable Format:**
```env
DATABASE_URL=postgresql://user:password@host:port/database
SQLALCHEMY_DATABASE_URI=postgresql+psycopg2://user:password@host:port/database

# Warning: Do NOT log these URLs (contains credentials)
```

---

## Security Checklist

### Pre-Deployment Security Review

- [ ] **Secrets**
  - [ ] Generate `SECRET_KEY` (50+ characters)
  - [ ] Generate `JWT_SIGNING_KEY`
  - [ ] Generate `GUEST_TOKEN_JWT_SECRET`
  - [ ] Generate strong database passwords (min 16 chars)
  - [ ] Generate n8n API key

- [ ] **Environment Settings**
  - [ ] `DEBUG=False`
  - [ ] `ALLOW_UNVERIFIED_JWT` **unset** (never set outside local dev)
  - [ ] `SECURE_SSL_REDIRECT=True`
  - [ ] `CSRF_COOKIE_SECURE=True`
  - [ ] `SESSION_COOKIE_SECURE=True`
  - [ ] `USE_X_FORWARDED_HOST=True` (if behind proxy)
  - [ ] `ALLOWED_HOSTS` set to production domain only
  - [ ] `CORS_ALLOWED_ORIGINS` restricted to production frontend origin(s)
  - [ ] `X_FRAME_OPTIONS=DENY` (default) or `SAMEORIGIN` if embedded
  - [ ] `SECURE_HSTS_SECONDS=31536000` once HTTPS is confirmed end-to-end
  - [ ] `ENABLE_DRF_THROTTLE=True` (or explicitly disabled if proxy handles it)
  - [ ] Review `THROTTLE_LOGIN` / `THROTTLE_PASSWORD_RESET` rates

- [ ] **Database**
  - [ ] Change `BACKEND_DB_USER` and `BACKEND_DB_PASSWORD` (defaults ship as `enlaight`/`enlaight`)
  - [ ] `POSTGRES_BIND_HOST=127.0.0.1` (default — only change if DB must be reachable outside host)
  - [ ] Enable SSL/TLS for database connections

- [ ] **Email**
  - [ ] Configure production email backend (AWS SES)
  - [ ] Set `EMAIL_HOST_USER` to verified sender
  - [ ] Store `EMAIL_HOST_PASSWORD` in secrets manager
  - [ ] Test email delivery

- [ ] **Frontend**
  - [ ] Update `VITE_API_BASE_URL` to production API
  - [ ] Update `REACT_URL` to production frontend URL
  - [ ] Build in production mode (minified)
  - [ ] Enable CSP headers

- [ ] **n8n**
  - [ ] Configure `N8N_API_KEY`
  - [ ] Configure `N8N_BASE_URL` with production URL
  - [ ] Configure `N8N_KB_KEY`
  - [ ] Set `N8N_SSL_HOST` to production domain
  - [ ] Set `WEBHOOK_URL` to HTTPS production URL
  - [ ] `N8N_BIND_HOST=127.0.0.1` (default — only change if not routing via Traefik/nginx)
  - [ ] `N8N_BLOCK_ENV_ACCESS_IN_NODE=true` (default) — prevents Execute Code nodes reading container secrets
  - [ ] Set n8n owner account on first launch

- [ ] **Network**
  - [ ] Configure firewall rules
  - [ ] Postgres (5432) bound to `127.0.0.1` — see `POSTGRES_BIND_HOST`
  - [ ] n8n (5678) bound to `127.0.0.1` — see `N8N_BIND_HOST`
  - [ ] Restrict Redis (6379) to internal only
  - [ ] Open only 80/443 to public

- [ ] **Reverse Proxy**
  - [ ] Configure TLS/SSL certificates
  - [ ] Django emits `X-Content-Type-Options: nosniff` and `X-Frame-Options` —
        the proxy should not override or duplicate them
  - [ ] Enable HSTS via `SECURE_HSTS_SECONDS` (Django) **or** at the proxy — not both
  - [ ] Proxy-layer rate limiting is optional; DRF throttling is on by default

### Ongoing Security Tasks

**Daily:**
- [ ] Monitor error logs for suspicious patterns
- [ ] Check backup completion

**Weekly:**
- [ ] Review authentication logs
- [ ] Monitor for failed login attempts
- [ ] Check system resources

**Monthly:**
- [ ] Audit user access permissions
- [ ] Rotate log files
- [ ] Review API access patterns
- [ ] Check for available security updates

**Quarterly:**
- [ ] Rotate secrets (API keys, passwords)
- [ ] Security audit
- [ ] Penetration testing
- [ ] Update security documentation

**Annually:**
- [ ] Full security assessment
- [ ] Update password policies
- [ ] Review and update access controls
- [ ] Compliance audit (if required)

---

## Security Incident Response

### Suspected Breach

1. **Immediate Actions**
   - Isolate affected systems
   - Revoke all active tokens: `docker compose exec backend python manage.py flushall`
   - Rotate all credentials
   - Enable enhanced logging

2. **Investigation**
   - Review authentication logs for unauthorized access
   - Check database access logs
   - Review n8n workflow execution logs
   - Analyze API request logs

3. **Remediation**
   - Force password resets for all users
   - Audit file uploads and changes
   - Review and update access controls
   - Restore from clean backup if needed

4. **Communication**
   - Notify affected users
   - Document incident details
   - Update security policies

### Credential Compromise

**If SECRET_KEY exposed:**
1. Generate new `SECRET_KEY`
2. Update `.env`
3. Restart backend service
4. All JWT tokens become invalid (users must re-login)
5. Review audit logs

**If Database Password exposed:**
1. Change database user password
2. Update `.env` with new password
3. Restart backend service
4. Audit database access logs

**If n8n API Key exposed:**
1. Regenerate in n8n UI
2. Update `.env`
3. Restart backend service

---

## Recommended Further Reading

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Django Security Documentation](https://docs.djangoproject.com/en/stable/topics/security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

