#Requires -Version 5.1
<#
.SYNOPSIS
  Creates/updates the daily Cloud SQL auto-stop (Cloud Run Job + Cloud Scheduler).

.DESCRIPTION
  FinOps safety net for the on-demand GCP environment:
  - Cloud Run Job (google-cloud-cli) stops Cloud SQL (NEVER) and sets Cloud Run min-instances=0
  - Cloud Scheduler triggers that job every day at 22:00 Europe/Paris

  Requires gcloud auth with permissions to create Run jobs, Scheduler jobs, and IAM bindings.

.PARAMETER ProjectId
  GCP project id (or env GCP_PROJECT_ID).

.PARAMETER SchedulerServiceAccount
  Service account email used by Scheduler to invoke the Cloud Run Job.
  Defaults to the Compute Engine default SA for the project.

.EXAMPLE
  .\tools\gcp-setup-autostop.ps1 -ProjectId my-gcp-project
#>
[CmdletBinding()]
param(
    [string]$ProjectId,
    [string]$Region,
    [string]$SqlInstance,
    [string]$CloudRunService,
    [string]$AutostopJobName,
    [string]$SchedulerJobName,
    [string]$SchedulerServiceAccount
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'gcp-common.ps1')

$Settings = Get-GcpSettings `
    -ProjectId $ProjectId `
    -Region $Region `
    -SqlInstance $SqlInstance `
    -CloudRunService $CloudRunService `
    -AutostopJobName $AutostopJobName `
    -SchedulerJobName $SchedulerJobName

Assert-CommandExists -Name 'gcloud'

Write-Host ''
Write-Host "Travel Manager - GCP autostop setup ($($Settings.ProjectId))" -ForegroundColor Cyan

$projectNumberResult = Invoke-Gcloud -ArgumentList @(
    'projects', 'describe', $Settings.ProjectId,
    '--format=value(projectNumber)'
)
$projectNumber = $projectNumberResult.Output.Trim()

if (-not $SchedulerServiceAccount) {
    if ($env:GCP_SCHEDULER_SA) {
        $SchedulerServiceAccount = $env:GCP_SCHEDULER_SA
    }
    else {
        $SchedulerServiceAccount = "$projectNumber-compute@developer.gserviceaccount.com"
    }
}

# Use YAML replace to avoid PowerShell/gcloud --args quoting bugs on Windows.
$containerCommand = @(
    'set +e'
    "gcloud sql instances patch $($Settings.SqlInstance) --activation-policy=NEVER --project=$($Settings.ProjectId) --quiet"
    "gcloud run services update $($Settings.CloudRunService) --project=$($Settings.ProjectId) --region=$($Settings.Region) --min-instances=0 --quiet"
    'echo autostop_ok'
) -join '; '

# JSON-escape then wrap as YAML double-quoted scalar (safe for :, |, etc.)
$containerCommandYaml = '"' + ($containerCommand `
    -replace '\\', '\\' `
    -replace '"', '\"') + '"'

$jobYaml = @"
apiVersion: run.googleapis.com/v1
kind: Job
metadata:
  name: $($Settings.AutostopJobName)
spec:
  template:
    spec:
      template:
        spec:
          serviceAccountName: $SchedulerServiceAccount
          timeoutSeconds: 900
          maxRetries: 1
          containers:
          - name: autostop
            image: gcr.io/google.com/cloudsdktool/google-cloud-cli:slim
            command:
            - bash
            - -c
            - $containerCommandYaml
            env:
            - name: CLOUDSDK_CORE_PROJECT
              value: $($Settings.ProjectId)
"@

$jobFile = Join-Path ([System.IO.Path]::GetTempPath()) ("travelmgr-autostop-job-{0}.yaml" -f [guid]::NewGuid().ToString('N'))
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($jobFile, $jobYaml, $utf8NoBom)

Write-Host "Creating/updating Cloud Run Job $($Settings.AutostopJobName)..." -ForegroundColor Cyan
try {
    Invoke-Gcloud -ArgumentList @(
        'run', 'jobs', 'replace', $jobFile,
        '--project', $Settings.ProjectId,
        '--region', $Settings.Region,
        '--quiet'
    ) | Out-Null
}
finally {
    Remove-Item -LiteralPath $jobFile -Force -ErrorAction SilentlyContinue
}

Write-Host "Granting Scheduler SA run.invoker on job ($SchedulerServiceAccount)..." -ForegroundColor Cyan
Invoke-Gcloud -ArgumentList @(
    'run', 'jobs', 'add-iam-policy-binding', $Settings.AutostopJobName,
    '--project', $Settings.ProjectId,
    '--region', $Settings.Region,
    '--member', "serviceAccount:$SchedulerServiceAccount",
    '--role', 'roles/run.invoker',
    '--quiet'
) | Out-Null

$schedulerExists = Invoke-Gcloud -AllowFailure -ArgumentList @(
    'scheduler', 'jobs', 'describe', $Settings.SchedulerJobName,
    '--project', $Settings.ProjectId,
    '--location', $Settings.Region,
    '--format=value(name)'
)

$uri = "https://$($Settings.Region)-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/$projectNumber/jobs/$($Settings.AutostopJobName):run"

Write-Host "Creating/updating Cloud Scheduler $($Settings.SchedulerJobName) (22:00 Europe/Paris)..." -ForegroundColor Cyan
$schedulerArgs = @(
    '--project', $Settings.ProjectId,
    '--location', $Settings.Region,
    '--schedule', '0 22 * * *',
    '--time-zone', 'Europe/Paris',
    '--uri', $uri,
    '--http-method', 'POST',
    '--oauth-service-account-email', $SchedulerServiceAccount,
    '--oauth-token-scope', 'https://www.googleapis.com/auth/cloud-platform',
    '--quiet'
)

if ($schedulerExists.ExitCode -eq 0 -and $schedulerExists.Output) {
    Invoke-Gcloud -ArgumentList (@('scheduler', 'jobs', 'update', 'http', $Settings.SchedulerJobName) + $schedulerArgs) | Out-Null
}
else {
    Invoke-Gcloud -ArgumentList (@('scheduler', 'jobs', 'create', 'http', $Settings.SchedulerJobName) + $schedulerArgs) | Out-Null
}

Write-Host ''
Write-Host 'Autostop configured:' -ForegroundColor Green
Write-Host "  Job:       $($Settings.AutostopJobName)"
Write-Host "  Scheduler: $($Settings.SchedulerJobName) @ 22:00 Europe/Paris"
Write-Host "  SA:        $SchedulerServiceAccount"
Write-Host "Manual test: gcloud scheduler jobs run $($Settings.SchedulerJobName) --project=$($Settings.ProjectId) --location=$($Settings.Region)" -ForegroundColor Yellow
