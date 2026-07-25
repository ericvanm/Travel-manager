# Travel Manager — Developer Tools

PowerShell scripts for local maintenance. Run them from the **repository root** or from this folder.

Requirements:

- Windows PowerShell 5.1+ or PowerShell 7+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for Docker modes)
- Optional: PostgreSQL client (`psql`) for `Local` mode without Docker
- Optional (GCP scripts): [Google Cloud SDK](https://cloud.google.com/sdk) (`gcloud`), Docker, [Firebase CLI](https://firebase.google.com/docs/cli) (`firebase`)
- Optional (Azure P0): [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (`az`) — see [azure/P0-CHECKLIST.md](azure/P0-CHECKLIST.md)

## Scripts

| Script | Purpose |
|--------|---------|
| [`reset-database.ps1`](reset-database.ps1) | Drop and recreate the application database (empty DB + migrations on next backend start) |
| [`rebuild-docker.ps1`](rebuild-docker.ps1) | Rebuild and restart Docker Compose stacks (dev or prod profile) |
| [`gcp-start.ps1`](gcp-start.ps1) | Start on-demand Cloud SQL (`ALWAYS`) and wait until `RUNNABLE` |
| [`gcp-stop.ps1`](gcp-stop.ps1) | Stop Cloud SQL (`NEVER`) + Cloud Run min-instances 0 (FinOps) |
| [`gcp-deploy.ps1`](gcp-deploy.ps1) | Start DB if needed, deploy Cloud Run API + Firebase Hosting (mirrors CI) |
| [`gcp-setup-autostop.ps1`](gcp-setup-autostop.ps1) | Create Cloud Run Job + Scheduler (22:00 Europe/Paris) to auto-stop SQL |
| [`gcp-common.ps1`](gcp-common.ps1) | Shared helpers (dot-sourced; do not run directly) |
| [`azure/setup-p0.ps1`](azure/setup-p0.ps1) | P0: Azure RGs, DevOps project, Sonar variable group |
| [`azure/P0-CHECKLIST.md`](azure/P0-CHECKLIST.md) | P0 manual checklist (pipeline, OIDC, Sonar secrets) |

---

## reset-database.ps1

Removes **all** application data: users, trips, sessions, AI logs, planning sessions, etc.

The database file/volume is kept; only the `travel_mgr` database is dropped and recreated. When the backend starts, [Umzug migrations](../travelmgr-backend/utils/db.js) run again (schema, reference data, default `admin` user).

### Usage

```powershell
# Default: Docker dev stack (docker-compose.dev.yml)
.\tools\reset-database.ps1

# Skip confirmation
.\tools\reset-database.ps1 -Force

# Local PostgreSQL (reads DATABASE_URL from travelmgr-backend/.env)
.\tools\reset-database.ps1 -Mode Local -Force

# Also reset the test database (travel_mgr_test)
.\tools\reset-database.ps1 -Mode Local -IncludeTestDatabase -Force

# Prod-like Docker stack
.\tools\reset-database.ps1 -Mode DockerProd -Force

# Reset only, do not restart compose services
.\tools\reset-database.ps1 -NoRestart -Force
```

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `-Mode` | `DockerDev` | `DockerDev`, `DockerProd`, or `Local` |
| `-DatabaseUrl` | (from `.env`) | Override PostgreSQL URL (`Local` mode) |
| `-Force` | off | Skip `RESET` confirmation |
| `-NoRestart` | off | Do not run `docker compose up -d` after reset |
| `-IncludeTestDatabase` | off | Also reset `TEST_DATABASE_URL` (`Local` only) |

### What happens

1. Backend/frontend containers are stopped (Docker modes) to release DB connections.
2. PostgreSQL terminates active sessions on the target database.
3. Database is dropped and recreated empty.
4. Docker stack is started again (unless `-NoRestart`).
5. Backend runs migrations on connect â€” including the default admin account (`admin`, password must be set on first login).

### Connection defaults (Docker)

| Setting | Value |
|---------|-------|
| Container | `travel-mgr-db` |
| Database | `travel_mgr` |
| User | `postgres` |
| Password | `mypassword` (see `docker-compose.dev.yml`) |

---

## rebuild-docker.ps1

Rebuilds Docker images and restarts the stack. Replaces the former root script `rebuild_dockers.ps1`.

### Usage

```powershell
# Dev stack (default): down â†’ build â†’ up -d
.\tools\rebuild-docker.ps1

# Production-like stack (docker-compose.yml)
.\tools\rebuild-docker.ps1 -Profile Prod

# Full rebuild without Docker layer cache
.\tools\rebuild-docker.ps1 -NoCache

# Empty database + rebuild
.\tools\rebuild-docker.ps1 -ResetDatabase -Force
```

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `-Profile` | `Dev` | `Dev` â†’ `docker-compose.dev.yml`, `Prod` â†’ `docker-compose.yml` |
| `-NoCache` | off | `docker compose build --no-cache` |
| `-ResetDatabase` | off | Call `reset-database.ps1` before rebuild |
| `-Force` | off | Skip DB reset confirmation when `-ResetDatabase` is set |

### Dev stack URLs (after rebuild)

| Service | URL |
|---------|-----|
| Vite frontend | http://localhost:5173 |
| Backend API | http://localhost:3001/api |
| Nginx | http://localhost:8080 |

---

## Typical workflows

### Fresh local Docker environment

```powershell
.\tools\reset-database.ps1 -Force
# or: .\tools\rebuild-docker.ps1 -ResetDatabase -Force
```

Then open http://localhost:5173, log in as `admin`, set the admin password.

### After changing Dockerfiles or compose files

```powershell
.\tools\rebuild-docker.ps1
```

### Backend-only (no Docker)

```powershell
.\tools\reset-database.ps1 -Mode Local -Force
cd "travelmgr-backend"
npm run dev
```

---

## GCP on-demand scripts

Mirror [`.github/workflows/deploy-gcp.yml`](../.github/workflows/deploy-gcp.yml). Full setup: [Deployment â€” GCP](../documents/06-deployment.md#gcp-on-demand-firebase-hosting--cloud-run--cloud-sql).

### Common environment variables

| Variable | Default / notes |
|----------|-----------------|
| `GCP_PROJECT_ID` | Required (or `-ProjectId`) |
| `GCP_REGION` | `europe-west1` |
| `GCP_SQL_INSTANCE` | `travel-mgr-db` |
| `GCP_CLOUD_RUN_SERVICE` | `travel-manager-api` |
| `GCP_ARTIFACT_REPO` | `travel-manager` |
| `GCP_SQL_CONNECTION_NAME` | `PROJECT:REGION:INSTANCE` |
| `GCP_DATABASE_URL` | Cloud SQL Unix socket URL (deploy) |
| `GCP_SECRET` | Session secret (deploy) |
| `GCP_CORS_ORIGINS` | Exact Firebase Hosting origin(s) (deploy) |

### Usage

```powershell
# Start Cloud SQL (wait until RUNNABLE)
.\tools\gcp-start.ps1 -ProjectId YOUR_GCP_PROJECT_ID

# Deploy API + Hosting (starts DB automatically if stopped)
$env:GCP_PROJECT_ID = 'YOUR_GCP_PROJECT_ID'
$env:GCP_DATABASE_URL = 'postgres://user:pass@/travel_mgr?host=/cloudsql/PROJECT:REGION:INSTANCE'
$env:GCP_SECRET = '...'
$env:GCP_CORS_ORIGINS = 'https://YOUR_PROJECT.web.app'
.\tools\gcp-deploy.ps1

# Stop to save cost (disk retained)
.\tools\gcp-stop.ps1 -ProjectId YOUR_GCP_PROJECT_ID

# One-time: daily auto-stop at 22:00 Europe/Paris
.\tools\gcp-setup-autostop.ps1 -ProjectId YOUR_GCP_PROJECT_ID
```

Prefer GitHub Actions (`Deploy GCP` workflow) when you do not want local Docker/Firebase tooling.

---

## Troubleshooting

| Issue | Suggestion |
|-------|------------|
| `database is being accessed by other users` | Stop the backend (`npm run dev`) or use Docker mode so the script stops containers first |
| `psql is not on PATH` | Use `-Mode DockerDev`, or install PostgreSQL client tools |
| `travel-mgr-db` not found | Start Docker Desktop; run `docker compose -f docker-compose.dev.yml up -d db` |
| Migrations not applied | Ensure backend container/process restarts after reset |
| Admin login fails | Migrations must complete; user `admin` is seeded by migration `20250806_17_admin_ai_logs.js` |
| `gcloud` / `firebase` not found | Install Cloud SDK and Firebase CLI; run `gcloud auth login` / `firebase login` |
| Cloud SQL never becomes `RUNNABLE` | Check quotas/billing; wait several minutes after start |
| GCP deploy health check fails | Confirm SQL is up and `DATABASE_URL` uses `/cloudsql/...` socket form |

---

## See also

- [Developer guide â€” Database setup](../documents/05-developer-guide.md#database-setup)
- [Deployment â€” Docker](../documents/06-deployment.md#docker-optional)
- [Deployment â€” GCP on-demand](../documents/06-deployment.md#gcp-on-demand-firebase-hosting--cloud-run--cloud-sql)
- [Docker Compose dev](../docker-compose.dev.yml)
