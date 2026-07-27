# P2 — Azure Pipelines CI (quality)

Phase **P2** mirrors [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) in Azure DevOps: backend tests, frontend build, SonarCloud with Quality Gate.

## Done criterion

A pipeline run on `main` (or a PR) completes stage **CI** with jobs **Backend**, **Frontend**, and **SonarCloud** green, including SonarCloud Quality Gate.

## Prerequisites

- [ ] P0 complete (pipeline linked to GitHub, variable group `travelmgr-sonar`)
- [ ] **SonarCloud** extension installed on the Azure DevOps organization ([Marketplace](https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarcloud))
- [ ] Variable group **`travelmgr-sonar`** (Library) with:
  - `SONAR_ORGANIZATION` (plain text, e.g. `ericvanm`)
  - `SONAR_TOKEN` (secret — SonarCloud user token, not GitHub)
- [ ] **SonarCloud service connection** (see below)
- [ ] Pipeline authorized to use variable group `travelmgr-sonar`

## One-time: SonarCloud service connection

1. **Project settings** → **Service connections** → **New service connection**
2. Choose **SonarCloud**
3. Name it **`SonarCloud`** (or update `SONAR_SERVICE_CONNECTION` in `azure-pipelines.yml`)
4. Token: same value as `SONAR_TOKEN` in the variable group
5. Grant access to all pipelines (or this pipeline only)

The SonarCloud job uses tasks `SonarCloudPrepare@3`, `SonarCloudAnalyze@3`, `SonarCloudPublish@3`.

## Pipeline layout

| Job | Runs |
|-----|------|
| Backend | lint, test:coverage (PostgreSQL 15 service container) |
| Frontend | lint, tsc, build (`VITE_BACKEND_URL` placeholder for CI) |
| SonarCloud | ESLint reports + coverage + Quality Gate wait (300s) |

Jobs **Backend** and **Frontend** run in parallel. **SonarCloud** depends on both.

Dependabot-triggered builds skip SonarCloud (same intent as GitHub Actions).

## Verify

1. Push `azure-pipelines.yml` to GitHub (branch wired to ADO).
2. Run pipeline on `main` or open a PR.
3. Confirm:
   - [ ] Backend: tests pass, artifact `backend-coverage` published
   - [ ] Frontend: build succeeds
   - [ ] SonarCloud: analysis + Quality Gate pass

## Coexistence with GitHub Actions

Both CI systems can run until P2 is stable. Then disable [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) or limit triggers to avoid duplicate minutes.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| SonarCloud task not found | Extension not installed | Install SonarCloud extension on org |
| Service connection error | Missing or wrong name | Create `SonarCloud` SC or set `SONAR_SERVICE_CONNECTION` |
| Variable group not found | Not linked or wrong project | Authorize pipeline for `travelmgr-sonar` |
| Backend DB connection failed | Postgres service not ready | Re-run; check wait step / service container |
| Quality Gate failed | Code or coverage issue | Fix findings or adjust SonarCloud (same as GitHub CI) |
| `SONAR_ORGANIZATION_Travel-manager` key mismatch | Wrong org key | Match GitHub: `{org}_Travel-manager` case-sensitive |

## Next phase

**P3** — CD Dev: deploy API (ACR + Container App) and frontend (Static Web Apps) after CI succeeds.
