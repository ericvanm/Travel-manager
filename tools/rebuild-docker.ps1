#Requires -Version 5.1
<#
.SYNOPSIS
  Rebuilds and restarts Travel Manager Docker Compose stacks.

.DESCRIPTION
  Stops containers, rebuilds images, and starts the stack in detached mode.
  Optionally resets the PostgreSQL database before rebuild.

.PARAMETER Profile
  Dev  - docker-compose.dev.yml (hot reload, ports 5173 / 3001 / 8080)
  Prod - docker-compose.yml (production-like nginx front on 8080)

.PARAMETER NoCache
  Pass --no-cache to docker compose build.

.PARAMETER ResetDatabase
  Run reset-database.ps1 before rebuild (same profile).

.PARAMETER Force
  Skip confirmation when -ResetDatabase is used.

.EXAMPLE
  .\tools\rebuild-docker.ps1

.EXAMPLE
  .\tools\rebuild-docker.ps1 -Profile Prod -NoCache

.EXAMPLE
  .\tools\rebuild-docker.ps1 -ResetDatabase -Force
#>
[CmdletBinding()]
param(
    [ValidateSet('Dev', 'Prod')]
    [string]$Profile = 'Dev',

    [switch]$NoCache,

    [switch]$ResetDatabase,

    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

$RepoRoot = Get-RepoRoot
$ComposeFile = Join-Path $RepoRoot $(if ($Profile -eq 'Dev') { 'docker-compose.dev.yml' } else { 'docker-compose.yml' })

if (-not (Test-Path -LiteralPath $ComposeFile)) {
    throw "Compose file not found: $ComposeFile"
}

Write-Host ''
Write-Host "Travel Manager — Docker rebuild ($Profile)" -ForegroundColor Cyan
Write-Host "Compose file: $ComposeFile"
Write-Host ''

Push-Location $RepoRoot
try {
    if ($ResetDatabase) {
        $resetMode = if ($Profile -eq 'Dev') { 'DockerDev' } else { 'DockerProd' }
        $resetScript = Join-Path $PSScriptRoot 'reset-database.ps1'
        $resetArgs = @{
            Mode       = $resetMode
            NoRestart  = $true
        }
        if ($Force) {
            $resetArgs['Force'] = $true
        }
        & $resetScript @resetArgs
        Write-Host ''
    }

    Write-Host 'Stopping containers...' -ForegroundColor Yellow
    docker compose -f $ComposeFile down --remove-orphans

    Write-Host 'Building images...' -ForegroundColor Yellow
    if ($NoCache) {
        docker compose -f $ComposeFile build --no-cache
    }
    else {
        docker compose -f $ComposeFile build
    }

    Write-Host 'Starting containers...' -ForegroundColor Yellow
    docker compose -f $ComposeFile up -d

    Write-Host ''
    Write-Host 'Container status:' -ForegroundColor Cyan
    docker compose -f $ComposeFile ps

    Write-Host ''
    if ($Profile -eq 'Dev') {
        Write-Host 'Dev URLs:' -ForegroundColor Green
        Write-Host '  Frontend (Vite):  http://localhost:5173'
        Write-Host '  Backend API:      http://localhost:3001/api/health'
        Write-Host '  Nginx proxy:      http://localhost:8080'
    }
    else {
        Write-Host 'Prod-like URLs:' -ForegroundColor Green
        Write-Host '  Application:      http://localhost:8080'
        Write-Host '  Backend (internal): travel-mgr-back:3001'
    }
    Write-Host ''
}
finally {
    Pop-Location
}
