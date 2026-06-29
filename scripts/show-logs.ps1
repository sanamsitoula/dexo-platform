<#
.SYNOPSIS
  List all recent log files across all Dexo services.
.DESCRIPTION
  Shows the most recent log file in each service's log folder with size and last modified time.
#>
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LogRoot = Join-Path $ProjectRoot 'logs'

if (-not (Test-Path $LogRoot)) {
  Write-Host "No logs directory found." -ForegroundColor Red
  exit 1
}

Write-Host ''
Write-Host '═══════════════════════════════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host '  Dexo Logs - Most Recent Files' -ForegroundColor Cyan
Write-Host '═══════════════════════════════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host ''

$services = @('api','web','admin','mobile','expo-go','orchestrator')
foreach ($svc in $services) {
  $dir = Join-Path $LogRoot $svc
  Write-Host ("  [{0}]" -f $svc.ToUpper().PadRight(15)) -ForegroundColor Yellow -NoNewline
  if (Test-Path $dir) {
    $files = Get-ChildItem $dir -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    if ($files.Count -gt 0) {
      $latest = $files[0]
      $sizeKb = [math]::Round($latest.Length / 1KB, 1)
      Write-Host ("  {0} ({1} KB, {2})" -f $latest.Name, $sizeKb, $latest.LastWriteTime.ToString('HH:mm:ss'))
      if ($files.Count -gt 1) {
        Write-Host ("     ...and {0} more" -f ($files.Count - 1)) -ForegroundColor Gray
      }
    } else {
      Write-Host "  (no logs)" -ForegroundColor Gray
    }
  } else {
    Write-Host "  (no directory)" -ForegroundColor Gray
  }
}
Write-Host ''
Write-Host 'Usage:' -ForegroundColor Cyan
Write-Host '  powershell scripts\view-log.ps1 api      # tail API log'
Write-Host '  powershell scripts\view-log.ps1 mobile   # tail mobile log'
Write-Host '  powershell scripts\show-errors.ps1        # show all errors'
Write-Host ''
