#Requires -Version 5.1
<#
.SYNOPSIS
  Deploys the on-demand GCP environment (API Cloud Run + Firebase Hosting).

.DESCRIPTION
  Mirrors .github/workflows/deploy-gcp.yml (action=deploy):
  1. Start Cloud SQL if needed and wait until RUNNABLE
  2. Build and push the API image to Artifact Registry
  3. Deploy Cloud Run
  4. Build the Vite SPA with VITE_BACKEND_URL
  5. Deploy Firebase Hosting
  6. Smoke-test /api/health

.PARAMETER ProjectId
  GCP project id (or env GCP_PROJECT_ID).

.PARAMETER DatabaseUrl
  PostgreSQL URL for Cloud Run (Cloud SQL Unix socket form), or env DATABASE_URL / GCP_DATABASE_URL.

.PARAMETER Secret
  Session secret, or env SECRET / GCP_SECRET.

.PARAMETER CorsOrigins
  Exact Firebase Hosting origin(s), or env CORS_ORIGINS / GCP_CORS_ORIGINS.

.PARAMETER SkipFrontend
  Deploy API only.

.PARAMETER SkipBackend
  Deploy Firebase Hosting only (still starts Cloud SQL).

.EXAMPLE
  $env:GCP_PROJECT_ID='my-project'
  $env:GCP_DATABASE_URL='postgres://user:pass@/travel_mgr?host=/cloudsql/my-project:europe-west1:travel-mgr-db'
  $env:GCP_SECRET='...'
  $env:GCP_CORS_ORIGINS='https://my-project.web.app'
  .\tools\gcp-deploy.ps1
#>
[CmdletBinding()]
param(
    [string]$ProjectId,
    [string]$Region,
    [string]$SqlInstance,
    [string]$CloudRunService,
    [string]$ArtifactRepo,
    [string]$ImageName,
    [string]$CloudSqlConnectionName,
    [string]$DatabaseUrl,
    [string]$Secret,
    [string]$CorsOrigins,
    [string]$UseOpenAi = 'false',
    [switch]$SkipFrontend,
    [switch]$SkipBackend
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'gcp-common.ps1')

$RepoRoot = Get-RepoRoot
$Settings = Get-GcpSettings `
    -ProjectId $ProjectId `
    -Region $Region `
    -SqlInstance $SqlInstance `
    -CloudRunService $CloudRunService `
    -ArtifactRepo $ArtifactRepo `
    -ImageName $ImageName `
    -CloudSqlConnectionName $CloudSqlConnectionName

$dbUrl = if ($DatabaseUrl) { $DatabaseUrl } elseif ($env:GCP_DATABASE_URL) { $env:GCP_DATABASE_URL } else { $env:DATABASE_URL }
$sessionSecret = if ($Secret) { $Secret } elseif ($env:GCP_SECRET) { $env:GCP_SECRET } else { $env:SECRET }
$cors = if ($CorsOrigins) { $CorsOrigins } elseif ($env:GCP_CORS_ORIGINS) { $env:GCP_CORS_ORIGINS } else { $env:CORS_ORIGINS }

if (-not $SkipBackend) {
    if (-not $dbUrl) { throw 'Database URL required (-DatabaseUrl or GCP_DATABASE_URL / DATABASE_URL).' }
    if (-not $sessionSecret) { throw 'Session secret required (-Secret or GCP_SECRET / SECRET).' }
    if (-not $cors) { throw 'CORS origins required (-CorsOrigins or GCP_CORS_ORIGINS / CORS_ORIGINS).' }
}

Assert-CommandExists -Name 'gcloud'
if (-not $SkipBackend) {
    Assert-CommandExists -Name 'docker'
}
if (-not $SkipFrontend) {
    Assert-CommandExists -Name 'npm'
    Assert-CommandExists -Name 'firebase'
}

Write-Host ''
Write-Host "Travel Manager - GCP deploy ($($Settings.ProjectId))" -ForegroundColor Cyan

Start-GcpCloudSql -Settings $Settings

$ApiUrl = $null
$ImageTag = "$(Get-Date -Format 'yyyyMMddHHmmss')"
$ImageRef = "$($Settings.ImageUri):$ImageTag"
$ImageLatest = "$($Settings.ImageUri):latest"

if (-not $SkipBackend) {
    Write-Host 'Configuring Docker auth for Artifact Registry...' -ForegroundColor Cyan
    gcloud auth configure-docker "$($Settings.Region)-docker.pkg.dev" --quiet

    Write-Host "Building API image $ImageRef ..." -ForegroundColor Cyan
    docker build -t $ImageRef -t $ImageLatest (Join-Path $RepoRoot 'travelmgr-backend')
    docker push $ImageRef
    docker push $ImageLatest

    Write-Host "Deploying Cloud Run $($Settings.CloudRunService)..." -ForegroundColor Cyan
    $envFile = Join-Path ([System.IO.Path]::GetTempPath()) ("travelmgr-cloudrun-env-{0}.yaml" -f [guid]::NewGuid().ToString('N'))
    function Format-YamlScalar([string]$Value) {
        $escaped = $Value.Replace('\', '\\').Replace('"', '\"')
        return '"' + $escaped + '"'
    }
    # Do not set PORT: Cloud Run reserves it and injects the value from --port.
    @(
        'NODE_ENV: production'
        ("DATABASE_URL: {0}" -f (Format-YamlScalar $dbUrl))
        ("SECRET: {0}" -f (Format-YamlScalar $sessionSecret))
        ("CORS_ORIGINS: {0}" -f (Format-YamlScalar $cors))
        ("USE_OPENAI: {0}" -f (Format-YamlScalar $UseOpenAi))
    ) | Set-Content -LiteralPath $envFile -Encoding utf8

    try {
        gcloud run deploy $Settings.CloudRunService `
            --project $Settings.ProjectId `
            --region $Settings.Region `
            --image $ImageRef `
            --platform managed `
            --allow-unauthenticated `
            --port 3001 `
            --min-instances 0 `
            --max-instances 3 `
            --cpu 1 `
            --memory 512Mi `
            --timeout 300 `
            --set-cloudsql-instances $Settings.CloudSqlConnectionName `
            --env-vars-file $envFile `
            --quiet
    }
    finally {
        Remove-Item -LiteralPath $envFile -Force -ErrorAction SilentlyContinue
    }

    $ApiUrl = gcloud run services describe $Settings.CloudRunService `
        --project $Settings.ProjectId `
        --region $Settings.Region `
        --format='value(status.url)'
    $ApiUrl = $ApiUrl.Trim()
    Write-Host "API URL: $ApiUrl" -ForegroundColor Green
}
else {
    $ApiUrl = gcloud run services describe $Settings.CloudRunService `
        --project $Settings.ProjectId `
        --region $Settings.Region `
        --format='value(status.url)'
    if (-not $ApiUrl) {
        throw "Cloud Run service $($Settings.CloudRunService) not found; cannot build frontend."
    }
    $ApiUrl = $ApiUrl.Trim()
}

if (-not $SkipFrontend) {
    $BackendApi = "$ApiUrl/api"
    Write-Host "Building frontend with VITE_BACKEND_URL=$BackendApi ..." -ForegroundColor Cyan
    Push-Location (Join-Path $RepoRoot 'travelmgr-frontend')
    try {
        $env:VITE_BACKEND_URL = $BackendApi
        npm ci --ignore-scripts
        npm run build
    }
    finally {
        Pop-Location
    }

    Write-Host 'Deploying Firebase Hosting...' -ForegroundColor Cyan
    Push-Location $RepoRoot
    try {
        firebase deploy --only hosting --project $Settings.ProjectId --non-interactive
    }
    finally {
        Pop-Location
    }
}

if ($ApiUrl) {
    $healthUrl = "$ApiUrl/api/health"
    Write-Host "Smoke test: $healthUrl" -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 60
    if ($response.StatusCode -ne 200) {
        throw "Health check failed with status $($response.StatusCode)"
    }
    Write-Host "Health OK: $($response.Content)" -ForegroundColor Green
}

Write-Host 'GCP deploy completed.' -ForegroundColor Green
