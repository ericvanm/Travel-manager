#Requires -Version 5.1
<#
.SYNOPSIS
  Starts the on-demand GCP environment (Cloud SQL).

.DESCRIPTION
  Sets Cloud SQL activation-policy=ALWAYS and waits until the instance is RUNNABLE.
  Optionally resets Cloud Run min-instances to 0 (scale-to-zero ready).

.PARAMETER ProjectId
  GCP project id (or env GCP_PROJECT_ID).

.PARAMETER Region
  Region (default europe-west1 / GCP_REGION).

.PARAMETER SqlInstance
  Cloud SQL instance name (default travel-mgr-db / GCP_SQL_INSTANCE).

.PARAMETER CloudRunService
  Cloud Run API service name (default travel-manager-api).

.EXAMPLE
  .\tools\gcp-start.ps1 -ProjectId my-gcp-project
#>
[CmdletBinding()]
param(
    [string]$ProjectId,
    [string]$Region,
    [string]$SqlInstance,
    [string]$CloudRunService
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'gcp-common.ps1')

$Settings = Get-GcpSettings `
    -ProjectId $ProjectId `
    -Region $Region `
    -SqlInstance $SqlInstance `
    -CloudRunService $CloudRunService

Write-Host ''
Write-Host "Travel Manager - GCP start ($($Settings.ProjectId))" -ForegroundColor Cyan
Start-GcpCloudSql -Settings $Settings
Set-GcpCloudRunMinInstances -Settings $Settings -MinInstances 0
Write-Host 'GCP environment is ready for deploy / traffic.' -ForegroundColor Green
