#Requires -Version 5.1
<#
.SYNOPSIS
  Resets the Travel Manager PostgreSQL database to an empty state.

.DESCRIPTION
  Drops and recreates the application database. On the next backend start, Umzug
  migrations run again (schema, seed data, default admin user, etc.).

  Modes:
    DockerDev  - Docker Compose dev stack (docker-compose.dev.yml, container travel-mgr-db)
    DockerProd - Docker Compose prod stack (docker-compose.yml)
    Local      - PostgreSQL reachable from the host (psql or existing travel-mgr-db container)

.PARAMETER Mode
  How to connect to PostgreSQL. Default: DockerDev.

.PARAMETER DatabaseUrl
  Override connection string (postgres://user:pass@host:port/dbname).
  If omitted, Local mode reads travelmgr backend/.env (DATABASE_URL).

.PARAMETER Force
  Skip confirmation prompt.

.PARAMETER NoRestart
  Do not restart Docker Compose services after reset (Docker modes only).

.PARAMETER IncludeTestDatabase
  Also reset travel_mgr_test (Local mode only, uses TEST_DATABASE_URL from .env).

.EXAMPLE
  .\tools\reset-database.ps1

.EXAMPLE
  .\tools\reset-database.ps1 -Mode Local -Force

.EXAMPLE
  .\tools\reset-database.ps1 -Mode DockerDev -NoRestart
#>
[CmdletBinding()]
param(
    [ValidateSet('DockerDev', 'DockerProd', 'Local')]
    [string]$Mode = 'DockerDev',

    [string]$DatabaseUrl = '',

    [switch]$Force,

    [switch]$NoRestart,

    [switch]$IncludeTestDatabase
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

function Parse-PostgresUrl {
    param([Parameter(Mandatory = $true)][string]$Url)

    if ($Url -notmatch '^postgres(?:ql)?://(?<user>[^:@/]+)(?::(?<password>[^@]*))?@(?<host>[^:/]+)(?::(?<port>\d+))?/(?<database>[^?]+)') {
        throw "Invalid PostgreSQL URL: $Url"
    }

    return [PSCustomObject]@{
        User     = $Matches['user']
        Password = $Matches['password']
        Host     = $Matches['host']
        Port     = if ($Matches['port']) { $Matches['port'] } else { '5432' }
        Database = $Matches['database']
    }
}

function Read-DotEnvValue {
    param(
        [Parameter(Mandatory = $true)][string]$EnvFile,
        [Parameter(Mandatory = $true)][string]$Key
    )

    if (-not (Test-Path -LiteralPath $EnvFile)) {
        return $null
    }

    foreach ($line in Get-Content -LiteralPath $EnvFile) {
        if ($line -match "^\s*$([regex]::Escape($Key))\s*=\s*(.+?)\s*$") {
            return $Matches[1].Trim().Trim('"').Trim("'")
        }
    }

    return $null
}

function Invoke-PostgresSql {
    param(
        [Parameter(Mandatory = $true)][string]$Sql,
        [Parameter(Mandatory = $true)][string]$MaintenanceDatabase,
        [string]$ContainerName = '',
        [string]$HostName = 'localhost',
        [string]$Port = '5432',
        [string]$User = 'postgres',
        [string]$Password = ''
    )

    if ($ContainerName) {
        docker exec $ContainerName psql -U $User -d $MaintenanceDatabase -v ON_ERROR_STOP=1 -c $Sql | Out-Null
        return
    }

    $psql = Get-Command psql -ErrorAction SilentlyContinue
    if (-not $psql) {
        throw 'psql is not on PATH. Install PostgreSQL client tools, use DockerDev mode, or start container travel-mgr-db.'
    }

    if ($Password) {
        $env:PGPASSWORD = $Password
    }

    try {
        & psql -h $HostName -p $Port -U $User -d $MaintenanceDatabase -v ON_ERROR_STOP=1 -c $Sql | Out-Null
    }
    finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Reset-PostgresDatabase {
    param(
        [Parameter(Mandatory = $true)][string]$DatabaseName,
        [Parameter(Mandatory = $true)][string]$MaintenanceDatabase,
        [string]$ContainerName = '',
        [string]$HostName = 'localhost',
        [string]$Port = '5432',
        [string]$User = 'postgres',
        [string]$Password = ''
    )

    Write-Host "  -> terminating connections on '$DatabaseName'..." -ForegroundColor DarkGray
    $terminateSql = @"
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DatabaseName'
  AND pid <> pg_backend_pid();
"@
    Invoke-PostgresSql -Sql $terminateSql -MaintenanceDatabase $MaintenanceDatabase `
        -ContainerName $ContainerName -HostName $HostName -Port $Port -User $User -Password $Password

    Write-Host "  -> dropping database '$DatabaseName'..." -ForegroundColor DarkGray
    Invoke-PostgresSql -Sql "DROP DATABASE IF EXISTS `"$DatabaseName`";" -MaintenanceDatabase $MaintenanceDatabase `
        -ContainerName $ContainerName -HostName $HostName -Port $Port -User $User -Password $Password

    Write-Host "  -> creating database '$DatabaseName'..." -ForegroundColor DarkGray
    Invoke-PostgresSql -Sql "CREATE DATABASE `"$DatabaseName`";" -MaintenanceDatabase $MaintenanceDatabase `
        -ContainerName $ContainerName -HostName $HostName -Port $Port -User $User -Password $Password
}

function Test-DockerContainerRunning {
    param([Parameter(Mandatory = $true)][string]$Name)
    $state = docker inspect -f '{{.State.Running}}' $Name 2>$null
    return $state -eq 'true'
}

function Ensure-DockerDatabaseContainer {
    param(
        [Parameter(Mandatory = $true)][string]$RepoRoot,
        [Parameter(Mandatory = $true)][string]$ComposeFile,
        [Parameter(Mandatory = $true)][string]$ContainerName
    )

    if (Test-DockerContainerRunning -Name $ContainerName) {
        return
    }

    Write-Host "Starting database container ($ContainerName)..." -ForegroundColor Yellow
    Push-Location $RepoRoot
    try {
        docker compose -f $ComposeFile up -d db | Out-Null
    }
    finally {
        Pop-Location
    }

    $deadline = (Get-Date).AddSeconds(60)
    while ((Get-Date) -lt $deadline) {
        if (Test-DockerContainerRunning -Name $ContainerName) {
            $ready = docker exec $ContainerName pg_isready -U postgres 2>$null
            if ($LASTEXITCODE -eq 0) {
                return
            }
        }
        Start-Sleep -Seconds 2
    }

    throw "Database container '$ContainerName' did not become ready in time."
}

$RepoRoot = Get-RepoRoot
$ComposeFile = switch ($Mode) {
    'DockerDev'  { Join-Path $RepoRoot 'docker-compose.dev.yml' }
    'DockerProd' { Join-Path $RepoRoot 'docker-compose.yml' }
    default      { $null }
}
$DbContainer = 'travel-mgr-db'

if (-not $Force) {
    Write-Host ''
    Write-Host 'Travel Manager — database reset' -ForegroundColor Cyan
    Write-Host "Mode: $Mode"
    Write-Host ''
    Write-Host 'This will DELETE ALL application data (trips, users, sessions, AI logs, etc.).'
    Write-Host 'Schema will be recreated automatically when the backend starts (migrations).'
    Write-Host ''
    $answer = Read-Host 'Type RESET to continue'
    if ($answer -ne 'RESET') {
        Write-Host 'Aborted.' -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ''
Write-Host 'Resetting database...' -ForegroundColor Cyan

switch ($Mode) {
    'DockerDev' {
        if (-not (Test-Path -LiteralPath $ComposeFile)) {
            throw "Compose file not found: $ComposeFile"
        }

        Write-Host 'Stopping backend and frontend containers to release DB connections...' -ForegroundColor Yellow
        Push-Location $RepoRoot
        try {
            docker compose -f $ComposeFile stop backend app nginx 2>$null | Out-Null
        }
        finally {
            Pop-Location
        }

        Ensure-DockerDatabaseContainer -RepoRoot $RepoRoot -ComposeFile $ComposeFile -ContainerName $DbContainer

        $dbName = 'travel_mgr'
        Reset-PostgresDatabase -DatabaseName $dbName -MaintenanceDatabase 'postgres' `
            -ContainerName $DbContainer -User 'postgres'

        if (-not $NoRestart) {
            Write-Host 'Starting Docker Compose stack...' -ForegroundColor Yellow
            Push-Location $RepoRoot
            try {
                docker compose -f $ComposeFile up -d
            }
            finally {
                Pop-Location
            }
        }
    }

    'DockerProd' {
        if (-not (Test-Path -LiteralPath $ComposeFile)) {
            throw "Compose file not found: $ComposeFile"
        }

        Write-Host 'Stopping application containers...' -ForegroundColor Yellow
        Push-Location $RepoRoot
        try {
            docker compose -f $ComposeFile stop backend app nginx 2>$null | Out-Null
        }
        finally {
            Pop-Location
        }

        Ensure-DockerDatabaseContainer -RepoRoot $RepoRoot -ComposeFile $ComposeFile -ContainerName $DbContainer

        Reset-PostgresDatabase -DatabaseName 'travel_mgr' -MaintenanceDatabase 'postgres' `
            -ContainerName $DbContainer -User 'postgres'

        if (-not $NoRestart) {
            Write-Host 'Starting Docker Compose stack...' -ForegroundColor Yellow
            Push-Location $RepoRoot
            try {
                docker compose -f $ComposeFile up -d
            }
            finally {
                Pop-Location
            }
        }
    }

    'Local' {
        $envFile = Join-Path $RepoRoot 'travelmgr backend\.env'
        if (-not $DatabaseUrl) {
            $DatabaseUrl = Read-DotEnvValue -EnvFile $envFile -Key 'DATABASE_URL'
        }
        if (-not $DatabaseUrl) {
            throw "DATABASE_URL not set. Pass -DatabaseUrl or configure travelmgr backend/.env"
        }

        $parsed = Parse-PostgresUrl -Url $DatabaseUrl
        $containerRunning = Test-DockerContainerRunning -Name $DbContainer

        if ($containerRunning -and $parsed.Host -in @('localhost', '127.0.0.1', 'db')) {
            Write-Host "Using Docker container '$DbContainer' for local reset..." -ForegroundColor Yellow
            Reset-PostgresDatabase -DatabaseName $parsed.Database -MaintenanceDatabase 'postgres' `
                -ContainerName $DbContainer -User $parsed.User
        }
        else {
            Reset-PostgresDatabase -DatabaseName $parsed.Database -MaintenanceDatabase 'postgres' `
                -HostName $parsed.Host -Port $parsed.Port -User $parsed.User -Password $parsed.Password
        }

        if ($IncludeTestDatabase) {
            $testUrl = Read-DotEnvValue -EnvFile $envFile -Key 'TEST_DATABASE_URL'
            if ($testUrl) {
                $testParsed = Parse-PostgresUrl -Url $testUrl
                Write-Host "Resetting test database '$($testParsed.Database)'..." -ForegroundColor Yellow
                if ($containerRunning -and $testParsed.Host -in @('localhost', '127.0.0.1', 'db')) {
                    Reset-PostgresDatabase -DatabaseName $testParsed.Database -MaintenanceDatabase 'postgres' `
                        -ContainerName $DbContainer -User $testParsed.User
                }
                else {
                    Reset-PostgresDatabase -DatabaseName $testParsed.Database -MaintenanceDatabase 'postgres' `
                        -HostName $testParsed.Host -Port $testParsed.Port -User $testParsed.User -Password $testParsed.Password
                }
            }
            else {
                Write-Warning 'IncludeTestDatabase was set but TEST_DATABASE_URL is missing from .env'
            }
        }

        Write-Host ''
        Write-Host 'Restart the backend to apply migrations (npm run dev or Docker).' -ForegroundColor Yellow
    }
}

Write-Host ''
Write-Host 'Database reset complete.' -ForegroundColor Green
Write-Host 'Default admin user (username: admin, no password) is recreated by migrations on backend startup.' -ForegroundColor DarkGray
Write-Host ''
