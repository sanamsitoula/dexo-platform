<#
.SYNOPSIS
  Start a single Dexo app with logging.
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
$logFile = Join-Path -Path $logDir -ChildPath "$App-$timestamp.log"

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
if ($port -gt 0) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Milliseconds 500
}

Log "Starting $App on port $port"
Log "Log file: $logFile"

$Node = (Get-Command node.exe).Source
$ApiMain    = Join-Path $ProjectRoot 'apps\api\src\main.ts'
$PlatWebDir = Join-Path $ProjectRoot 'apps\platform-web'
$PlatAdmDir = Join-Path $ProjectRoot 'apps\platform-admin'
$TenWebDir  = Join-Path $ProjectRoot 'apps\tenant-website'
$TenAdmDir  = Join-Path $ProjectRoot 'apps\tenant-admin'
$TenAppDir  = Join-Path $ProjectRoot 'apps\tenant-app'
$MobileDir  = Join-Path $ProjectRoot 'apps\mobile'

$logFileOut = "$logFile.out"
$logFileErr = "$logFile.err"

switch ($App) {
  'api' {
    $proc = Start-Process -FilePath $Node -ArgumentList @(
      "$ProjectRoot\node_modules\ts-node\dist\bin.js"
      '--transpile-only'
      $ApiMain
    ) -WorkingDirectory $ProjectRoot -RedirectStandardOutput $logFileOut -RedirectStandardError $logFileErr -PassThru -WindowStyle Hidden
  }
  { $_ -in 'platform-web','web' } {
    $proc = Start-Process -FilePath $Node -ArgumentList @(
      "$ProjectRoot\node_modules\next\dist\bin\next"
      'dev'
      '-p', '3001'
    ) -WorkingDirectory $PlatWebDir -RedirectStandardOutput $logFileOut -RedirectStandardError $logFileErr -PassThru -WindowStyle Hidden
  }
  { $_ -in 'platform-admin','admin' } {
    $proc = Start-Process -FilePath $Node -ArgumentList @(
      "$ProjectRoot\node_modules\next\dist\bin\next"
      'dev'
      '-p', '3002'
    ) -WorkingDirectory $PlatAdmDir -RedirectStandardOutput $logFileOut -RedirectStandardError $logFileErr -PassThru -WindowStyle Hidden
  }
  'tenant-website' {
    $proc = Start-Process -FilePath $Node -ArgumentList @(
      "$ProjectRoot\node_modules\next\dist\bin\next"
      'dev'
      '-p', '4005'
    ) -WorkingDirectory $TenWebDir -RedirectStandardOutput $logFileOut -RedirectStandardError $logFileErr -PassThru -WindowStyle Hidden
  }
  'tenant-admin' {
    $proc = Start-Process -FilePath $Node -ArgumentList @(
      "$ProjectRoot\node_modules\next\dist\bin\next"
      'dev'
      '-p', '4006'
    ) -WorkingDirectory $TenAdmDir -RedirectStandardOutput $logFileOut -RedirectStandardError $logFileErr -PassThru -WindowStyle Hidden
  }
  'tenant-app' {
    $proc = Start-Process -FilePath $Node -ArgumentList @(
      "$ProjectRoot\node_modules\next\dist\bin\next"
      'dev'
      '-p', '4007'
    ) -WorkingDirectory $TenAppDir -RedirectStandardOutput $logFileOut -RedirectStandardError $logFileErr -PassThru -WindowStyle Hidden
  }
  'mobile' {
    $proc = Start-Process -FilePath $Node -ArgumentList @(
      "$ProjectRoot\node_modules\expo\bin\cli"
      'start',
      '--lan',
      '--port', '8081',
      '--no-dev'
    ) -WorkingDirectory $MobileDir -RedirectStandardOutput $logFileOut -RedirectStandardError $logFileErr -PassThru -WindowStyle Hidden
  }
  'expo-go' {
    $proc = Start-Process -FilePath $Node -ArgumentList @(
      "$ProjectRoot\node_modules\expo\bin\cli"
      'start',
      '--tunnel',
      '--port', '8081'
    ) -WorkingDirectory $MobileDir -RedirectStandardOutput $logFileOut -RedirectStandardError $logFileErr -PassThru -WindowStyle Hidden
  }
}

if ($proc) {
  Log "Started (PID $($proc.Id))"
  Log "Tail: Get-Content '$logFileOut' -Wait"
  Log "Err:  Get-Content '$logFileErr' -Wait"
} else {
  Log "Unknown app: $App"
  exit 1
}
