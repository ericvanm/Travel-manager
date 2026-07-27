# P0 — Azure DevOps prerequisites checklist

Phase **P0** validates that Azure DevOps can build this GitHub repository before infra (P1) and full CI (P2).

## Target (already decided)

| Item | Choice |
|------|--------|
| Approach | Azure hosting + multi-env |
| Scope | CI + CD |
| Source | GitHub (`ericvanm/Travel-manager`) |
| Hosting | Migrate to Azure |
| Quality | Keep SonarCloud |

## Done criterion

A pipeline run triggered from GitHub (push or PR to `main`) completes the **Bootstrap** stage in `azure-pipelines.yml` successfully.

## Prerequisites on your machine

| Tool | Purpose | Install (Windows) |
|------|---------|-------------------|
| [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli-windows) | RG, DevOps project, variable groups | `winget install -e --id Microsoft.AzureCLI` |
| Azure CLI extension `azure-devops` | DevOps REST via `az` | installed by `setup-p0.ps1` |
| Browser access | Pipeline UI, OIDC service connection, Sonar secrets | — |

Optional later: `gh` (GitHub CLI) — not required for P0.

## Step-by-step

### 1. Accounts & access

- [ ] Azure subscription with rights to create resource groups and (later) app resources
- [ ] Azure DevOps organization (create at https://dev.azure.com if needed)
- [ ] Access to GitHub repo `ericvanm/Travel-manager` (admin recommended for service connections)
- [ ] SonarCloud org + token (same as current GitHub Actions `SONAR_TOKEN` / `SONAR_ORGANIZATION`)

### 2. Commit / push pipeline file

Ensure `azure-pipelines.yml` is on the branch you will wire (ideally `main`, or current feature branch for a first test):

```powershell
git add azure-pipelines.yml tools/azure/
git status
# commit when you are ready (ask the agent if you want a commit message drafted)
git push
```

### 3. Run the helper script

```powershell
# After Azure CLI is installed and available in a new terminal:
az login
.\tools\azure\setup-p0.ps1 -OrganizationUrl https://dev.azure.com/<YOUR_ORG>
```

Optional parameters:

| Parameter | Default | Meaning |
|-----------|---------|---------|
| `-ProjectName` | `Travel-manager` | ADO project name |
| `-Location` | `francecentral` | Azure region for RGs and P1 resources (use another region if subscription is region-blocked) |
| `-SubscriptionId` | current `az` account | Force subscription |
| `-SkipResourceGroups` | off | Skip RG creation |
| `-SkipVariableGroup` | off | Skip Sonar variable group |

The script creates:

- ADO project (if missing)
- `rg-travelmgr-dev`, `rg-travelmgr-staging`, `rg-travelmgr-prod`
- Variable group `travelmgr-sonar` (placeholders)

### 4. Create the pipeline (portal — once)

1. Azure DevOps → **Pipelines** → **New pipeline**
2. **GitHub** → select `ericvanm/Travel-manager` (authorize OAuth / GitHub App if asked)
3. **Existing Azure Pipelines YAML file** → `/azure-pipelines.yml`
4. **Run** — Bootstrap job must be green

Suggested pipeline name: `Travel-manager-CI`

### 5. Azure service connection (OIDC / Workload Identity)

Needed from **P1** onward for deployments; create it in P0 to unblock later work:

1. **Project settings** → **Service connections** → **New service connection**
2. **Azure Resource Manager** → **Workload Identity federation (automatic)**
3. Scope: subscription (fine for P0/P1); name: `sc-azure-travelmgr`
4. Grant access to all pipelines (or restrict later)

Record for later pipelines:

- Service connection name: `sc-azure-travelmgr`
- Subscription ID / Tenant ID (printed by `setup-p0.ps1`)

### 6. SonarCloud variable group

In **Pipelines** → **Library** → `travelmgr-sonar`:

| Variable | Secret? | Value |
|----------|---------|-------|
| `SONAR_ORGANIZATION` | no | Same as GitHub Actions secret |
| `SONAR_TOKEN` | **yes** | SonarCloud user/token |

Used starting in **P2** (full CI). Creating the group in P0 avoids blocking later.

### 7. Verify

- [ ] Pipeline run succeeded (Bootstrap)
- [ ] Three resource groups visible in Azure portal
- [ ] Service connection `sc-azure-travelmgr` exists
- [ ] Variable group `travelmgr-sonar` filled (not `REPLACE_ME`)

## Out of scope for P0 (next phases)

| Phase | Work |
|-------|------|
| P1 | Bicep/Terraform: Postgres, ACR, Container Apps, SWA, Key Vault |
| P2 | Full CI (lint/test/Sonar) replacing this bootstrap stage |
| P3+ | CD Dev → Staging → Prod |

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Cannot see GitHub repo in ADO | OAuth/App not authorized | Re-authorize GitHub in ADO; check org SSO |
| Pipeline YAML not found | File not on selected branch | Push `azure-pipelines.yml` then re-select branch |
| `az` not found after winget | PATH not refreshed | Open a **new** terminal |
| Variable group create fails | Missing ADO permissions | Need Project Administrator (or Variable Groups manage) |
| OIDC connection fails | Insufficient Azure AD rights | Need Application Administrator / Owner on subscription |

​
