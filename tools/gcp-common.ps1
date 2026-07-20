#Requires -Version 5.1
<#
.SYNOPSIS
  Shared helpers for GCP on-demand environment scripts.

.DESCRIPTION
  Dot-sourced by gcp-start.ps1, gcp-stop.ps1, gcp-deploy.ps1, and gcp-setup-autostop.ps1.
  Reads configuration from parameters or environment variables.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

function Assert-CommandExists {
    param([Parameter(Mandatory)][string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found on PATH: $Name"
    }
}

function Get-GcloudExecutable {
    $cmd = Get-Command 'gcloud.cmd' -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    $ps1 = Get-Command 'gcloud' -ErrorAction SilentlyContinue
    if ($ps1) {
        return $ps1.Source
    }

    throw 'Required command not found on PATH: gcloud'
}

function Invoke-Gcloud {
    param(
        [Parameter(Mandatory)][string[]]$ArgumentList,
        [switch]$AllowFailure
    )

    $gcloudExe = Get-GcloudExecutable
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $raw = & $gcloudExe @ArgumentList 2>&1
        $code = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $prev
    }

    $text = @($raw | ForEach-Object { "$_" }) -join "`n"
    $text = $text.Trim()

    if (-not $AllowFailure -and $code -ne 0) {
        throw "gcloud $($ArgumentList -join ' ') failed (exit $code): $text"
    }

    return [pscustomobject]@{
        ExitCode = $code
        Output   = $text
    }
}

function Get-GcpSettings {
    param(
        [string]$ProjectId,
        [string]$Region,
        [string]$SqlInstance,
        [string]$CloudRunService,
        [string]$ArtifactRepo,
        [string]$ImageName,
        [string]$CloudSqlConnectionName,
        [string]$AutostopJobName,
        [string]$SchedulerJobName
    )

    $settings = [ordered]@{
        ProjectId              = if ($ProjectId) { $ProjectId } else { $env:GCP_PROJECT_ID }
        Region                 = if ($Region) { $Region } elseif ($env:GCP_REGION) { $env:GCP_REGION } else { 'europe-west1' }
        SqlInstance            = if ($SqlInstance) { $SqlInstance } elseif ($env:GCP_SQL_INSTANCE) { $env:GCP_SQL_INSTANCE } else { 'travel-mgr-db' }
        CloudRunService        = if ($CloudRunService) { $CloudRunService } elseif ($env:GCP_CLOUD_RUN_SERVICE) { $env:GCP_CLOUD_RUN_SERVICE } else { 'travel-manager-api' }
        ArtifactRepo           = if ($ArtifactRepo) { $ArtifactRepo } elseif ($env:GCP_ARTIFACT_REPO) { $env:GCP_ARTIFACT_REPO } else { 'travel-manager' }
        ImageName              = if ($ImageName) { $ImageName } elseif ($env:GCP_IMAGE_NAME) { $env:GCP_IMAGE_NAME } else { 'travel-manager-api' }
        AutostopJobName        = if ($AutostopJobName) { $AutostopJobName } elseif ($env:GCP_AUTOSTOP_JOB) { $env:GCP_AUTOSTOP_JOB } else { 'travel-mgr-autostop' }
        SchedulerJobName       = if ($SchedulerJobName) { $SchedulerJobName } elseif ($env:GCP_SCHEDULER_JOB) { $env:GCP_SCHEDULER_JOB } else { 'travel-mgr-autostop-daily' }
        CloudSqlConnectionName = $CloudSqlConnectionName
    }

    if (-not $settings.ProjectId) {
        throw 'GCP project id is required. Pass -ProjectId or set GCP_PROJECT_ID.'
    }

    if (-not $settings.CloudSqlConnectionName) {
        if ($env:GCP_SQL_CONNECTION_NAME) {
            $settings.CloudSqlConnectionName = $env:GCP_SQL_CONNECTION_NAME
        }
        else {
            $settings.CloudSqlConnectionName = "$($settings.ProjectId):$($settings.Region):$($settings.SqlInstance)"
        }
    }

    $settings.ImageUri = "$($settings.Region)-docker.pkg.dev/$($settings.ProjectId)/$($settings.ArtifactRepo)/$($settings.ImageName)"
    return $settings
}

function Get-CloudSqlState {
    param(
        [Parameter(Mandatory)]$Settings
    )
    $result = Invoke-Gcloud -AllowFailure -ArgumentList @(
        'sql', 'instances', 'describe', $Settings.SqlInstance,
        '--project', $Settings.ProjectId,
        '--format=value(state)'
    )
    if ($result.ExitCode -ne 0 -or -not $result.Output) {
        throw "Cloud SQL instance not found: $($Settings.SqlInstance) (project $($Settings.ProjectId))"
    }
    return $result.Output.Trim()
}

function Wait-CloudSqlRunnable {
    param(
        [Parameter(Mandatory)]$Settings,
        [int]$TimeoutSeconds = 600,
        [int]$PollSeconds = 15
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $state = Get-CloudSqlState -Settings $Settings
        Write-Host "Cloud SQL state: $state"
        if ($state -eq 'RUNNABLE') {
            return
        }
        Start-Sleep -Seconds $PollSeconds
    }
    throw "Timed out waiting for Cloud SQL instance $($Settings.SqlInstance) to become RUNNABLE"
}

function Start-GcpCloudSql {
    param([Parameter(Mandatory)]$Settings)

    Assert-CommandExists -Name 'gcloud'
    $state = Get-CloudSqlState -Settings $Settings
    if ($state -eq 'RUNNABLE') {
        Write-Host "Cloud SQL $($Settings.SqlInstance) already RUNNABLE." -ForegroundColor Green
        return
    }

    Write-Host "Starting Cloud SQL $($Settings.SqlInstance) (activation-policy=ALWAYS)..." -ForegroundColor Cyan
    Invoke-Gcloud -ArgumentList @(
        'sql', 'instances', 'patch', $Settings.SqlInstance,
        '--activation-policy=ALWAYS',
        '--project', $Settings.ProjectId,
        '--quiet'
    ) | Out-Null
    Wait-CloudSqlRunnable -Settings $Settings
    Write-Host 'Cloud SQL is RUNNABLE.' -ForegroundColor Green
}

function Stop-GcpCloudSql {
    param([Parameter(Mandatory)]$Settings)

    Assert-CommandExists -Name 'gcloud'
    Write-Host "Stopping Cloud SQL $($Settings.SqlInstance) (activation-policy=NEVER)..." -ForegroundColor Cyan
    Invoke-Gcloud -ArgumentList @(
        'sql', 'instances', 'patch', $Settings.SqlInstance,
        '--activation-policy=NEVER',
        '--project', $Settings.ProjectId,
        '--quiet'
    ) | Out-Null
    Write-Host 'Cloud SQL stop requested (data retained on disk).' -ForegroundColor Green
}

function Set-GcpCloudRunMinInstances {
    param(
        [Parameter(Mandatory)]$Settings,
        [Parameter(Mandatory)][int]$MinInstances
    )

    Assert-CommandExists -Name 'gcloud'
    $exists = Invoke-Gcloud -AllowFailure -ArgumentList @(
        'run', 'services', 'describe', $Settings.CloudRunService,
        '--project', $Settings.ProjectId,
        '--region', $Settings.Region,
        '--format=value(metadata.name)'
    )

    if ($exists.ExitCode -ne 0 -or -not $exists.Output) {
        Write-Host "Cloud Run service $($Settings.CloudRunService) not found; skipping min-instances update." -ForegroundColor Yellow
        return
    }

    Write-Host "Setting Cloud Run $($Settings.CloudRunService) min-instances=$MinInstances..." -ForegroundColor Cyan
    Invoke-Gcloud -ArgumentList @(
        'run', 'services', 'update', $Settings.CloudRunService,
        '--project', $Settings.ProjectId,
        '--region', $Settings.Region,
        '--min-instances', "$MinInstances",
        '--quiet'
    ) | Out-Null
}
