@echo off
REM ============================================================================
REM  run-debug.bat  -  Dexo diagnostic launcher
REM ============================================================================
REM  Unlike run.bat (which hides apps in minimized windows), this launcher shows
REM  every real error. Four modes:
REM
REM    run-debug.bat              Start ALL services one-at-a-time, health-check
REM                               each before starting the next. Stop on first
REM                               failure and print the error log inline.
REM    run-debug.bat api          Start ONE service in the FOREGROUND with live
REM                               logs (Ctrl+C to stop). Great for isolating one
REM                               failing app. Valid: api platform-web platform-
REM                               admin tenant-website tenant-admin tenant-app mobile
REM    run-debug.bat diag         Diagnostic report only (no services started).
REM    run-debug.bat stop         Stop everything + free ports.
REM
REM  Each started app runs in a VISIBLE window so you can watch it boot.
REM ============================================================================

setlocal enabledelayedexpansion
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

set "MODE=all"
if not "%~1"=="" set "MODE=%~1"

set "FAILED=0"
set "STARTED_COUNT=0"

echo.
echo ====================================================================
echo   Dexo DEBUG launcher   (mode: %MODE%)
echo ====================================================================
echo.

REM ---- Always run the diagnostic snapshot first --------------------------
call :diagnostic_report

if /i "%MODE%"=="diag" (
  echo.
  echo Diagnostic only - no services started.
  goto :end
)
if /i "%MODE%"=="stop" goto :stop_all

if /i "%MODE%"=="all" goto :start_all

REM ---- Single-service foreground mode ------------------------------------
call :single_foreground "%MODE%"
goto :end

:start_all
echo.
echo --------------------------------------------------------------------
echo  Starting services one at a time (stop on first failure)
echo --------------------------------------------------------------------
echo.

call :start_and_wait "API Server"      api             4000  "http://localhost:4000/api/health"
if !FAILED! EQU 1 goto :abort
call :start_and_wait "Platform Web"    platform-web    3001  "http://localhost:3001"
if !FAILED! EQU 1 goto :abort
call :start_and_wait "Platform Admin"  platform-admin  3002  "http://localhost:3002"
if !FAILED! EQU 1 goto :abort
call :start_and_wait "Tenant Website"  tenant-website  4005  "http://localhost:4005"
if !FAILED! EQU 1 goto :abort
call :start_and_wait "Tenant Admin"    tenant-admin    4006  "http://localhost:4006"
if !FAILED! EQU 1 goto :abort
call :start_and_wait "Tenant App"      tenant-app      4007  "http://localhost:4007"
if !FAILED! EQU 1 goto :abort
call :start_and_wait "Mobile (Expo)"   mobile          8081  "http://localhost:8081"
if !FAILED! EQU 1 goto :abort

echo.
echo ====================================================================
echo   All %STARTED_COUNT% services came up healthy.
echo   Windows are visible - close them to stop individual services.
echo   Or run: run-debug.bat stop
echo ====================================================================
echo.
goto :end

:abort
echo.
echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
echo   ABORTED - a service failed to start. See its error log above.
echo   Services that DID start are still running in their windows.
echo   Run: run-debug.bat stop   to clean up.
echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
echo.
goto :end

REM ===========================================================================
:stop_all
echo Stopping all Dexo node processes + freeing ports...
if exist stop.bat (
  call stop.bat
) else (
  for %%P in (3001 3002 4000 4005 4006 4007 8081) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%%P " ^| findstr "LISTENING" 2^>nul') do (
      taskkill /PID %%a /T /F >nul 2>nul
    )
  )
)
goto :end

REM ===========================================================================
REM  subroutine: diagnostic_report
REM  Prints env, versions, docker, port availability, prisma status, processes
REM ===========================================================================
:diagnostic_report
echo [DIAG] Environment snapshot
echo       date      : %date% %time%
echo       directory : %PROJECT_ROOT%
for /f "delims=" %%v in ('node --version 2^>nul') do echo       node     : %%v
for /f "delims=" %%v in ('npm --version 2^>nul')  do echo       npm      : %%v
where turbo >nul 2>nul && (for /f "delims=" %%v in ('turbo --version 2^>nul') do echo       turbo    : %%v) || echo       turbo    : not on PATH

echo.
echo [DIAG] Docker
docker info >nul 2>nul
if !ERRORLEVEL! NEQ 0 (
  echo       ! Docker Desktop is NOT running - API will fail DB connection.
) else (
  for %%c in (dexo-postgres dexo-redis dexo-minio dexo-mailhog) do (
    docker ps --filter "name=%%c" --format "{{.Names}}" 2>nul | findstr "%%c" >nul
    if !ERRORLEVEL! EQU 0 (
      echo       %%c  : UP
    ) else (
      echo       %%c  : DOWN   ^(run.bat or docker-compose up -d starts it^)
    )
  )
)

echo.
echo [DIAG] Port availability
powershell -NoProfile -Command ^
  "$ports = @(4000,3001,3002,4005,4006,4007,8081,5433,6379,9000,8025); $names = @{4000='api';3001='platform-web';3002='platform-admin';4005='tenant-website';4006='tenant-admin';4007='tenant-app';8081='mobile';5433='postgres';6379='redis';9000='minio';8025='mailhog'}; foreach ($p in $ports) { $c = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($c) { $proc = (Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue).ProcessName; '{0,7}  :{1,-5}  PID {2} ({3})' -f 'IN USE',$p,$c.OwningProcess,$proc } else { '{0,7}  :{1,-5}  {2}' -f 'free',$p,$names[$p] } }"

echo.
echo [DIAG] Prisma
if exist "node_modules\.prisma\client" (
  echo       client   : generated
) else (
  echo       client   : MISSING - run: npx prisma generate
)
if exist ".env" (
  echo       .env     : present
) else (
  echo       .env     : MISSING - run: copy .env.example .env
)

echo.
echo [DIAG] Node process count
for /f %%c in ('tasklist /FI "IMAGENAME eq node.exe" 2^>nul ^| find /c "node.exe"') do set "_n=%%c"
echo       node.exe processes: !_n!
echo.
goto :eof

REM ===========================================================================
REM  subroutine: start_and_wait  <label> <app> <port> <healthUrl>
REM  Starts the app in a VISIBLE window, polls health, aborts on failure.
REM ===========================================================================
:start_and_wait
set "_label=%~1"
set "_app=%~2"
set "_port=%~3"
set "_url=%~4"
set "FAILED=0"

echo [START] !_label!  (app=!_app!, port=!_port!)
start "Dexo !_label! [DEBUG]" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-app.ps1" -App !_app!

echo        waiting for !_label! to become healthy ...
set "_tries=0"
:health_loop
set /a "_tries+=1"
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri '%_url%' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if !ERRORLEVEL! EQU 0 goto :health_ok
if !_tries! GEQ 30 goto :health_fail
timeout /t 2 /nobreak >nul
goto :health_loop

:health_ok
echo        [OK] !_label! healthy after !_tries! poll^(s^).
set /a "STARTED_COUNT+=1"
echo.
goto :eof

:health_fail
set "FAILED=1"
echo        [FAIL] !_label! did NOT become healthy after !_tries! tries.
echo        ----- error log tail -----
set "_errlog="
for /f "delims=" %%f in ('dir /b /o-d "logs\!_app!\*.log.err" 2^>nul') do if not defined _errlog set "_errlog=logs\!_app!\%%f"
set "_outlog="
for /f "delims=" %%f in ('dir /b /o-d "logs\!_app!\*.log.out" 2^>nul') do if not defined _outlog set "_outlog=logs\!_app!\%%f"
if defined _errlog if exist "!_errlog!" powershell -NoProfile -Command "Get-Content -LiteralPath '!_errlog!' -Tail 20 -ErrorAction SilentlyContinue"
if defined _outlog if exist "!_outlog!" powershell -NoProfile -Command "Get-Content -LiteralPath '!_outlog!' -Tail 10 -ErrorAction SilentlyContinue"
echo        ----- end log -----
echo        [TIP] Full log: !_outlog!  ^|  Tail live: powershell -File scripts\view-log.ps1 !_app! -Err
echo.
goto :eof

REM ===========================================================================
REM  subroutine: single_foreground  <app>
REM  Runs ONE app in the foreground with live logs so a crash prints immediately.
REM ===========================================================================
:single_foreground
set "_app=%~1"

REM Validate app name + resolve port + url
set "_port=0"
if /i "!_app!"=="api"             set "_port=4000" & set "_url=http://localhost:4000/api/health"
if /i "!_app!"=="platform-web"    set "_port=3001" & set "_url=http://localhost:3001"
if /i "!_app!"=="platform-admin"  set "_port=3002" & set "_url=http://localhost:3002"
if /i "!_app!"=="tenant-website"  set "_port=4005" & set "_url=http://localhost:4005"
if /i "!_app!"=="tenant-admin"    set "_port=4006" & set "_url=http://localhost:4006"
if /i "!_app!"=="tenant-app"      set "_port=4007" & set "_url=http://localhost:4007"
if /i "!_app!"=="mobile"          set "_port=8081" & set "_url=http://localhost:8081"
if !_port!==0 (
  echo [ERROR] Unknown app: !_app!
  echo         Valid: api platform-web platform-admin tenant-website tenant-admin tenant-app mobile
  goto :eof
)

echo [DEBUG] Single-service foreground mode: !_app!  (port !_port!)
echo         The app boots and its log streams below. Ctrl+C to stop.
echo.

REM Free the port first, then start via start-app.ps1, then tail the log live.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-NetTCPConnection -LocalPort !_port! -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Start-Sleep -Milliseconds 500"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-app.ps1" -App !_app!

REM Tail the newest out log live; Ctrl+C stops only the tail (the app keeps running hidden).
for /f "delims=" %%f in ('dir /b /o-d "logs\!_app!\*.log.out" 2^>nul') do set "_live=logs\!_app!\%%f"
if exist "!_live!" (
  echo.
  echo [TAIL] !_live!   ^(Ctrl+C to stop tailing; app keeps running^)
  echo         error stream: powershell -File scripts\view-log.ps1 !_app! -Err
  echo.
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -LiteralPath '!_live!' -Wait -ErrorAction SilentlyContinue"
) else (
  echo [WARN] No log file found yet.
)
goto :eof

:end
echo.
pause
endlocal
goto :eof
