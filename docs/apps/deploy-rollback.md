# Deploy Rollback Plan

How to safely unwind a bad deploy of Enlaight. Ordered from least invasive
(seconds, no code change) to most invasive (git reset, downtime). **Always
try the lowest tier that addresses the problem first.**

---

## Guiding principles

- **Most recent changes are env-gated.** Security hardening (throttling, HSTS,
  Swagger auth, debug routes, n8n port binding, env sandbox) flips on/off via
  environment variables. Prefer flipping a flag over reverting code.
- **Stateless services are cheap to revert.** Backend and frontend containers
  can be rolled back without data loss.
- **Stateful services are not.** Postgres, n8n workflows, Redis queues, and
  uploaded KB files require care — never revert the DB volume without a
  backup comparison.
- **One change at a time.** Don't combine a kill-switch flip with a code
  revert in the same step. You'll lose the signal about which one fixed it.

---

## Pre-rollback checklist (do this FIRST, every time)

Before touching anything:

1. **Capture state.** Note the current commit SHA, the image tags running in
   prod, the current `.env` values for flags you might flip.
   ```bash
   git rev-parse HEAD
   docker compose ps --format json | jq '.[] | {Service, Image, State}'
   grep -E '^(DEBUG|SWAGGER_|ENABLE_DRF_|N8N_BIND|POSTGRES_BIND|SECURE_|CORS_)' .env
   ```
2. **Snapshot logs.** The diagnostic window closes fast after a rollback.
   ```bash
   docker compose logs --since 30m --no-color > /tmp/rollback-$(date +%s).log
   ```
3. **Back up the DB.** Cheap insurance before any tier ≥ 2.
   ```bash
   docker compose exec postgres pg_dump -U "$BACKEND_DB_USER" "$BACKEND_DB" \
     | gzip > /tmp/backup-$(date +%Y%m%d-%H%M%S).sql.gz
   ```
4. **Preserve uncommitted work.**
   ```bash
   git status
   git stash list    # existing stashes (e.g. stash@{0} WIP lint fixes) must survive
   ```
5. **Decide the rollback tier** from the decision matrix below.
6. **Announce the rollback** in the team channel before executing.

---

## Tier 1 — Runtime kill-switches (no code revert, seconds)

Use when the regression is behavioral and a flag can flip it off. No
redeploy needed beyond a container restart to re-read env.

| Symptom | Flip | Effect |
|---|---|---|
| Swagger schema leak reported in prod | `SWAGGER_REQUIRE_AUTH=true` | `/swagger/` requires admin JWT |
| Rate limiter blocking legitimate traffic | `ENABLE_DRF_THROTTLE=false` | DRF throttles disabled |
| HSTS caused cert/HTTPS pinning grief | `SECURE_HSTS_SECONDS=0` | Stops emitting HSTS header (browsers still honor old TTL) |
| n8n exposed on LAN unintentionally | `N8N_BIND_HOST=127.0.0.1` | Re-binds to localhost only |
| Postgres exposed on LAN unintentionally | `POSTGRES_BIND_HOST=127.0.0.1` | Re-binds to localhost only |
| n8n workflow suddenly can't read `process.env` | `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` | **Warning: re-exposes all container secrets to Code nodes** — only do this if a legitimate workflow broke, and rotate secrets after |
| CORS blocking a new frontend origin | Add origin to `CORS_ALLOWED_ORIGINS` | New origin allowed after restart |
| Auth flow broken by refresh-cookie change | Revert frontend image to previous tag (see Tier 2) | Not actually a kill-switch — escalate |

**Steps:**
```bash
vim .env                                   # edit the flag
docker compose up -d backend               # or n8n / postgres, as appropriate
docker compose logs -f backend | head -50  # confirm clean boot
```

**Verification:** hit a canary endpoint, check the symptom resolves, keep
the `.env` diff committed to a rollback branch (don't lose it).

---

## Tier 2 — Image / compose rollback (minutes, no code change)

Use when a container image (backend or frontend) introduced the regression
and you know the previous working tag.

**Steps:**
1. Identify the last known good image tag:
   ```bash
   docker images | grep -E 'enlaight.*(backend|frontend)'
   ```
2. Pin the rollback tag in `docker-compose.yml` or via override:
   ```yaml
   services:
     backend:
       image: your-registry/enlaight-backend:<last-good-sha>
   ```
3. Apply:
   ```bash
   docker compose up -d backend
   docker compose ps
   ```
4. Verify app health: `/health/`, `/api/health/`, a login, a KB list call.

**Frontend-only regression:** same pattern on the `frontend` service. Users
will need a hard refresh (the new service worker / cache busts on next load).

**Do NOT roll back `postgres` or `n8n` images without checking migration /
workflow compatibility first.** Downgrading Postgres 15 → 14 requires dump
& reload; downgrading n8n can break executed workflows if they used newer
node versions.

---

## Tier 3 — Surgical git revert (tens of minutes, focused rebuild)

Use when a specific code change is the cause and Tier 1/2 don't apply
(e.g. a bug in a view, serializer, or frontend component).

**Steps:**
1. Find the offending commit:
   ```bash
   git log --oneline -20
   git log --oneline -- backend/src/authentication/views/<file>.py
   ```
2. Create a revert on a branch — never directly on `main` in a hot rollback:
   ```bash
   git checkout -b hotfix/rollback-<ticket>
   git revert <bad-sha>              # use --no-commit if touching multiple
   ```
3. Rebuild only what changed:
   ```bash
   docker compose build backend      # or frontend
   docker compose up -d backend
   ```
4. Open a PR for the revert so the history is auditable. Do **not**
   force-push to `main` to erase the bad commit.

**Recent bucketed reverts (if the recent security hardening is the cause):**
- n8n port + sandbox: `docker-compose.yml`, `docker-compose-dev.yml`
- Throttling / headers / HSTS: `backend/src/core/settings.sample.py`,
  `backend/src/authentication/views/authentication.py`
- Swagger auth gate: `backend/src/core/urls.py`
- Debug route conditional: `backend/src/authentication/urls.py`
- Frontend auth refactor (httpOnly refresh cookie): `frontend/src/services/api.ts`,
  `frontend/src/contexts/AuthContext.tsx` (note: `frontend/src/lib/http.ts` and
  `frontend/src/lib/token-store.ts` were deleted — restoring them requires
  `git checkout <sha>^ -- <path>`)

---

## Tier 4 — Full rollback to a tagged release (last resort)

Use only when the deploy is a systemic failure and Tiers 1–3 won't isolate
the cause quickly enough.

**Steps:**
1. Identify the last known good tag or commit:
   ```bash
   git tag --sort=-creatordate | head -10
   # or
   git log --oneline main -20
   ```
2. Create a rollback branch (preserves history; never reset `main` directly):
   ```bash
   git checkout -b rollback/to-<tag>
   git reset --hard <tag-or-sha>
   ```
3. Re-apply any `.env` fixes that still make sense (they usually do —
   env changes aren't part of the code rollback).
4. Rebuild and redeploy all services:
   ```bash
   docker compose build
   docker compose up -d
   ```
5. **Database compatibility check.** If migrations ran after the last good
   tag, you must decide:
   - **Forward-compatible migrations** (additive: new tables/columns, no
     drops) → leave the DB alone, old code ignores new columns.
   - **Backward-incompatible migrations** (drops, renames, type changes)
     → restore the pre-migration DB backup (see pre-checklist step 3).
     ```bash
     docker compose stop backend
     docker compose exec -T postgres dropdb -U "$BACKEND_DB_USER" "$BACKEND_DB"
     docker compose exec -T postgres createdb -U "$BACKEND_DB_USER" "$BACKEND_DB"
     gunzip -c /tmp/backup-<ts>.sql.gz | docker compose exec -T postgres \
       psql -U "$BACKEND_DB_USER" "$BACKEND_DB"
     docker compose start backend
     ```
6. Open a PR that reverts `main` to the rollback branch — do not
   force-push.

---

## Stateful-service considerations

### Postgres (`postgres` service)
- Backend app DB (`enlaight_database`) and n8n DB (`n8n_enlaight_db`) live
  in the same container.
- **Never** `docker volume rm` on the Postgres volume as a rollback shortcut.
- Point-in-time recovery isn't configured — the only safe restore source is
  the `pg_dump` backup from the pre-rollback checklist.

### n8n (`n8n` service)
- Workflows, credentials, and execution history are stored in the n8n
  Postgres database, not in the code repo.
- Rolling back the n8n image without a DB snapshot is generally safe if the
  minor version gap is small; large gaps may fail to start.
- Webhook URLs are stable across n8n restarts as long as workflow IDs
  don't change.

### Redis (`redis` service)
- Used for cache / sessions / Celery. Safe to flush in a rollback if
  sessions can be re-established (users will re-login).
  ```bash
  docker compose exec redis redis-cli FLUSHDB
  ```

### Uploaded KB files
- Stored in the n8n filesystem (persistent volume). Not affected by code
  rollbacks. Only touched by n8n webhook calls.

---

## Post-rollback verification

After any tier, confirm:

1. **Container health**
   ```bash
   docker compose ps
   docker compose logs --since 5m backend | grep -Ei 'error|traceback'
   ```
2. **HTTP health**
   ```bash
   curl -fsS https://<domain>/health/
   curl -fsS https://<domain>/api/health/
   ```
3. **Auth flow** — log in as a test user, call `/api/me/`, hit a protected
   endpoint, log out.
4. **Critical path** — create a KB, list bots, send a chat message through
   n8n, generate a QuickChart image.
5. **Security flags** — verify the flags you intended to be on are on:
   ```bash
   curl -sI https://<domain>/ | grep -Ei 'strict-transport|x-frame|x-content-type'
   curl -sI https://<domain>/swagger/   # 401/403 if SWAGGER_REQUIRE_AUTH=true
   curl -sI https://<domain>/api/debug/token/   # 404 in prod (route not registered)
   ```

---

## Decision matrix — which tier?

| Situation | Start at |
|---|---|
| Users blocked by a new rate-limit / header / CORS rule | Tier 1 |
| A feature flag misbehaves (Swagger exposure, debug route) | Tier 1 |
| Regression introduced by a specific code change you can name | Tier 3 |
| New container image is broken (crashloop, 5xx on boot) | Tier 2 |
| Multiple unrelated failures after deploy | Tier 4 |
| Data corruption suspected | **Stop. Snapshot DB. Get a second pair of eyes before proceeding.** |

---

## What this plan does NOT cover

- **Secret rotation.** If the rollback was caused by a secret leak
  (e.g. `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` was running and an untrusted
  workflow author exists), rotate every secret in the container: DB
  passwords, SMTP creds, AWS keys, OpenRouter key, Google OAuth client,
  YouScan keys. The rollback stops the bleeding; rotation closes the door.
- **DNS / Traefik routing changes.** Out of scope — coordinate with infra.
- **Forward-fix vs rollback decision.** If the bug is small and a fix is
  imminent, a hotfix may beat a rollback. Use judgment and the blast
  radius of the bug as your guide.

---

## Quick reference — files & services

| Concern | Path |
|---|---|
| Service topology | `docker-compose.yml`, `docker-compose-dev.yml` |
| Env flags | `.env` (from `env.sample`) |
| Backend settings | `backend/src/core/settings.sample.py` |
| URL routing | `backend/src/core/urls.py`, `backend/src/authentication/urls.py` |
| DB init | `postgres/init/01-init-databases.sql` |
| Frontend auth | `frontend/src/services/api.ts`, `frontend/src/contexts/AuthContext.tsx` |
