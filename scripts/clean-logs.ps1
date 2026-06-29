<#
.SYNOPSIS
  Clean up old Dexo log files, keeping only the most recent N files per service.
.DESCRIPTION
  Defaults to keeping the last 10 files. Use -Keep parameter to change.
.EXAMPLE
  .\clean-logs.ps1           # keep last 10 logs
  .\clean-logs.ps1 -Keep 5  # keep last 5 logs
#>
param(
  [int]$Keep = 10
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LogRoot = Join-Path $ProjectRoot 'logs'

$totalRemoved = 0
$totalKept = 0
$totalSize = 0

$services = Get-ChildItem $LogRoot -Directory -ErrorAction SilentlyContinue
foreach ($svc in $services) {
  $files = Get-ChildItem $svc.FullName -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
  $toKeep = $files | Select-Object -First $Keep
  $toRemove = $files | Select-Object -Skip $Keep

  foreach ($f in $toKeep) { $totalKept++; $totalSize += $f.Length }
  foreach ($f in $toRemove) {
    Remove-Item $f.FullName -Force
    $totalRemoved++
  }
}

$totalSizeMb = [math]::Round($totalSize / 1MB, 2)
Write-Host ""
Write-Host "Cleaned $totalRemoved old log files. Kept $totalKept recent files ($totalSizeMb MB)." -ForegroundColor Green
Write-Host ""
