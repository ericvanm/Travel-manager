#Requires -Version 5.1
<#
.SYNOPSIS
  Stops the on-demand GCP environment to save cost (FinOps).

.DESCRIPTION
  Sets Cloud Run min-instances=0 and Cloud SQL activation-policy=NEVER.
  Disk data is retained; only compute is stopped.

.PARAMETER ProjectId
  GCP project id (or env GCP_PROJECT_ID).

.PARAMETER Region
  Region (default europe-west1 / GCP_REGION).

.PARAMETER SqlInstance
  Cloud SQL instance name (default travel-mgr-db / GCP_SQL_INSTANCE).

.PARAMETER CloudRunService
  Cloud Run API service name (default travel-manager-api).

.EXAMPLE
  .\tools\gcp-stop.ps1 -ProjectId my-gcp-project
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
Write-Host "Travel Manager - GCP stop ($($Settings.ProjectId))" -ForegroundColor Cyan
Set-GcpCloudRunMinInstances -Settings $Settings -MinInstances 0
Stop-GcpCloudSql -Settings $Settings
Write-Host 'GCP environment stopped (Cloud SQL compute off).' -ForegroundColor Green
