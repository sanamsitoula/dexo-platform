<#
.SYNOPSIS
  Start a single Dexo app with reliable file logging.
.EXAMPLE
  .\start-app.ps1 api
  .\start-app.ps1 platform-web
  .\start-app.ps1 tenant-admin
#>
param(
  [string]$App
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$timestamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
$logDir = Join-Path -Path $ProjectRoot -ChildPath "logs\$App"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
$logFile     = Join-Path -Path $logDir -ChildPath "$App-$timestamp.log"
$logFileOut  = "$logFile.out"
$logFileErr  = "$logFile.err"

function Log($msg) {
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Write-Host "[$ts] $msg"
}

# Map app name to port
$port = switch ($App) {
  'api'              { 4000 }
  'platform-web'     { 3001 }
  'platform-admin'   { 3002 }
  'tenant-website'   { 4005 }
  'tenant-admin'     { 4006 }
  'tenant-app'       { 4007 }
  'mobile'           { 8081 }
  'expo-go'          { 8081 }
  default            { 0 }
}

# Kill anything already listening on the port so we get a clean start.
if ($port -gt 0) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Milliseconds 800
}

Log "Starting $App on port $port"
Log "Log file: $logFile.out / $logFile.err"

$Node = (Get-Command node.exe -ErrorAction Stop).Source
$ApiMain    = Join-Path $ProjectRoot 'apps\api\src\main.ts'
$PlatWebDir = Join-Path $ProjectRoot 'apps\platform-web'
$PlatAdmDir = Join-Path $ProjectRoot 'apps\platform-admin'
$TenWebDir  = Join-Path $ProjectRoot 'apps\tenant-website'
$TenAdmDir  = Join-Path $ProjectRoot 'apps\tenant-admin'
$TenAppDir  = Join-Path $ProjectRoot 'apps\tenant-app'
$MobileDir  = Join-Path $ProjectRoot 'apps\mobile'

# Resolve the Next.js binary: prefer the app's own node_modules (so a v14 app
# doesn't get run by the hoisted v13 binary, which causes the 'ppr' crash),
# falling back to the workspace root.
function Get-NextBin([string]$AppDir) {
  $local = Join-Path $AppDir 'node_modules\next\dist\bin\next'
  if (Test-Path -LiteralPath $local) { return $local }
  return Join-Path $ProjectRoot 'node_modules\next\dist\bin\next'
}

# ----------------------------------------------------------------------------
# Build the node command line + working directory for the chosen app.
# We hand the final command to cmd.exe with native `> file 2> file` redirection
# so that node owns the file handles directly. This is critical: PowerShell's
# Start-Process -RedirectStandardOutput pipes output THROUGH PowerShell, so when
# the launcher PowerShell exits (run.bat launches us with `start /MIN`), the
# pipe breaks and the .out/.err files end up empty for long-running processes.
# With cmd redirection the handles are inherited by node and persist for the
# lifetime of the process regardless of what the launcher does.
# ----------------------------------------------------------------------------
$nodeArgs = $null
$workDir  = $ProjectRoot

switch ($App) {
  'api' {
    $nodeArgs = @(
      "`"$ProjectRoot\node_modules\ts-node\dist\bin.js`""
      '--transpile-only'
      "`"$ApiMain`""
    )
  }
  { $_ -in 'platform-web','web' } {
    $workDir  = $PlatWebDir
    $nodeArgs = @("`"$(Get-NextBin $PlatWebDir)`"", 'dev', '-p', '3001')
  }
  { $_ -in 'platform-admin','admin' } {
    $workDir  = $PlatAdmDir
    $nodeArgs = @("`"$(Get-NextBin $PlatAdmDir)`"", 'dev', '-p', '3002')
  }
  'tenant-website' {
    $workDir  = $TenWebDir
    $nodeArgs = @("`"$(Get-NextBin $TenWebDir)`"", 'dev', '-p', '4005')
  }
  'tenant-admin' {
    $workDir  = $TenAdmDir
    $nodeArgs = @("`"$(Get-NextBin $TenAdmDir)`"", 'dev', '-p', '4006')
  }
  'tenant-app' {
    $workDir  = $TenAppDir
    $nodeArgs = @("`"$(Get-NextBin $TenAppDir)`"", 'dev', '-p', '4007')
  }
  'mobile' {
    $workDir  = $MobileDir
    $nodeArgs = @(
      "`"$ProjectRoot\node_modules\expo\bin\cli`""
      'start', '--lan', '--port', '8081', '--no-dev'
    )
  }
  'expo-go' {
    $workDir  = $MobileDir
    $nodeArgs = @(
      "`"$ProjectRoot\node_modules\expo\bin\cli`""
      'start', '--tunnel', '--port', '8081'
    )
  }
  default {
    Log "Unknown app: $App"
    exit 1
  }
}

# Write a tiny per-app runner .cmd that performs the native redirection.
# cmd owns the file handles and stays alive (via /c) until node exits, so the
# handles remain valid even after this PowerShell process terminates.
$argString = $nodeArgs -join ' '
$runnerPath = Join-Path $logDir "$App-runner.cmd"
$runnerLines = @(
  '@echo off'
  "title Dexo $App"
  "`"$Node`" $argString > `"$logFileOut`" 2> `"$logFileErr`""
)
Set-Content -LiteralPath $runnerPath -Value $runnerLines -Encoding ASCII

$proc = Start-Process -FilePath "cmd.exe" `
  -ArgumentList @('/c', "`"$runnerPath`"") `
  -WorkingDirectory $workDir `
  -WindowStyle Hidden `
  -PassThru

# Persist the PID so stop.bat / run.bat can kill the exact process tree later.
$pidFile = Join-Path $logDir "$App.pid"
Set-Content -LiteralPath $pidFile -Value $proc.Id -Encoding ASCII

if ($proc) {
  Log "Started (PID $($proc.Id))"
  Log "Tail: Get-Content '$logFileOut' -Wait"
  Log "Err:  Get-Content '$logFileErr' -Wait"
} else {
  Log "Failed to start $App"
  exit 1
}
