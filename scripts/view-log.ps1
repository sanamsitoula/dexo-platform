<#
.SYNOPSIS
  Tail the most recent log for a Dexo service in real time.
.DESCRIPTION
  Resolves the single latest log file for a service and tails it with
  Get-Content -Wait -Tail (works on Windows PowerShell 5.1 and 7+).
  Use -Err to tail the error log (.err) instead of stdout (.out/.log).
.EXAMPLE
  .\view-log.ps1 api
  .\view-log.ps1 platform-web
  .\view-log.ps1 api -Err
  .\view-log.ps1 tenant-admin -Tail 100
#>
param(
  [Parameter(Mandatory=$true, Position=0)]
  [string]$Service,
  [switch]$Err,
  [int]$Tail = 50
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot

# Map friendly aliases to the real log directory names under logs\
$aliasMap = @{
  'web'           = 'platform-web'
  'platform-web'  = 'platform-web'
  'admin'         = 'platform-admin'
  'platform-admin'= 'platform-admin'
  'tenant-web'    = 'tenant-website'
  'tenant-website'= 'tenant-website'
  'tenant-admin'  = 'tenant-admin'
  'tenant-app'    = 'tenant-app'
  'api'           = 'api'
  'mobile'        = 'mobile'
  'expo'          = 'expo-go'
  'expo-go'       = 'expo-go'
  'orchestrator'  = 'orchestrator'
  'docker'        = 'orchestrator'
}

$dirName = $aliasMap[$Service]
if (-not $dirName) {
  # Fallback: assume the user typed the exact directory name
  $dirName = $Service
}

$LogDir = Join-Path $ProjectRoot "logs\$dirName"

if (-not (Test-Path $LogDir)) {
  Write-Host "No log directory found for service '$Service' (looked in: $LogDir)" -ForegroundColor Red
  Write-Host "Known services: $($aliasMap.Keys -join ', ')" -ForegroundColor Gray
  exit 1
}

# Prefer .err files when -Err is set, otherwise prefer .out/.log
$files = Get-ChildItem $LogDir -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
if (-not $files) {
  Write-Host "No log files found in $LogDir" -ForegroundColor Yellow
  exit 1
}

$preferred = if ($Err) {
  $files | Where-Object { $_.Extension -eq '.err' } | Select-Object -First 1
} else {
  $files | Where-Object { $_.Extension -in '.out','.log' } | Select-Object -First 1
}
$latest = if ($preferred) { $preferred } else { $files | Select-Object -First 1 }

Write-Host "Service : $Service" -ForegroundColor Cyan
Write-Host "Tailing : $($latest.FullName)" -ForegroundColor Cyan
Write-Host "Mode    : $(if ($Err) {'errors'} else {'stdout'})  |  Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

try {
  Get-Content -LiteralPath $latest.FullName -Wait -Tail $Tail -ErrorAction Stop
} catch {
  Write-Host "Could not tail file: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Open it manually: $($latest.FullName)" -ForegroundColor Gray
  exit 1
}
