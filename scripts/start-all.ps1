<#
.DESCRIPTION
  Dexo Master Orchestrator - Starts all apps with proper logging.
  Each app's logs go to /logs/<app>/<app>-<timestamp>.log
.NOTES
  Run from the Dexo root directory.
#>

param(
  [switch]$ApiOnly,
  [switch]$WebOnly,
  [switch]$AdminOnly,
  [switch]$MobileOnly,
  [switch]$Help
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$timestamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
$LogRoot = Join-Path $ProjectRoot 'logs'
$OrchestratorLog = Join-Path $LogRoot 'orchestrator' "orchestrator-$timestamp.log"

# Ensure log dirs exist
@('api', 'web', 'admin', 'mobile', 'expo-go', 'orchestrator') | ForEach-Object {
  $dir = Join-Path $LogRoot $_
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
}

function Write-Log {
  param([string]$Message, [string]$Level = 'INFO')
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  $line = "[$ts] [$Level] $Message"
  Add-Content -Path $OrchestratorLog -Value $line
  Write-Host $line
}

function Start-App {
  param(
    [string]$Name,
    [string]$WorkDir,
    [string]$Command,
    [string]$Args = '',
    [int]$WaitSeconds = 0
  )

  $logFile = Join-Path $LogRoot $Name "$Name-$timestamp.log"
  Write-Log "Starting $Name (logs → $logFile)"

  # Use Start-Process to fully detach the child process
  $startArgs = @{
    FilePath = 'cmd.exe'
    ArgumentList = @('/c', "cd /d `"$WorkDir`" && $Command $Args > `"$logFile`" 2>&1")
    WindowStyle = 'Hidden'
    PassThru = $true
    RedirectStandardOutput = $logFile
    RedirectStandardError = $logFile
  }
  $proc = Start-Process @startArgs -ErrorAction SilentlyContinue

  if ($proc) {
    Write-Log "✓ $Name started (PID $($proc.Id))"
  } else {
    Write-Log "✗ $Name failed to start" 'ERROR'
  }

  if ($WaitSeconds -gt 0) {
    Start-Sleep -Seconds $WaitSeconds
  }

  return $proc
}

function Show-Header {
  Write-Host ''
  Write-Host '╔══════════════════════════════════════════════════════════════╗' -ForegroundColor Cyan
  Write-Host '║           Dexo Platform - Master Orchestrator                ║' -ForegroundColor Cyan
  Write-Host '╚══════════════════════════════════════════════════════════════╝' -ForegroundColor Cyan
  Write-Host ''
  Write-Host "  Project: $ProjectRoot" -ForegroundColor Gray
  Write-Host "  Session: $timestamp" -ForegroundColor Gray
  Write-Host "  Logs:    $LogRoot" -ForegroundColor Gray
  Write-Host ''
}

function Show-Help {
  Write-Host 'Usage: .\start-all.ps1 [options]'
  Write-Host ''
  Write-Host 'Options:'
  Write-Host '  -ApiOnly     Start only the API server'
  Write-Host '  -WebOnly     Start only the web platform'
  Write-Host '  -AdminOnly   Start only the admin console'
  Write-Host '  -MobileOnly  Start only the mobile app (Expo)'
  Write-Host '  -Help        Show this help'
  Write-Host ''
  Write-Host 'Default: starts all apps'
  exit 0
}

if ($Help) { Show-Help }

Show-Header

$startApi = -not ($WebOnly -or $AdminOnly -or $MobileOnly)
$startWeb = -not ($ApiOnly -or $AdminOnly -or $MobileOnly)
$startAdmin = -not ($ApiOnly -or $WebOnly -or $MobileOnly)
$startMobile = -not ($ApiOnly -or $WebOnly -or $AdminOnly)

# Clear stale turbo pid files
$turbodDir = Join-Path $env:TEMP 'turbod'
if (Test-Path $turbodDir) {
  Get-ChildItem $turbodDir -Recurse -Filter '*.pid' -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
  }
  Write-Log "Cleared stale turbo pid files"
}

# 1. API Server
if ($startApi) {
  Start-App -Name 'api' -WorkDir $ProjectRoot -Command 'npx ts-node' -Args '--transpile-only apps/api/src/main.ts' -WaitSeconds 18
}

# 2. Web Platform (port 3000)
if ($startWeb) {
  Start-App -Name 'web' -WorkDir "$ProjectRoot/apps/web" -Command 'npx next dev' -Args '-p 3000' -WaitSeconds 12
}

# 3. Admin Console (port 3001)
if ($startAdmin) {
  Start-App -Name 'admin' -WorkDir "$ProjectRoot/apps/admin" -Command 'npx next dev' -Args '-p 3001' -WaitSeconds 12
}

# 4. Mobile (Expo)
if ($startMobile) {
  Start-App -Name 'mobile' -WorkDir "$ProjectRoot/apps/mobile" -Command 'npx expo start' -Args '--lan --port 8081 --clear' -WaitSeconds 25
}

Write-Host ''
Write-Host '════════════════════════════════════════════════════════════════' -ForegroundColor Green
Write-Host '  All apps started! Logs are in /logs/' -ForegroundColor Green
Write-Host '════════════════════════════════════════════════════════════════' -ForegroundColor Green
Write-Host ''
Write-Host 'Useful commands:' -ForegroundColor Yellow
Write-Host '  View latest API log:    Get-Content logs\api\api-*.log -Wait'
Write-Host '  View latest Admin log:  Get-Content logs\admin\admin-*.log -Wait'
Write-Host '  View latest Mobile log: Get-Content logs\mobile\mobile-*.log -Wait'
Write-Host '  Show all errors:        powershell scripts\show-errors.ps1'
Write-Host ''
Write-Host 'URLs:' -ForegroundColor Cyan
Write-Host '  API:        http://localhost:4000/api/docs'
Write-Host '  Web:        http://localhost:3000'
Write-Host '  Admin:      http://localhost:3001'
Write-Host '  Mobile:     Scan QR with Expo Go (LAN mode)'
Write-Host ''
