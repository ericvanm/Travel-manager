# P1 — Azure Dev infrastructure (IaC)

Phase **P1** provisions the **Dev** Azure stack for Travel Manager using Bicep and a two-pass deploy script.

## Done criterion

Running `.\tools\azure\deploy-infra-p1.ps1 -Environment dev` completes successfully and `GET {apiUrl}/api/health` returns `{ "status": "ok" }` after the Container App scales up.

## Prerequisites

- [ ] P0 complete (ADO project, `rg-travelmgr-dev`, OIDC service connection recommended for later CD)
- [ ] Azure CLI logged in (`az login`) with rights on the subscription (Owner or Contributor + User Access Administrator for RBAC assignments)
- [ ] Docker not required locally (`az acr build` runs in Azure)
- [ ] Resource providers registered (script may prompt on first use): `Microsoft.App`, `Microsoft.DBforPostgreSQL`, `Microsoft.ContainerRegistry`

## What gets created (dev)

| Component | Azure service |
|-----------|----------------|
| API | Azure Container Apps (`travelmgr-dev-api`) |
| Frontend host | Azure Static Web Apps (`travelmgrdevweb`) — empty until P3 deploy |
| Database | PostgreSQL Flexible Server 15 (`travelmgr-dev-psql`, DB `travel_mgr`) |
| Registry | Azure Container Registry (`travelmgrdevacr`) |
| Secrets | Key Vault (`travelmgr-dev-kv`: `app-secret`, `database-url`) |
| Observability | Log Analytics workspace |

## Deploy

From the repository root:

```powershell
az login
.\tools\azure\deploy-infra-p1.ps1 -Environment dev
```

Optional:

| Flag / env | Purpose |
|------------|---------|
| `-SkipAcrBuild` | Base infra only (pass 1) |
| `-ImageTag` | ACR tag (default `bootstrap`) |
| `$env:TRAVELMGR_POSTGRES_PASSWORD` | Reuse Postgres password on redeploy |
| `$env:TRAVELMGR_APP_SECRET` | Reuse session secret on redeploy |

## Verify

```powershell
# Replace with output API URL from the script
curl.exe -fsS "https://<api-fqdn>/api/health"
```

- [ ] Health JSON `status: ok`
- [ ] Static Web App default hostname opens (placeholder until frontend deploy)
- [ ] Key Vault contains secrets (portal → Key Vault → Secrets)

## FinOps notes (dev)

- Container Apps: `minReplicas: 0` (cold start after idle)
- PostgreSQL: Burstable `Standard_B1ms`, 32 GB storage
- ACR: Basic SKU
- Static Web App: Free tier

Review cost in [Azure Cost Management](https://portal.azure.com/#view/Microsoft_Azure_CostManagement) after first deploy.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Role assignment failed | Insufficient RBAC | Grant User Access Administrator or deploy as Owner |
| ACR build failed (TasksOperationsNotAllowed) | ACR Tasks disabled on subscription | Script falls back to local `docker build` + `push`; requires Docker Desktop |
| Container App unhealthy | DB SSL / migrations | Check Container App logs; verify Key Vault `database-url` |
| CORS errors from browser | SWA URL mismatch | Redeploy pass 2 or update `CORS_ORIGINS` to exact SWA URL |
| Region blocked (`locationineligible`) | Subscription / `westeurope` | Redeploy with `-Location francecentral` (default in script) |
| SWA region error | Static Web Apps not in every region | SWA deploys to `westus2` by default (`staticWebAppLocation` in Bicep) while API/DB use `-Location` |

## Out of scope (later phases)

| Phase | Work |
|-------|------|
| P2 | Full CI in Azure Pipelines + SonarCloud |
| P3 | CD: build frontend with `VITE_BACKEND_URL`, deploy SWA + API |
| P5 | Staging / Prod parameter files and approvals |

See also [`infra/azure/README.md`](../../infra/azure/README.md).
