# Deployment

## Overview

| Environment | Frontend | Backend | Database | Trigger |
|-------------|----------|---------|----------|---------|
| Local | Vite (`:5173`) | Node (`:3001`) | Local / Docker PostgreSQL | Manual |
| **Production (default)** | Vercel | Render Web Service | Render PostgreSQL | Push / platform auto-deploy |
| **GCP (on-demand)** | Firebase Hosting | Cloud Run | Cloud SQL PostgreSQL | GitHub Actions `workflow_dispatch` only |

Vercel + Render remain the default production path. GCP is a **second environment** you start and stop when needed (demo, client, alternate prod). It does **not** replace or share the Render database.

```mermaid
flowchart TB
  subgraph defaultProd [Default_production]
    GH1[GitHub main]
    CI[GitHub Actions CI]
    VER[Vercel SPA]
    REN[Render API]
    RPG[(Render PostgreSQL)]
    GH1 --> CI
    GH1 --> VER
    GH1 --> REN
    REN --> RPG
    VER -.->|VITE_BACKEND_URL| REN
  end

  subgraph gcpOnDemand [GCP_on_demand]
    GH2[workflow_dispatch]
    FH[Firebase Hosting]
    CR[Cloud Run API]
    SQL[(Cloud SQL)]
    Sched[Scheduler 22h Paris]
    GH2 -->|deploy-gcp.yml| FH
    GH2 -->|deploy-gcp.yml| CR
    CR --> SQL
    Sched -->|activation_policy NEVER| SQL
    FH -.->|VITE_BACKEND_URL| CR
  end
```

## Render (backend + database)

### Blueprint

The repository includes [`render.yaml`](../render.yaml):

- **Database:** `travel-mgr-db` (free plan)
- **Web service:** `travel-manager-api`
  - `rootDir`: `travelmgr-backend`
  - `buildCommand`: `npm ci --omit=dev`
  - `startCommand`: `npm start`
  - `healthCheckPath`: `/api/health`

### First-time setup

1. Connect GitHub repo at [Render Blueprints](https://dashboard.render.com/blueprints).
2. Apply blueprint — Render creates DB and web service.
3. After Vercel deploy, set **`CORS_ORIGINS`** on the Render service to your frontend URL(s):

```
https://your-app.vercel.app
```

4. `SECRET` is auto-generated; `DATABASE_URL` is wired from the database resource.

### Environment variables (Render)

| Variable | Source | Notes |
|----------|--------|-------|
| `NODE_ENV` | Blueprint | `production` |
| `DATABASE_URL` | Linked DB | SSL handled in session store config |
| `SECRET` | Generated | Session signing |
| `CORS_ORIGINS` | Manual | Required for browser access from Vercel |
| `USE_OPENAI` | Blueprint | Default `false` |
| `OPENAI_API_KEY` | Optional manual | If AI import with OpenAI enabled |

### Docker (optional)

Production image: `travelmgr-backend/Dockerfile`

- Base: `node:20`
- Non-root user `nodejs` (UID/GID 1001)
- `npm ci --omit=dev --ignore-scripts`
- Exposes port 3001

Development image: `dev.Dockerfile` (includes dev dependencies).

**Compose stacks:**

| File | Purpose |
|------|---------|
| `docker-compose.dev.yml` | Dev: bind mounts, Vite `:5173`, API `:3001`, nginx `:8080` |
| `docker-compose.yml` | Prod-like: built images behind nginx on `:8080` |

**Maintenance (PowerShell):** see [`tools/README.md`](../tools/README.md)

```powershell
docker compose -f docker-compose.dev.yml up -d
.\tools\rebuild-docker.ps1              # rebuild dev stack
.\tools\reset-database.ps1 -Force       # empty DB + migrations on next backend start
```

Build and run API only (without compose):

```bash
cd "travelmgr-backend"
docker build -t travel-manager-api .
docker run -p 3001:3001 \
  -e DATABASE_URL=postgres://... \
  -e SECRET=your-secret \
  -e NODE_ENV=production \
  travel-manager-api
```

> Render Blueprint uses native Node runtime, not Docker, unless you switch the service type manually.

## Vercel (frontend)

### Configuration

[`travelmgr-frontend/vercel.json`](../travelmgr-frontend/vercel.json):

- Build command and output directory for Vite
- SPA rewrites so client-side routing works

### Setup

1. Import repository in Vercel.
2. Set **Root Directory** to `travelmgr-frontend`.
3. Configure environment variable:

| Variable | Example |
|----------|---------|
| `VITE_BACKEND_URL` | `https://travel-manager-api.onrender.com/api` |

4. Deploy — each push to `main` can trigger automatic deploys.

### Cross-origin cookies

Production backend sets session cookies with:

- `secure: true`
- `sameSite: 'none'`
- `httpOnly: true`

Both sites must use **HTTPS**. Frontend axios must use `withCredentials: true` (already configured).

## GCP on-demand (Firebase Hosting + Cloud Run + Cloud SQL)

Second environment only. Default production stays on Vercel + Render.

| Component | Choice |
|-----------|--------|
| Frontend | Firebase Hosting ([`firebase.json`](../firebase.json)) — Vite `dist`, SPA rewrites |
| Backend | Cloud Run from [`travelmgr-backend/Dockerfile`](../travelmgr-backend/Dockerfile) |
| Database | Cloud SQL PostgreSQL 15, small tier (`db-f1-micro`), region `europe-west1` |
| CI | [`.github/workflows/deploy-gcp.yml`](../.github/workflows/deploy-gcp.yml) — **`workflow_dispatch` only** |
| Local mirror | [`tools/gcp-start.ps1`](../tools/gcp-start.ps1), [`gcp-stop.ps1`](../tools/gcp-stop.ps1), [`gcp-deploy.ps1`](../tools/gcp-deploy.ps1) |
| FinOps | Stop Cloud SQL when unused; daily auto-stop at **22:00 Europe/Paris** |

### Lifecycle

| Action | Effect |
|--------|--------|
| **start** | Cloud SQL `activation-policy=ALWAYS`, wait until `RUNNABLE` |
| **deploy** | Start DB if needed → build/push API → Cloud Run → build SPA → Firebase Hosting → smoke `/api/health` |
| **stop** | Cloud Run `min-instances=0` + Cloud SQL `NEVER` (disk retained) |

```powershell
# Local (requires gcloud + docker + firebase-tools for full deploy)
.\tools\gcp-start.ps1 -ProjectId YOUR_GCP_PROJECT_ID
.\tools\gcp-deploy.ps1   # starts DB automatically if stopped
.\tools\gcp-stop.ps1
```

GitHub: **Actions → Deploy GCP → Run workflow** → choose `start` / `deploy` / `stop`.

### One-shot GCP checklist (manual, once)

You can do almost everything in the **Google Cloud Console** (browser) or with **`gcloud`**. Prefer the console if you are unfamiliar with the CLI; use `gcloud` if you want copy-paste speed. Both paths are equivalent.

| # | What | Console (UI) | CLI |
|---|------|--------------|-----|
| 1 | Project + billing | [Cloud Console](https://console.cloud.google.com/) → select/create project → **Billing** → link a billing account | `gcloud projects create` / billing link in console (billing is usually UI) |
| 2 | Enable APIs | **APIs & Services → Library** → enable: Cloud Run, Cloud SQL Admin, Artifact Registry, IAM, Cloud Scheduler, Firebase Management, Cloud Resource Manager, plus for WIF: IAM Service Account Credentials API, Security Token Service API | See WIF step 1 and enable the product APIs similarly with `gcloud services enable …` |
| 3 | Cloud SQL | **SQL → Create instance** → PostgreSQL 15, id e.g. `travel-mgr-db`, region `europe-west1`, machine type shared/`db-f1-micro`. Then **Databases** → create `travel_mgr`; **Users** → create app user. Copy **Connection name** (`PROJECT:REGION:INSTANCE`) from the instance overview | `gcloud sql instances create` / `databases create` / `users create` |
| 4 | Artifact Registry | **Artifact Registry → Create repository** → format **Docker**, name e.g. `travel-manager`, region `europe-west1`. Leave **vulnerability scanning** disabled for now if you prefer lower cost | `gcloud artifacts repositories create … --repository-format=docker` |
| 5 | Firebase Hosting | [Firebase Console](https://console.firebase.google.com/) → **Add project** → use the **existing GCP project** → Build → **Hosting** → Get started. Set [`.firebaserc`](../.firebaserc) `projects.default` to the project id (CI also overwrites the placeholder) | `firebase projects:addfirebase` / `firebase hosting:sites:create` (optional) |
| 6 | WIF (GitHub → GCP) | See [Workload Identity Federation](#workload-identity-federation-github-actions) — each step has **Console** and **`gcloud`** instructions | Same section |
| 7 | Cloud Run ↔ SQL | After first deploy, or beforehand: **IAM** → grant `Cloud SQL Client` to the Cloud Run **runtime** service account (often `…-compute@developer.gserviceaccount.com`). Or **SQL → Connections → Security** / IAM as needed | Grant `roles/cloudsql.client` to the runtime SA |
| 8 | GitHub secrets | GitHub → repo → **Settings → Secrets and variables → Actions** — see [GitHub repository configuration](#github-repository-configuration) | — |
| 9 | Autostop 22:00 | Optional UI: create Cloud Run Job + Cloud Scheduler manually (same as script). Easier: run the script once | `.\tools\gcp-setup-autostop.ps1 -ProjectId YOUR_GCP_PROJECT_ID` |
| 10 | First deploy | GitHub **Actions → Deploy GCP → Run workflow → deploy** | `.\tools\gcp-deploy.ps1` |

Autostop details: [Daily auto-stop](#daily-auto-stop-finops).

### Workload Identity Federation (GitHub Actions)

Goal: let [`.github/workflows/deploy-gcp.yml`](../.github/workflows/deploy-gcp.yml) authenticate to GCP with a short-lived OIDC token from GitHub — **no downloaded service-account JSON key**.

The workflow already expects:

```yaml
permissions:
  contents: read
  id-token: write   # required for GitHub OIDC

- uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
    service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}
```

Replace placeholders below:

| Placeholder | Example |
|-------------|---------|
| `PROJECT_ID` | your GCP project id |
| `PROJECT_NUMBER` | numeric project number (not the id) — **IAM → Settings** or project picker → project number |
| `GITHUB_ORG` / `GITHUB_REPO` | e.g. `my-org` / `Travel-manager` (from the GitHub URL) |
| `POOL_ID` | e.g. `github-actions` |
| `PROVIDER_ID` | e.g. `github` |
| `SA_ID` | e.g. `travel-mgr-deploy` |

Where to find **PROJECT_NUMBER** in the console: open the project → click the project name in the top bar → the dialog shows **ID** and **Number**. You need the **Number** inside `GCP_WORKLOAD_IDENTITY_PROVIDER`.

#### 1. Enable APIs used by WIF

**Console**

1. Open [APIs & Services → Library](https://console.cloud.google.com/apis/library).
2. Search and **Enable** each of:
   - **IAM Service Account Credentials API** (`iamcredentials.googleapis.com`)
   - **Security Token Service API** (`sts.googleapis.com`)
   - **Cloud Resource Manager API**
   - **Identity and Access Management (IAM) API**
3. Confirm product APIs from the checklist are also enabled (Cloud Run, Cloud SQL Admin, Artifact Registry, Cloud Scheduler, Firebase Management).

**`gcloud`**

```bash
gcloud config set project PROJECT_ID

gcloud services enable \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com
```

#### 2. Create the deploy service account

**Console**

1. Open [IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts).
2. **Create service account**.
3. **Service account ID**: `SA_ID` (e.g. `travel-mgr-deploy`).
4. Display name: `Travel Manager GitHub deploy`.
5. Skip optional key creation — **do not** create a JSON key (WIF replaces keys).
6. Finish. Copy the email `SA_ID@PROJECT_ID.iam.gserviceaccount.com` → GitHub secret `GCP_SERVICE_ACCOUNT`.

**`gcloud`**

```bash
gcloud iam service-accounts create SA_ID \
  --display-name="Travel Manager GitHub deploy"
```

Service account email (save for GitHub secret `GCP_SERVICE_ACCOUNT`):

```text
SA_ID@PROJECT_ID.iam.gserviceaccount.com
```

#### 3. Grant project roles to that SA

Minimum roles used by start / deploy / stop + Firebase Hosting:

| Role (console label) | Role id |
|----------------------|---------|
| Cloud Run Admin | `roles/run.admin` |
| Cloud SQL Client | `roles/cloudsql.client` |
| Cloud SQL Admin | `roles/cloudsql.admin` |
| Artifact Registry Writer | `roles/artifactregistry.writer` |
| Service Account User | `roles/iam.serviceAccountUser` |
| Firebase Hosting Admin | `roles/firebasehosting.admin` |
| Service Usage Consumer | `roles/serviceusage.serviceUsageConsumer` |

**Console**

1. Open [IAM & Admin → IAM](https://console.cloud.google.com/iam-admin/iam).
2. **Grant access** (or **Edit principal** if the SA already appears).
3. New principals: `SA_ID@PROJECT_ID.iam.gserviceaccount.com`.
4. Add each role from the table above (use the filter / role name).
5. Save. Repeat or multi-select roles in one grant if the UI allows.

Also grant **Cloud SQL Client** to the **Cloud Run runtime** SA (often `PROJECT_NUMBER-compute@developer.gserviceaccount.com`) so the API can use the `/cloudsql/...` socket after deploy.

**`gcloud`**

```bash
PROJECT_ID=PROJECT_ID
SA_EMAIL=SA_ID@PROJECT_ID.iam.gserviceaccount.com

for ROLE in \
  roles/run.admin \
  roles/cloudsql.client \
  roles/cloudsql.admin \
  roles/artifactregistry.writer \
  roles/iam.serviceAccountUser \
  roles/firebasehosting.admin \
  roles/serviceusage.serviceUsageConsumer
do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="$ROLE" \
    --condition=None
done
```

Notes:

- `roles/cloudsql.admin` is needed to start/stop the instance (`activation-policy`).
- `roles/iam.serviceAccountUser` lets the deploy SA act as the Cloud Run runtime identity when deploying.
- `roles/firebasehosting.admin` allows `firebase deploy --only hosting` under ADC from the workflow.
- Tighten later with custom roles if you want least privilege.

#### 4. Create the Workload Identity Pool

**Console**

1. Open [IAM & Admin → Workload Identity Federation](https://console.cloud.google.com/iam/workload-identity-pools) (under **IAM & Admin**).
2. If prompted, enable the related APIs.
3. **Create pool**:
   - Name / Pool ID: `POOL_ID` (e.g. `github-actions`)
   - Display name: `GitHub Actions`
4. Continue to provider creation (next step) or create the pool first then add a provider.

**`gcloud`**

```bash
gcloud iam workload-identity-pools create POOL_ID \
  --project=PROJECT_ID \
  --location=global \
  --display-name="GitHub Actions"
```

#### 5. Create the GitHub OIDC provider

Map GitHub token claims into Google attributes, and **restrict** which repository can impersonate the SA.

**Console**

1. In the pool `POOL_ID`, **Add provider** (or continue the wizard).
2. Select **OpenID Connect (OIDC)**.
3. Provider ID / name: `PROVIDER_ID` (e.g. `github`).
4. **Issuer (URL)**: `https://token.actions.githubusercontent.com`
5. **Audiences**: leave default allowed audience unless Google’s wizard requires a specific value (often “Default audience”).
6. **Attribute mapping** — add mappings (UI labels may say “Google” / “OIDC”):

   | Google attribute | OIDC assertion |
   |------------------|----------------|
   | `google.subject` | `assertion.sub` |
   | `attribute.actor` | `assertion.actor` |
   | `attribute.repository` | `assertion.repository` |
   | `attribute.repository_owner` | `assertion.repository_owner` |

7. **Attribute condition** (CEL) — restrict to this repo only:

   ```text
   assertion.repository=='GITHUB_ORG/GITHUB_REPO'
   ```

   Example: `assertion.repository=='acme/Travel-manager'`.

8. Save / create provider.

Optional harder lock (only this workflow file / refs): extend the condition with `assertion.job_workflow_ref` or `assertion.ref` — start with repository-only, then tighten if needed.

**`gcloud`**

```bash
gcloud iam workload-identity-pools providers create-oidc PROVIDER_ID \
  --project=PROJECT_ID \
  --location=global \
  --workload-identity-pool=POOL_ID \
  --display-name="GitHub" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository=='GITHUB_ORG/GITHUB_REPO'"
```

#### 6. Allow the pool to impersonate the deploy SA

Bind `roles/iam.workloadIdentityUser` on the **service account** (not only on the project). Member format:

```text
principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/attribute.repository/GITHUB_ORG/GITHUB_REPO
```

**Console**

1. Open [IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts).
2. Click `SA_ID@PROJECT_ID.iam.gserviceaccount.com`.
3. Open the **Permissions** / **Principals with access** tab (wording varies: “Manage access” / “Permissions”).
4. **Grant access**.
5. New principal: paste the `principalSet://…/attribute.repository/GITHUB_ORG/GITHUB_REPO` string above (use your **project number**, pool id, and `org/repo`).
6. Role: **Workload Identity User** (`roles/iam.workloadIdentityUser`).
7. Save.

If the console rejects `principalSet://…`, use **IAM → Grant access** with the same member string and role on that service account, or use the `gcloud` command below (often clearer for this binding).

**`gcloud`**

```bash
PROJECT_NUMBER="$(gcloud projects describe PROJECT_ID --format='value(projectNumber)')"
SA_EMAIL=SA_ID@PROJECT_ID.iam.gserviceaccount.com

gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project=PROJECT_ID \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/POOL_ID/attribute.repository/GITHUB_ORG/GITHUB_REPO"
```

This ties impersonation to **that GitHub repo only** (matches the provider condition).

#### 7. Values to copy into GitHub

**`GCP_WORKLOAD_IDENTITY_PROVIDER`** (full resource name):

```text
projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID
```

**Console**

1. **IAM & Admin → Workload Identity Federation** → open pool `POOL_ID` → open provider `PROVIDER_ID`.
2. Copy the provider resource name (often shown as “Provider name” / full resource path). It must look like the string above (starts with `projects/` and the **numeric** project number).

**`gcloud`**

```bash
gcloud iam workload-identity-pools providers describe PROVIDER_ID \
  --project=PROJECT_ID \
  --location=global \
  --workload-identity-pool=POOL_ID \
  --format='value(name)'
```

**`GCP_SERVICE_ACCOUNT`**:

```text
SA_ID@PROJECT_ID.iam.gserviceaccount.com
```

(Console: Service Accounts list → email column.)

**`GCP_PROJECT_ID`**: `PROJECT_ID` (project id string, not the number).

#### 8. Verify (optional)

After secrets are set, run the workflow with `action=start`. If auth fails:

| Symptom | Likely cause |
|---------|--------------|
| `unable to generate access token` / `permission denied` on impersonation | Missing `workloadIdentityUser` binding or wrong `GITHUB_ORG/GITHUB_REPO` |
| `invalid_target` / provider not found | Typo in `GCP_WORKLOAD_IDENTITY_PROVIDER` (must include `projects/NUMBER/...`) |
| Workflow cannot request OIDC token | Missing `permissions.id-token: write` (already set in `deploy-gcp.yml`) |
| Deploy works but Firebase fails | SA missing `roles/firebasehosting.admin` (or Hosting not enabled on the Firebase project) |

Official references: [Google — Authenticating to Google Cloud with GitHub Actions](https://github.com/google-github-actions/auth#workload-identity-federation-through-a-service-account), [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation), [Console — Workload Identity Federation](https://console.cloud.google.com/iam/workload-identity-pools).

### GitHub repository configuration

Repository **Settings → Secrets and variables → Actions**.

#### Secrets

| Secret | Purpose |
|--------|---------|
| `GCP_PROJECT_ID` | Project id |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full WIF provider name from step 7 above |
| `GCP_SERVICE_ACCOUNT` | Deploy SA email from step 2 above |
| `GCP_DATABASE_URL` | See [Cloud SQL connection string](#cloud-sql-connection-string-cloud-run) |
| `GCP_SECRET` | Session signing secret (distinct from Render) |
| `GCP_CORS_ORIGINS` | Exact Firebase Hosting origin(s), e.g. `https://YOUR_PROJECT.web.app` |

#### Optional variables

| Variable | Default |
|----------|---------|
| `GCP_REGION` | `europe-west1` |
| `GCP_SQL_INSTANCE` | `travel-mgr-db` |
| `GCP_CLOUD_RUN_SERVICE` | `travel-manager-api` |
| `GCP_ARTIFACT_REPO` | `travel-manager` |
| `GCP_IMAGE_NAME` | `travel-manager-api` |
| `GCP_SQL_CONNECTION_NAME` | `PROJECT:REGION:INSTANCE` |
| `GCP_USE_OPENAI` | `false` |

### Cloud SQL connection string (Cloud Run)

`GCP_DATABASE_URL` must be a **full Postgres URL**, not the Cloud SQL connection name alone.

**Correct** (Unix socket via Cloud SQL connector on Cloud Run):

```text
postgres://DB_USER:DB_PASSWORD@127.0.0.1/travel_mgr?host=/cloudsql/PROJECT:REGION:INSTANCE
```

You can also use `@/` instead of `@127.0.0.1/`; the API normalizes that form at startup. Prefer `@127.0.0.1/` in GitHub secrets to avoid parser issues.

Concrete example:

```text
postgres://travel_mgr:YOUR_PASSWORD@127.0.0.1/travel_mgr?host=/cloudsql/travel-manager-502910:europe-west1:travel-mgr-db
```

| Part | Value |
|------|--------|
| `DB_USER` / `DB_PASSWORD` | Cloud SQL database user (SQL → Users) |
| Database name | e.g. `travel_mgr` (after `@/`) |
| `host=/cloudsql/...` | Instance **connection name** from SQL → instance overview (`PROJECT:REGION:INSTANCE`) |

**Wrong** (causes `The dialect travel-manager-502910 is not supported`):

```text
travel-manager-502910:europe-west1:travel-mgr-db
```

That string is only the connection name for `--set-cloudsql-instances` / `GCP_SQL_CONNECTION_NAME`, **not** `DATABASE_URL`.

Password tip: URL-encode special characters (`@`, `#`, `/`, `%`, etc.) in `DB_PASSWORD`.

Store the full URL as GitHub secret `GCP_DATABASE_URL`. The API disables client TLS when the URL contains `/cloudsql/`; Render / public-IP Postgres still uses SSL in production.

Cloud Run is deployed with `--set-cloudsql-instances=PROJECT:REGION:INSTANCE` and `--port=3001`. Do **not** set `PORT` yourself — it is a reserved name; Cloud Run injects it from `--port`.

### Environment variables (Cloud Run)

| Variable | Notes |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Cloud SQL socket URL above |
| `SECRET` | Strong unique secret |
| `CORS_ORIGINS` | Exact Firebase URL(s), comma-separated if several |
| `USE_OPENAI` | Default `false` |
| `OPENAI_API_KEY` | Optional — set manually on the service if needed |
| `PORT` | **Do not set** — reserved; provided by Cloud Run (`3001` via `--port`) |

Frontend build injects `VITE_BACKEND_URL=https://SERVICE_URL/api` (Cloud Run URL discovered at deploy time).

### Daily auto-stop (FinOps)

Cloud SQL does **not** scale to zero. Leaving it `RUNNABLE` is the main cost of the GCP environment.

| Mechanism | Behavior |
|-----------|----------|
| Manual / CI **stop** | Immediate: SQL `NEVER` + Run min-instances 0 |
| **Cloud Scheduler** | Every day **22:00 Europe/Paris** runs Cloud Run Job `travel-mgr-autostop` |

#### Recommended: setup script

```powershell
.\tools\gcp-setup-autostop.ps1 -ProjectId YOUR_GCP_PROJECT_ID
# Optional: -SchedulerServiceAccount sa@PROJECT.iam.gserviceaccount.com
```

#### Console equivalent (manual)

If you prefer the UI instead of the script:

1. **Cloud Run → Jobs → Create job**
   - Name: `travel-mgr-autostop`
   - Region: `europe-west1`
   - Image: `gcr.io/google.com/cloudsdktool/google-cloud-cli:slim`
   - Command: `bash`
   - Arguments: `-c` and then:

     ```bash
     gcloud sql instances patch travel-mgr-db --activation-policy=NEVER --quiet; gcloud run services update travel-manager-api --region=europe-west1 --min-instances=0 --quiet; echo autostop_ok
     ```

   - Task timeout: 15 minutes

2. **IAM on the job** — grant the Scheduler service account role **Cloud Run Invoker** on this job (often `PROJECT_NUMBER-compute@developer.gserviceaccount.com`).

3. **Cloud Scheduler → Create job**
   - Name: `travel-mgr-autostop-daily`
   - Region/location: `europe-west1`
   - Frequency: `0 22 * * *`
   - Timezone: `Europe/Paris`
   - Target: **HTTP**
   - URL: `https://europe-west1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/PROJECT_NUMBER/jobs/travel-mgr-autostop:run`
   - HTTP method: `POST`
   - Auth: **Add OAuth header** with the same Scheduler SA and scope `https://www.googleapis.com/auth/cloud-platform`

Grant the **Cloud Run Job runtime service account** permission to:

- patch Cloud SQL (`roles/cloudsql.admin` or a custom role with `cloudsql.instances.update`)
- update the API service (`roles/run.developer` or `roles/run.admin`)

Manual test:

**Console:** Cloud Scheduler → job `travel-mgr-autostop-daily` → **Force run**

**`gcloud`:**

```bash
gcloud scheduler jobs run travel-mgr-autostop-daily \
  --project=YOUR_GCP_PROJECT_ID \
  --location=europe-west1
```

Overnight demos: temporarily pause the scheduler job in the console (or `gcloud scheduler jobs pause`), then resume afterward.

### FinOps summary

| State | Approximate cost driver |
|-------|-------------------------|
| Stopped (SQL `NEVER`, Run scale-to-zero) | Cloud SQL storage only |
| Running idle | **Cloud SQL compute** (dominant) |
| Demo traffic | Cloud Run + Hosting usually small |
| Forgot to stop | Covered by **22:00 Paris** scheduler |

### GCP rollback

| Component | Action |
|-----------|--------|
| Cloud Run | Deploy previous image tag / revision from Cloud Console or `gcloud run services update-traffic` |
| Firebase Hosting | Roll back to a previous Hosting release in Firebase Console |
| Cloud SQL | Point-in-time / backup restore if needed (separate from Render) |

## CI/CD pipeline

### Quality CI (unchanged)

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml):

| Job | Runs |
|-----|------|
| `backend` | lint, test:coverage (PostgreSQL service) |
| `frontend` | lint, tsc, build |
| `sonarcloud` | ESLint reports + SonarCloud scan + **Quality Gate wait** |

Required GitHub secrets:

| Secret | Purpose |
|--------|---------|
| `SONAR_TOKEN` | SonarCloud authentication |
| `SONAR_ORGANIZATION` | SonarCloud org key |

`GITHUB_TOKEN` is used automatically for PR decoration.

### GCP deploy (on-demand)

[`.github/workflows/deploy-gcp.yml`](../.github/workflows/deploy-gcp.yml) — manual only; does not run on push to `main`.

## Health checks and monitoring

| Endpoint | Expected |
|----------|----------|
| `GET /api/health` | `{ "status": "ok" }` |

Render and the GCP deploy smoke step use this path. Monitor logs for migration errors on cold start.

## Production checklist

### Default (Vercel + Render)

- [ ] PostgreSQL provisioned and linked
- [ ] `SECRET` set (strong, unique)
- [ ] `CORS_ORIGINS` includes exact Vercel URL(s)
- [ ] `VITE_BACKEND_URL` points to Render `/api` prefix
- [ ] CI green on `main` including SonarCloud Quality Gate
- [ ] Manual smoke test: register → login → create trip → import ICS
- [ ] Optional: enable OpenAI with `USE_OPENAI` + `OPENAI_API_KEY`

### GCP on-demand

- [ ] One-shot checklist above completed
- [ ] WIF configured per [Workload Identity Federation](#workload-identity-federation-github-actions); GitHub secrets set
- [ ] `GCP_CORS_ORIGINS` matches Firebase Hosting URL
- [ ] Autostop scheduler created (`gcp-setup-autostop.ps1`)
- [ ] Successful `deploy` + `/api/health` + login smoke test
- [ ] Successful `stop` and confirm Cloud SQL is not `RUNNABLE`

## Rollback

| Component | Action |
|-----------|--------|
| Vercel | Redeploy previous deployment from dashboard |
| Render | Roll back to previous deploy in service history |
| Database (Render) | Migrations are forward-only — restore from Render backup if needed |
| GCP | See [GCP rollback](#gcp-rollback) |

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| API 502 on Render | Crash on startup / DB | Check logs; verify `DATABASE_URL` |
| Login works locally, not prod | CORS or cookies | Set `CORS_ORIGINS`; HTTPS only |
| Frontend calls wrong API | Stale build env | Rebuild Vercel / Firebase with correct `VITE_BACKEND_URL` |
| Docker build fails on Render | GID syntax | Use numeric `--gid 1001` (see Dockerfile) |
| Cold start timeout | Free tier spin-down | Retry; upgrade plan or external ping |
| GCP API cannot reach DB | SQL stopped or wrong socket URL | Run **start** / **deploy**; verify `/cloudsql/...` URL + `--set-cloudsql-instances` |
| `The dialect travel-manager-… is not supported` | `GCP_DATABASE_URL` is only the connection name | Use full URL: `postgres://USER:PASS@127.0.0.1/DB?host=/cloudsql/PROJECT:REGION:INSTANCE` |
| `searchParams` / pg-connection-string crash on startup | Malformed URL (often `@/` or special chars in password) | Use `@127.0.0.1/`; URL-encode password; redeploy after fixing `GCP_DATABASE_URL` |
| Cloud Run deploy: reserved env `PORT` | `PORT` set in env vars file | Remove `PORT` from env; keep `--port=3001` (Cloud Run injects `PORT`) |
| GCP login CORS error | Hosting origin missing | Set `GCP_CORS_ORIGINS` to exact `https://….web.app` (or custom domain) |
| Unexpected GCP bill | Cloud SQL left RUNNABLE | Run **stop**; verify Scheduler 22:00 job |

## Staging (optional)

Not configured as a third named environment today. Options:

- Use **GCP on-demand** as staging / demo (recommended with this repo layout)
- Or second Render service + Vercel preview with a separate `VITE_BACKEND_URL`
