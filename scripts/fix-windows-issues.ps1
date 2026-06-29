<#
.SYNOPSIS
  Fix common Windows monorepo issues that break Expo/Turborepo:
  1. Clean up .bin symlinks in nested node_modules (Windows EACCES)
  2. Clear stale turbod pid files
  3. Clean Metro cache
#>
$ErrorActionPreference = 'Continue'

$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Dexo - Windows Monorepo Fix" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 1. Clean .bin symlinks in nested node_modules
Write-Host "[1/3] Cleaning .bin symlinks in nested node_modules..." -ForegroundColor Yellow
$root = Join-Path $ProjectRoot 'node_modules'
$count = 0
if (Test-Path $root) {
  Get-ChildItem $root -Recurse -Directory -Filter '.bin' -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -like '*\node_modules\node_modules\.bin' } |
    ForEach-Object {
      Get-ChildItem $_.FullName -Force -ErrorAction SilentlyContinue | ForEach-Object {
        try { Remove-Item $_.FullName -Force -Recurse -ErrorAction Stop; $count++ } catch {}
      }
    }
}
Write-Host "      Removed $count stale .bin entries" -ForegroundColor Green

# 2. Clear stale turbod pid files
Write-Host "[2/3] Clearing stale turbod pid files..." -ForegroundColor Yellow
$turbodDir = Join-Path $env:TEMP 'turbod'
$pidCount = 0
if (Test-Path $turbodDir) {
  Get-ChildItem $turbodDir -Recurse -Filter '*.pid' -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
    $pidCount++
  }
}
Write-Host "      Removed $pidCount stale pid files" -ForegroundColor Green

# 3. Clean Metro cache
Write-Host "[3/3] Cleaning Metro cache..." -ForegroundColor Yellow
$cacheDirs = @(
  "$env:TEMP\metro-*",
  "$env:LOCALAPPDATA\metro-cache",
  (Join-Path $ProjectRoot 'apps\mobile\.expo'),
  (Join-Path $ProjectRoot 'apps\mobile\node_modules\.cache')
)
$cacheCount = 0
foreach ($pattern in $cacheDirs) {
  Get-ChildItem $pattern -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    $cacheCount++
  }
  Get-ChildItem $pattern -File -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
    $cacheCount++
  }
}
Write-Host "      Cleared $cacheCount cache entries" -ForegroundColor Green

Write-Host ""
Write-Host "Done. You can now run run.bat or scripts\start-all.ps1" -ForegroundColor Green
Write-Host ""
