<#
.SYNOPSIS
  View the most recent log for a Dexo service.
.DESCRIPTION
  Pass a service name (api, web, admin, mobile, expo-go, orchestrator) to view
  the most recent log file in tail mode.
.EXAMPLE
  .\view-log.ps1 api
  .\view-log.ps1 mobile
#>
param(
  [Parameter(Mandatory=$true)]
  [ValidateSet('api','web','admin','mobile','expo-go','orchestrator','docker')]
  [string]$Service
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $ProjectRoot 'logs' $Service

if (-not (Test-Path $LogDir)) {
  Write-Host "No log directory found: $LogDir" -ForegroundColor Red
  exit 1
}

$latest = Get-ChildItem $LogDir -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $latest) {
  Write-Host "No log files found in $LogDir" -ForegroundColor Yellow
  exit 1
}

Write-Host "Tailing: $($latest.FullName)" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""
Get-Content $latest.FullName -Wait
