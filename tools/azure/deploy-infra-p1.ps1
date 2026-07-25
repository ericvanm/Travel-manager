<#
.SYNOPSIS
  Deploy Travel Manager Azure infrastructure (phase P1).

.DESCRIPTION
  Two-pass deployment:
  1. Base resources without Container App (ACR has no image yet).
  2. ACR build of travelmgr-backend, then Container App with SWA-based CORS.

.PARAMETER Environment
  Target environment (dev, staging, prod).

.PARAMETER Location
  Azure region.

.PARAMETER ResourceGroup
  Resource group name (default rg-travelmgr-{Environment}).

.PARAMETER SkipAcrBuild
  Skip ACR build and second pass (base infra only).

.PARAMETER ImageTag
  Tag for the API image in ACR.

.EXAMPLE
  .\tools\azure\deploy-infra-p1.ps1 -Environment dev
#>
[CmdletBinding()]
param(
  [ValidateSet('dev', 'staging', 'prod')]
  [string] $Environment = 'dev',

  [string] $Location = 'francecentral',

  [string] $ResourceGroup = '',

  [switch] $SkipAcrBuild,

  [string] $ImageTag = 'bootstrap'
)

$ErrorActionPreference = 'Stop'

function Write-Step([string] $Message) {
  Write-Host ''
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function New-RandomSecret([int] $Length = 40) {
  $chars = (48..57) + (65..90) + (97..122)
  -join ($chars | Get-Random -Count $Length | ForEach-Object { [char]$_ })
}

function Get-DeploymentOutput([string] $Group, [string] $DeploymentName, [string] $Key) {
  az deployment group show `
    -g $Group `
    -n $DeploymentName `
    --query "properties.outputs.$Key.value" `
    -o tsv
}

if (-not $ResourceGroup) {
  $ResourceGroup = "rg-travelmgr-$Environment"
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$bicepFile = Join-Path $repoRoot 'infra/azure/main.bicep'
$paramFile = Join-Path $repoRoot "infra/azure/$Environment.bicepparam"

if (-not (Test-Path $bicepFile)) {
  throw "Missing Bicep template: $bicepFile"
}
if (-not (Test-Path $paramFile)) {
  throw "Missing parameter file: $paramFile (create infra/azure/$Environment.bicepparam)."
}

Write-Step 'Checking Azure CLI login'
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
  throw 'Azure CLI (az) is required.'
}
$account = az account show -o json 2>$null | ConvertFrom-Json
if (-not $account) {
  throw 'Run az login first.'
}
Write-Host ("Subscription: {0}" -f $account.name)

Write-Step "Ensuring resource group $ResourceGroup"
$exists = az group exists --name $ResourceGroup -o tsv
if ($exists -ne 'true') {
  az group create --name $ResourceGroup --location $Location --tags project=travel-manager env=$Environment phase=p1 -o none
  Write-Host 'Resource group created'
} else {
  Write-Host 'Resource group exists'
}

$postgresPassword = $env:TRAVELMGR_POSTGRES_PASSWORD
if (-not $postgresPassword) {
  $postgresPassword = New-RandomSecret -Length 32
  Write-Host 'Generated postgresAdminPassword (store securely; not printed).'
}

$appSecret = $env:TRAVELMGR_APP_SECRET
if (-not $appSecret) {
  $appSecret = New-RandomSecret -Length 48
  Write-Host 'Generated appSecret (stored in Key Vault; not printed).'
}

$deploymentBase = "travelmgr-$Environment-p1"

function Invoke-AzDeployment {
  param(
    [string] $Name,
    [hashtable] $Params
  )
  $overrides = @()
  foreach ($key in $Params.Keys) {
    $overrides += "$key=$($Params[$key])"
  }
  & az deployment group create `
    -g $ResourceGroup `
    -n $Name `
    -f $bicepFile `
    --parameters $paramFile `
    --parameters @overrides `
    -o none
  if ($LASTEXITCODE -ne 0) {
    throw "Azure deployment '$Name' failed (exit $LASTEXITCODE)."
  }
}

Write-Step 'Pass 1 — base infrastructure (no Container App)'
$pass1Name = "$deploymentBase-pass1"
Invoke-AzDeployment -Name $pass1Name -Params @{
  environment            = $Environment
  location               = $Location
  deployContainerApp     = 'false'
  postgresAdminPassword  = $postgresPassword
  appSecret              = $appSecret
}

$acrName = Get-DeploymentOutput -Group $ResourceGroup -DeploymentName $pass1Name -Key 'acrName'
$acrLoginServer = Get-DeploymentOutput -Group $ResourceGroup -DeploymentName $pass1Name -Key 'acrLoginServer'
$swaHost = Get-DeploymentOutput -Group $ResourceGroup -DeploymentName $pass1Name -Key 'staticWebAppDefaultHostname'
$swaUrl = "https://$swaHost"

Write-Host "ACR          : $acrName ($acrLoginServer)"
Write-Host "Static Web App: $swaUrl"

if ($SkipAcrBuild) {
  Write-Host ''
  Write-Host 'SkipAcrBuild set — stopping after pass 1.' -ForegroundColor Yellow
  exit 0
}

Write-Step 'Building and pushing API image to ACR'
$dockerfileDir = Join-Path $repoRoot 'travelmgr-backend'
if (-not (Test-Path $dockerfileDir)) {
  throw "Backend directory not found: $dockerfileDir"
}

$imageRef = "travel-manager-api:$ImageTag"
$containerImage = "$acrLoginServer/$imageRef"

az acr build `
  --registry $acrName `
  --image $imageRef `
  --file (Join-Path $dockerfileDir 'Dockerfile') `
  $dockerfileDir `
  -o none

if ($LASTEXITCODE -ne 0) {
  Write-Host 'ACR Tasks not available on this subscription — using local Docker build/push.' -ForegroundColor Yellow
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'ACR build failed and Docker CLI is not available for fallback. Install Docker Desktop or enable ACR Tasks on the subscription.'
  }
  az acr login --name $acrName -o none
  if ($LASTEXITCODE -ne 0) { throw 'az acr login failed.' }
  docker build -t $containerImage -f (Join-Path $dockerfileDir 'Dockerfile') $dockerfileDir
  if ($LASTEXITCODE -ne 0) { throw 'Docker build failed.' }
  docker push $containerImage
  if ($LASTEXITCODE -ne 0) { throw 'Docker push failed.' }
}

Write-Step 'Pass 2 — Container App with API image and SWA CORS'
$pass2Name = "$deploymentBase-pass2"
Invoke-AzDeployment -Name $pass2Name -Params @{
  environment            = $Environment
  location               = $Location
  deployContainerApp     = 'true'
  containerImage         = $containerImage
  corsOrigins            = $swaUrl
  frontendUrl            = $swaUrl
  postgresAdminPassword  = $postgresPassword
  appSecret              = $appSecret
}

$apiUrl = Get-DeploymentOutput -Group $ResourceGroup -DeploymentName $pass2Name -Key 'apiUrl'

Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host ' P1 infrastructure deployment complete' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Green
Write-Host ''
Write-Host "Resource group : $ResourceGroup"
Write-Host "API URL        : $apiUrl"
Write-Host "Frontend (SWA) : $swaUrl"
Write-Host "Health check   : $apiUrl/api/health"
Write-Host ''
Write-Host 'Next steps (see tools/azure/P1-CHECKLIST.md):'
Write-Host '  - Deploy frontend to Static Web Apps (P3) with VITE_BACKEND_URL=$apiUrl/api'
Write-Host '  - Store postgresAdminPassword offline if you generated it this run'
Write-Host '  - Optional: set USE_OPENAI=true via redeploy or container app update'
