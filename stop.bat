@echo off
REM ==============================================================================
REM  Dexo Platform v5 - Stop all dev servers and free locked ports
REM ==============================================================================
REM  Kills every background app started by run.bat (API, web apps, mobile) and
REM  frees the locked ports. Docker services (postgres/redis/minio/mailhog) are
REM  LEFT RUNNING so you don't lose data. Run docker-stop.bat or
REM  `docker stop dexo-postgres dexo-redis dexo-minio dexo-mailhog` to stop those.
REM ==============================================================================

set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Dexo Platform v5 - Stopping servers
echo ========================================
echo.

REM 1) Kill stale per-app runner windows (start-app.ps1 titles them "Dexo <app>")
echo [INFO] Closing Dexo runner windows...
taskkill /FI "WINDOWTITLE eq Dexo*" /F >nul 2>nul

REM 2) Kill any node process whose command line references this project's paths
echo [INFO] Stopping project node processes...
for /f "tokens=2 delims=," %%i in ('wmic process where "name='node.exe'" get processid^,commandline /format:csv 2^>nul ^| findstr /i "Dexo"') do (
    taskkill /PID %%i /T /F >nul 2>nul
)
REM Also stop expo/metro helper processes spawned under the project
for /f "tokens=2 delims=," %%i in ('wmic process where "name='cmd.exe'" get processid^,commandline /format:csv 2^>nul ^| findstr /i "Dexo\\logs\\.*-runner.cmd"') do (
    taskkill /PID %%i /T /F >nul 2>nul
)

REM 3) Free the locked ports by killing whatever is still listening on them
echo [INFO] Freeing locked ports (3001 3002 4000 4005 4006 4007 8081)...
for %%P in (3001 3002 4000 4005 4006 4007 8081) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%%P " ^| findstr "LISTENING" 2^>nul') do (
        taskkill /PID %%a /T /F >nul 2>nul
    )
)

timeout /t 2 /nobreak >nul

REM 4) Report final port status
echo.
echo [INFO] Port status after stop:
set "_any=0"
for %%P in (3001 3002 4000 4005 4006 4007 8081) do (
    netstat -aon 2>nul | findstr ":%%P " | findstr "LISTENING" >nul
    if !ERRORLEVEL! EQU 0 (
        echo     :%%P  STILL IN USE
        set "_any=1"
    )
)
if "%_any%"=="0" echo     All Dexo ports are free.

echo.
echo [INFO] Docker services left running (data preserved):
docker ps --filter "name=dexo-" --format "     {{.Names}}  ({{.Status}})" 2>nul
echo.
echo Done. Run run.bat to start again.
echo.
pause
exit /b 0
