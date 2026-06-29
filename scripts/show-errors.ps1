<#
.SYNOPSIS
  Show only the ERROR and WARN lines from all Dexo log files (most recent run).
.DESCRIPTION
  Filters out only the lines containing error/warn/exception/fail/denied patterns
  from the latest log file in each service folder.
#>
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LogRoot = Join-Path $ProjectRoot 'logs'

$services = @('api','web','admin','mobile','expo-go','orchestrator')
$patterns = 'error|warn|exception|fail|denied|cannot|EACCES|ELIFECYCLE|unhandled'

Write-Host ''
Write-Host '═══════════════════════════════════════════════════════════════════════' -ForegroundColor Red
Write-Host '  Dexo - Errors and Warnings (latest run)' -ForegroundColor Red
Write-Host '═══════════════════════════════════════════════════════════════════════' -ForegroundColor Red
Write-Host ''

$foundAny = $false
foreach ($svc in $services) {
  $dir = Join-Path $LogRoot $svc
  if (Test-Path $dir) {
    $latest = Get-ChildItem $dir -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latest) {
      $matches = Select-String -Path $latest.FullName -Pattern $patterns -CaseSensitive:$false -ErrorAction SilentlyContinue
      if ($matches) {
        $foundAny = $true
        Write-Host ("─── {0} ({1}) ───" -f $svc.ToUpper(), $latest.Name) -ForegroundColor Yellow
        foreach ($m in $matches) {
          $color = if ($m.Line -match 'error|exception|fail|denied|EACCES|unhandled') { 'Red' } else { 'Yellow' }
          Write-Host ("  [{0}:{1}] {2}" -f $m.LineNumber, $svc, $m.Line.Trim()) -ForegroundColor $color
        }
        Write-Host ''
      }
    }
  }
}

if (-not $foundAny) {
  Write-Host '  No errors or warnings found in the most recent logs.' -ForegroundColor Green
  Write-Host ''
}
