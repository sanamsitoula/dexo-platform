@echo off
REM Stop all Dexo services (Docker + Node)
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

echo Stopping all Dexo services...

REM Stop Node processes on known ports
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING" 2^>nul') do taskkill /PID %%a /F >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " ^| findstr "LISTENING" 2^>nul') do taskkill /PID %%a /F >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000 " ^| findstr "LISTENING" 2^>nul') do taskkill /PID %%a /F >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8081 " ^| findstr "LISTENING" 2^>nul') do taskkill /PID %%a /F >nul 2>nul

echo [INFO] Stopped Node services.

REM Optionally stop Docker containers
echo.
set /p STOP_DOCKER="Also stop Docker containers (PostgreSQL, Redis, MinIO, MailHog)? (y/N): "
if /i "%STOP_DOCKER%"=="y" (
    docker stop dexo-postgres dexo-redis dexo-minio dexo-mailhog 2>nul
    echo [INFO] Stopped Docker containers.
)

echo.
echo Done. All Dexo services stopped.
pause
