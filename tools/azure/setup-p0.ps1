<#
.SYNOPSIS
  Travel Manager - Azure DevOps P0 prerequisites helper.

.DESCRIPTION
  Automates what can be scripted for phase P0:
  - Verify Azure CLI + azure-devops extension
  - Login + select subscription
  - Create resource groups rg-travelmgr-{dev,staging,prod}
  - Create (or ensure) Azure DevOps project
  - Create Variable Group "travelmgr-sonar" with placeholder secrets
  - Print remaining manual steps (GitHub service connection, pipeline, OIDC, Sonar tokens)

.PARAMETER OrganizationUrl
  Azure DevOps org URL, e.g. https://dev.azure.com/your-org or https://org.visualstudio.com

.PARAMETER ProjectName
  Azure DevOps project name (default: Travel-manager)

.PARAMETER Location
  Azure region for resource groups (default: westeurope)

.PARAMETER SubscriptionId
  Optional Azure subscription ID (otherwise uses current az account)

.PARAMETER SkipResourceGroups
  Skip RG creation

.PARAMETER SkipVariableGroup
  Skip Variable Group creation

.EXAMPLE
  .\tools\azure\setup-p0.ps1 -OrganizationUrl https://vanmeerbeck.visualstudio.com
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string] $OrganizationUrl,

  [string] $ProjectName = "Travel-manager",

  [string] $Location = "westeurope",

  [string] $SubscriptionId,

  [switch] $SkipResourceGroups,

  [switch] $SkipVariableGroup
)

$ErrorActionPreference = "Stop"

function Write-Step([string] $Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command([string] $Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name. Install Azure CLI first (see tools/azure/P0-CHECKLIST.md)."
  }
}

function Invoke-AzQuiet {
  param([scriptblock] $Script)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & $Script 2>$null
  } finally {
    $ErrorActionPreference = $prev
  }
}

Write-Step "Checking Azure CLI"
Assert-Command "az"
$azVersion = az version --query '\"azure-cli\"' -o tsv
Write-Host "Azure CLI $azVersion"

Write-Step "Ensuring azure-devops extension"
$ext = Invoke-AzQuiet { az extension show --name azure-devops --query name -o tsv }
if (-not $ext) {
  az extension add --name azure-devops --yes | Out-Null
  Write-Host "Installed azure-devops extension"
} else {
  Write-Host "azure-devops extension present"
}

Write-Step "Azure login / subscription"
$accountJson = Invoke-AzQuiet { az account show -o json }
if (-not $accountJson) {
  Write-Host "Not logged in - launching az login..."
  az login | Out-Null
  $accountJson = az account show -o json
}
$account = $accountJson | ConvertFrom-Json
if ($SubscriptionId) {
  az account set --subscription $SubscriptionId | Out-Null
  $account = az account show -o json | ConvertFrom-Json
}
Write-Host ("Subscription: {0} ({1})" -f $account.name, $account.id)
Write-Host ("Tenant      : {0}" -f $account.tenantId)

az devops configure --defaults organization=$OrganizationUrl project=$ProjectName | Out-Null

Write-Step "Ensuring Azure DevOps project '$ProjectName'"
$proj = Invoke-AzQuiet { az devops project show --project $ProjectName -o json }
if (-not $proj) {
  Write-Host "Creating project..."
  az devops project create --name $ProjectName --visibility private --source-control git --process Agile -o json | Out-Null
  Write-Host "Project created"
} else {
  Write-Host "Project already exists"
}

if (-not $SkipResourceGroups) {
  Write-Step "Creating resource groups"
  foreach ($envName in @("dev", "staging", "prod")) {
    $rg = "rg-travelmgr-$envName"
    $exists = az group exists --name $rg -o tsv
    if ($exists -eq "true") {
      Write-Host "RG exists: $rg"
    } else {
      az group create --name $rg --location $Location --tags project=travel-manager env=$envName phase=p0 -o none
      Write-Host "RG created: $rg ($Location)"
    }
  }
}

if (-not $SkipVariableGroup) {
  Write-Step "Ensuring Variable Group 'travelmgr-sonar'"
  $groupsJson = Invoke-AzQuiet { az pipelines variable-group list --group-name travelmgr-sonar -o json }
  $groups = @()
  if ($groupsJson) { $groups = $groupsJson | ConvertFrom-Json }
  if (@($groups).Count -gt 0) {
    Write-Host "Variable group 'travelmgr-sonar' already exists (id=$($groups[0].id))"
    Write-Host "Set secrets manually if empty: SONAR_TOKEN, SONAR_ORGANIZATION"
  } else {
    az pipelines variable-group create `
      --name travelmgr-sonar `
      --authorize true `
      --variables SONAR_ORGANIZATION=REPLACE_ME SONAR_TOKEN=REPLACE_ME `
      -o json | Out-Null
    Write-Host "Created variable group 'travelmgr-sonar' with placeholders"
    Write-Host "IMPORTANT: replace REPLACE_ME values and mark SONAR_TOKEN as secret in Azure DevOps UI"
  }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " P0 scripted steps completed" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Manual steps remaining (see tools/azure/P0-CHECKLIST.md):"
Write-Host "  1. Create pipeline from azure-pipelines.yml (GitHub repo ericvanm/Travel-manager)"
Write-Host "  2. Authorize GitHub service connection / OAuth app if prompted"
Write-Host "  3. Create Azure Resource Manager service connection with Workload Identity federation (OIDC)"
Write-Host "     Name suggestion: sc-azure-travelmgr"
Write-Host "     Scope: subscription (or per-RG later)"
Write-Host "  4. Fill Variable Group travelmgr-sonar with real SonarCloud values"
Write-Host "  5. Run the pipeline once - Bootstrap stage must succeed"
Write-Host ""
Write-Host "Subscription ID : $($account.id)"
Write-Host "Tenant ID       : $($account.tenantId)"
Write-Host "Org URL         : $OrganizationUrl"
Write-Host "Project         : $ProjectName"
