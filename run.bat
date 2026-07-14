@echo off
REM ==============================================================================
REM  Dexo Platform v5 - Windows Startup Script with Timestamped Logging
REM ==============================================================================
REM
REM  LOCKED PORT MAP (v5):
REM    :3001  apps/platform-web       Platform marketing + sign-up
REM    :3002  apps/platform-admin     Platform staff panel
REM    :4000  apps/api                Shared API
REM    :4005  apps/tenant-website     Tenant public website
REM    :4006  apps/tenant-admin       Tenant owner + staff portal
REM    :4007  apps/tenant-app         Tenant customer-facing app
REM    :8081  apps/mobile             Expo mobile
REM    :5433  PostgreSQL
REM    :6379  Redis
REM    :9000  MinIO
REM    :8025  MailHog
REM
REM  TENANT RESOLUTION: hostname middleware (NEVER [subdomain] URL segments)
REM  In dev: use DEV_TENANT env var (e.g. vrfitness, spicegarden) or X-Dev-Tenant header
REM
REM ==============================================================================

set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

set "TEMPFILE=%TEMP%\dexo_timestamp_%RANDOM%.txt"
powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd-HHmmss' | Out-File -FilePath '%TEMPFILE%' -Encoding ASCII -NoNewline" >nul 2>&1
set /p TIMESTAMP=<"%TEMPFILE%" 2>nul
del "%TEMPFILE%" 2>nul
if "%TIMESTAMP%"=="" set "TIMESTAMP=2026-01-01-000000"

REM ============================================
REM  Setup logs directory
REM ============================================
for %%D in (orchestrator api platform-web platform-admin tenant-website tenant-admin tenant-app mobile expo-go) do (
  if not exist "logs\%%D" mkdir "logs\%%D"
)

REM ============================================
REM  Rotate old logs — keep only the newest 50 files per service directory.
REM  Runs BEFORE this session writes anything, so it never touches today's
REM  about-to-be-created log files, only leftovers from previous runs.
REM ============================================
echo [INFO] Rotating old logs (keeping newest 50 per service)...
for %%D in (orchestrator api platform-web platform-admin tenant-website tenant-admin tenant-app mobile expo-go) do (
  powershell -NoProfile -Command ^
    "Get-ChildItem -LiteralPath 'logs\%%D' -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -match '\.(log|out|err)$' } | Sort-Object LastWriteTime -Descending | Select-Object -Skip 50 | Remove-Item -Force -ErrorAction SilentlyContinue"
)
echo [INFO] Log rotation done.
echo.

set "ORCHESTRATOR_LOG=logs\orchestrator\orchestrator-%TIMESTAMP%.log"
echo [%date% %time:~0,8%] Dexo Platform v5 - Startup initiated > "%ORCHESTRATOR_LOG%"
echo. >> "%ORCHESTRATOR_LOG%"

REM ============================================
REM  Prerequisite checks
REM ============================================
echo.
echo ========================================
echo   Dexo Platform v5 - Development Server
echo   Session: %TIMESTAMP%
echo ========================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo [%date% %time:~0,8%] [ERROR] Node.js missing >> "%ORCHESTRATOR_LOG%"
    echo Please install Node.js ^>= 18.0.0 from https://nodejs.org/
    pause
    exit /b 1
)
echo [INFO] Node.js version:
node --version
echo [%date% %time:~0,8%] [INFO] Node.js: >> "%ORCHESTRATOR_LOG%"
node --version >> "%ORCHESTRATOR_LOG%" 2>&1
echo.

REM ============================================
REM  Docker checks
REM ============================================
docker info >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker Desktop is not running.
    echo [%date% %time:~0,8%] [ERROR] Docker not running >> "%ORCHESTRATOR_LOG%"
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo [INFO] Docker is running.
echo [%date% %time:~0,8%] [INFO] Docker is running >> "%ORCHESTRATOR_LOG%"
echo.

REM ============================================
REM  Start Docker Services
REM ============================================
echo [INFO] Starting Docker services...
echo [%date% %time:~0,8%] [INFO] Starting Docker services... >> "%ORCHESTRATOR_LOG%"

set "DOCKER_LOG=logs\orchestrator\docker-%TIMESTAMP%.log"

docker ps --filter "name=dexo-postgres" --format "{{.Names}}" 2>nul | findstr "dexo-postgres" >nul
if %ERRORLEVEL% NEQ 0 (
    docker run -d --name dexo-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=dexo -p 5433:5432 postgres:16-alpine >> "%DOCKER_LOG%" 2>&1
    echo [INFO] PostgreSQL started on port 5433
) else (
    docker start dexo-postgres >> "%DOCKER_LOG%" 2>&1
    echo [INFO] PostgreSQL already exists, started.
)

docker ps --filter "name=dexo-redis" --format "{{.Names}}" 2>nul | findstr "dexo-redis" >nul
if %ERRORLEVEL% NEQ 0 (
    docker run -d --name dexo-redis -p 6379:6379 redis:7-alpine >> "%DOCKER_LOG%" 2>&1
    echo [INFO] Redis started on port 6379
) else (
    docker start dexo-redis >> "%DOCKER_LOG%" 2>&1
    echo [INFO] Redis already exists, started.
)

docker ps --filter "name=dexo-minio" --format "{{.Names}}" 2>nul | findstr "dexo-minio" >nul
if %ERRORLEVEL% NEQ 0 (
    docker run -d --name dexo-minio -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin minio/minio server /data --console-address ":9001" >> "%DOCKER_LOG%" 2>&1
    echo [INFO] MinIO started on ports 9000/9001
) else (
    docker start dexo-minio >> "%DOCKER_LOG%" 2>&1
    echo [INFO] MinIO already exists, started.
)

docker ps --filter "name=dexo-mailhog" --format "{{.Names}}" 2>nul | findstr "dexo-mailhog" >nul
if %ERRORLEVEL% NEQ 0 (
    docker run -d --name dexo-mailhog -p 1025:1025 -p 8025:8025 mailhog/mailhog >> "%DOCKER_LOG%" 2>&1
    echo [INFO] MailHog started on ports 1025/8025
) else (
    docker start dexo-mailhog >> "%DOCKER_LOG%" 2>&1
    echo [INFO] MailHog already exists, started.
)

echo [INFO] All Docker services started.
echo.

echo [INFO] Waiting for PostgreSQL to be ready...
set PG_TRIES=0
:wait_postgres
docker exec dexo-postgres pg_isready -U postgres >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :pg_ready
set /a PG_TRIES+=1
if %PG_TRIES% GEQ 30 (
    echo [WARN] PostgreSQL not ready after ~60s - continuing anyway.
    goto :pg_ready
)
call :sleep 2
goto :wait_postgres
:pg_ready
echo [INFO] PostgreSQL is ready.

REM ============================================
REM  Install dependencies if needed
REM ============================================
if not exist "node_modules\" (
    echo [INFO] Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

REM ============================================
REM  Create .env if missing
REM ============================================
if not exist ".env" (
    echo [INFO] Creating .env file...
    (
        echo # Dexo Platform v5 Environment Variables
        echo DATABASE_URL=postgresql://postgres:postgres@localhost:5433/dexo
        echo JWT_SECRET=dev-jwt-secret-key-change-in-production
        echo REDIS_URL=redis://localhost:6379
        echo USE_MINIO=true
        echo MINIO_ENDPOINT=http://localhost:9000
        echo MINIO_PORT=9000
        echo MINIO_ACCESS_KEY=minioadmin
        echo MINIO_SECRET_KEY=minioadmin
        echo S3_BUCKET=dexo-uploads
        echo SMTP_HOST=localhost
        echo SMTP_PORT=1025
        echo NODE_ENV=development
        echo # Default dev tenant
        echo DEV_TENANT=vrfitness
    ) > .env
    echo [INFO] Created .env file.
    echo.
)

REM ============================================
REM  Ensure 'dexo' database exists (matches .env)
REM ============================================
echo [INFO] Ensuring database 'dexo' exists...
echo [%date% %time:~0,8%] [INFO] Ensure database 'dexo' >> "%ORCHESTRATOR_LOG%"
docker exec dexo-postgres psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='dexo'" 2>nul | findstr 1 >nul
if %ERRORLEVEL% EQU 0 goto :db_ready
echo [INFO] Database 'dexo' not found - creating...
docker exec dexo-postgres psql -U postgres -c "CREATE DATABASE dexo" >> "%ORCHESTRATOR_LOG%" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to create database 'dexo'. Postgres may not be ready yet.
    echo [%date% %time:~0,8%] [ERROR] CREATE DATABASE dexo failed >> "%ORCHESTRATOR_LOG%"
) else (
    echo [INFO] Database 'dexo' created.
)
:db_ready
echo.

REM ============================================
REM  Apply Prisma schema (creates tables)
REM  NOTE: `prisma migrate deploy` is a silent no-op when prisma/migrations has
REM  no real migration folders (only migration_lock.toml) — fall back to
REM  `db push` in that case, otherwise a fresh clone seeds against a database
REM  with zero tables. Kept in parity with run.sh.
REM ============================================
echo [INFO] Preparing database schema...
call npx prisma generate >> "%ORCHESTRATOR_LOG%" 2>&1

set "HAS_MIGRATIONS=0"
for /f %%D in ('dir /b /ad "prisma\migrations" 2^>nul') do set "HAS_MIGRATIONS=1"

if "%HAS_MIGRATIONS%"=="1" (
    echo [INFO] Applying migrations ^(prisma migrate deploy^)...
    echo [%date% %time:~0,8%] [INFO] prisma migrate deploy >> "%ORCHESTRATOR_LOG%"
    call npx prisma migrate deploy >> "%ORCHESTRATOR_LOG%" 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Migration failed. Last 20 log lines:
        powershell -NoProfile -Command "Get-Content '%ORCHESTRATOR_LOG%' -Tail 20"
        echo.
        echo [WARN] Continuing startup, but DB-dependent apps will fail.
        echo [INFO] Full log: %ORCHESTRATOR_LOG%
    ) else (
        echo [INFO] Migrations applied.
    )
) else (
    echo [WARN] No migrations found in prisma\migrations - syncing schema with 'prisma db push'.
    echo [%date% %time:~0,8%] [INFO] prisma db push --accept-data-loss >> "%ORCHESTRATOR_LOG%"
    call npx prisma db push --accept-data-loss >> "%ORCHESTRATOR_LOG%" 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] db push failed. Last 20 log lines:
        powershell -NoProfile -Command "Get-Content '%ORCHESTRATOR_LOG%' -Tail 20"
        echo.
        echo [WARN] Continuing startup, but DB-dependent apps will fail.
        echo [INFO] Full log: %ORCHESTRATOR_LOG%
    ) else (
        echo [INFO] Schema synced.
    )
)
echo.

REM ============================================
REM  Seed v5 demo data (platform admin + tenants + users)
REM  Creates: admin@test.com, vrfitness, spicegarden + all advertised users
REM ============================================
echo [INFO] Seeding v5 demo data (tenants + users)...
echo [%date% %time:~0,8%] [INFO] Seeding v5 demo data >> "%ORCHESTRATOR_LOG%"
call npm run db:seed:v5 >> "%ORCHESTRATOR_LOG%" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Seed failed. Last 20 log lines:
    powershell -NoProfile -Command "Get-Content '%ORCHESTRATOR_LOG%' -Tail 20"
    echo.
    echo [INFO] Full log: %ORCHESTRATOR_LOG%
) else (
    echo [INFO] Seed complete: vrfitness + spicegarden tenants ready.
)
echo.

REM ============================================
REM  Kill any existing processes on all v5 ports
REM ============================================
echo [INFO] Cleaning up old processes...
REM Kill stale per-app runner windows first (start-app.ps1 titles them "Dexo <app>")
taskkill /FI "WINDOWTITLE eq Dexo*" /F >nul 2>nul
for %%P in (3001 3002 4000 4005 4006 4007 8081) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%%P " ^| findstr "LISTENING" 2^>nul') do (
        taskkill /PID %%a /T /F >nul 2>nul
    )
)
call :sleep 3
echo [INFO] Ports cleared.

if exist "%TEMP%\turbod" (
    del /q /f "%TEMP%\turbod\*.pid" 2>nul
    echo [INFO] Cleared stale turbo pid files.
)

echo [INFO] Cleaning nested .bin symlinks...
for /f "delims=" %%d in ('dir /s /b /ad "node_modules\node_modules\.bin" 2^>nul') do (
    if exist "%%d" del /q /f "%%d\*.*" 2>nul
)
echo [INFO] Cleaned.
echo.

REM ============================================
REM  Start API Server (port 4000)
REM ============================================
set "API_LOG=logs\api\api-%TIMESTAMP%.log"

echo [INFO] Checking port 4000 for a stale API process...
set "_killed4000=0"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000 " ^| findstr "LISTENING" 2^>nul') do (
    echo [INFO] Killing stale process %%a on port 4000...
    taskkill /PID %%a /T /F >nul 2>nul
    set "_killed4000=1"
)
if "%_killed4000%"=="1" call :sleep 2
echo [INFO] Port 4000 is free.

echo [INFO] Starting API Server on port 4000...
echo [INFO] Logs: %API_LOG%
start "Dexo API" /MIN powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-app.ps1" -App api
call :sleep 18
call :check_app "API Server" 4000 "%API_LOG%" api

REM Hard-stop the whole boot if the API never came up on its port — every
REM other app depends on it, so continuing just cascades failures downstream.
netstat -aon 2>nul | findstr ":4000 " | findstr "LISTENING" >nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [FATAL] API Server failed to start on port 4000. Aborting startup here.
    echo [FATAL] See logs: %API_LOG%.out / %API_LOG%.err
    pause
    exit /b 1
)

REM Hard-stop if the API log recorded a real error. "Failed to check bucket"
REM is a known benign MinIO race on cold start and is excluded so it doesn't
REM trigger a false abort.
if exist "%API_LOG%.err" (
    powershell -NoProfile -Command ^
      "$m = Get-Content -LiteralPath '%API_LOG%.err' -ErrorAction SilentlyContinue | Select-String -Pattern 'error' -CaseSensitive:$false | Where-Object { $_.Line -notmatch 'Failed to check bucket' }; if ($m) { exit 1 } else { exit 0 }"
    if %ERRORLEVEL% EQU 1 (
        echo.
        echo [FATAL] Error^(s^) detected in the API log. Aborting startup here.
        echo [FATAL] Last 30 lines of %API_LOG%.err:
        powershell -NoProfile -Command "Get-Content -LiteralPath '%API_LOG%.err' -Tail 30"
        pause
        exit /b 1
    )
)

REM ============================================
REM  Start platform-web (port 3001)
REM ============================================
set "PLAT_WEB_LOG=logs\platform-web\platform-web-%TIMESTAMP%.log"
echo [INFO] Starting Platform Web (port 3001)...
echo [INFO] Logs: %PLAT_WEB_LOG%
start "Dexo platform-web" /MIN powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-app.ps1" -App platform-web
call :sleep 12
call :check_app "Platform Web" 3001 "%PLAT_WEB_LOG%" platform-web

REM ============================================
REM  Start platform-admin (port 3002)
REM ============================================
set "PLAT_ADM_LOG=logs\platform-admin\platform-admin-%TIMESTAMP%.log"
echo [INFO] Starting Platform Admin (port 3002)...
echo [INFO] Logs: %PLAT_ADM_LOG%
start "Dexo platform-admin" /MIN powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-app.ps1" -App platform-admin
call :sleep 12
call :check_app "Platform Admin" 3002 "%PLAT_ADM_LOG%" platform-admin

REM ============================================
REM  Start tenant-website (port 4005) - DEV_TENANT=vrfitness
REM ============================================
set "TEN_WEB_LOG=logs\tenant-website\tenant-website-%TIMESTAMP%.log"
echo [INFO] Starting Tenant Website (port 4005)...
echo [INFO] Logs: %TEN_WEB_LOG%
start "Dexo tenant-website" /MIN powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-app.ps1" -App tenant-website
call :sleep 10
call :check_app "Tenant Website" 4005 "%TEN_WEB_LOG%" tenant-website

REM ============================================
REM  Start tenant-admin (port 4006)
REM ============================================
set "TEN_ADM_LOG=logs\tenant-admin\tenant-admin-%TIMESTAMP%.log"
echo [INFO] Starting Tenant Admin (port 4006)...
echo [INFO] Logs: %TEN_ADM_LOG%
start "Dexo tenant-admin" /MIN powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-app.ps1" -App tenant-admin
call :sleep 10
call :check_app "Tenant Admin" 4006 "%TEN_ADM_LOG%" tenant-admin

REM ============================================
REM  Start tenant-app (port 4007)
REM ============================================
set "TEN_APP_LOG=logs\tenant-app\tenant-app-%TIMESTAMP%.log"
echo [INFO] Starting Tenant App (port 4007)...
echo [INFO] Logs: %TEN_APP_LOG%
start "Dexo tenant-app" /MIN powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-app.ps1" -App tenant-app
call :sleep 10
call :check_app "Tenant App" 4007 "%TEN_APP_LOG%" tenant-app

REM ============================================
REM  Start Mobile (Expo) - port 8081
REM ============================================
set "MOBILE_LOG=logs\mobile\mobile-%TIMESTAMP%.log"
set "EXPO_LOG=logs\expo-go\expo-go-%TIMESTAMP%.log"
echo [INFO] Starting Mobile (Expo) on port 8081...
echo [INFO] Logs: %MOBILE_LOG%
start "Dexo Mobile" /MIN powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-app.ps1" -App mobile
call :sleep 25
call :check_app "Mobile (Expo)" 8081 "%MOBILE_LOG%" mobile

REM ============================================
REM  Show Status
REM ============================================
echo.
echo ========================================
echo   All Services Started (v5)
echo   Session: %TIMESTAMP%
echo ========================================
echo.
echo   PLATFORM (locked port map):
echo     Platform Web (marketing):  http://localhost:3001   (admin@test.com)
echo     Platform Admin (staff):    http://localhost:3002   (admin@test.com)
echo     API Server:                http://localhost:4000
echo     Swagger Docs:              http://localhost:4000/api/docs
echo.
echo   DEFAULT TENANT (vrfitness - via DEV_TENANT):
echo     Tenant Website (public):   http://localhost:4005   (admin@vrfitness.com)
echo     Tenant Admin (owner):      http://localhost:4006/admin   (admin@vrfitness.com)
echo     Tenant App (customer):     http://localhost:4007/portal (member1@vrfitness.com)
echo.
echo   SUBDOMAIN-BASED TENANT ACCESS (no DEV_TENANT restart needed -
echo   browsers resolve *.localhost to 127.0.0.1 automatically^):
echo     http://vrfitness.localhost:4005     http://spicegarden.localhost:4005
echo     http://vrfitness.localhost:4006/admin   http://vrfitness.localhost:4007/portal
echo     (tenant-admin/tenant-app resolve their tenant from the host's first label^)
echo.
echo     Mobile (Expo):             http://localhost:8081   ^| Scan QR with Expo Go
echo.
echo   DOCKER SERVICES:
echo     PostgreSQL:     localhost:5433
echo     Redis:          localhost:6379
echo     MinIO (S3):     http://localhost:9000
echo     MinIO Console:  http://localhost:9001
echo     MailHog:        http://localhost:8025
echo.
echo ========================================
echo.
echo   LOGS LOCATION: .\logs\
echo     api\              - API server
echo     platform-web\     - Platform marketing
echo     platform-admin\   - Platform staff
echo     tenant-website\   - Tenant public site
echo     tenant-admin\     - Tenant owner/staff
echo     tenant-app\       - Tenant customer app
echo     mobile\           - Mobile (Expo)
echo     orchestrator\     - This startup script
echo.
echo   Each log file: logs\<service>\<service>-%TIMESTAMP%.log
echo   Servers run in hidden windows. Stop them with: stop.bat
echo.
echo ========================================
echo.
echo   Demo Credentials (v5):
echo     Platform Admin: admin@test.com              / Admin@123
echo     FITNESS_CENTER tenant (vrfitness):
echo       Owner:     admin@vrfitness.com            / Admin123!
echo       Manager:   manager@vrfitness.com          / Manager123!
echo       Trainer:   trainer1@vrfitness.com         / Trainer123!
echo       Member:    member1@vrfitness.com          / Member123!
echo     RESTAURANT tenant (spicegarden):
echo       Owner:     admin@spicegarden.com          / Admin123!
echo       Manager:   manager@spicegarden.com        / Manager123!
echo       Staff:     waiter1@spicegarden.com        / Staff123!
echo.
echo   Tenant switching (dev):
echo     set DEV_TENANT=spicegarden ^&^& npm run dev --workspace=@dexo/tenant-website
echo.
echo ========================================
echo.

set "MOBILE_LATEST=logs\mobile\mobile-%TIMESTAMP%.log.out"
if exist "%MOBILE_LATEST%" (
    call :sleep 3
    type "%MOBILE_LATEST%"
) else (
    echo [WARN] Mobile log not found. Run: scripts\view-log.ps1 mobile
)
echo.
echo ========================================
echo.
echo Press any key to open browsers.
echo.
echo IMPORTANT: All app servers run in HIDDEN background windows.
echo   To STOP everything later, run:  stop.bat
echo   To view live logs, run:        powershell -ExecutionPolicy Bypass -File scripts\view-log.ps1 api
echo.
pause >nul

start http://localhost:3001
start http://localhost:3002
start http://localhost:4005
start http://localhost:4006/admin
start http://localhost:4007/portal
start http://localhost:4000/api/docs

echo.
echo Browsers opened. Servers running in separate windows.
echo.
echo To view logs in real-time, open a new terminal and run:
echo   powershell -ExecutionPolicy Bypass -File scripts\view-log.ps1 api
echo   services: api platform-web platform-admin tenant-website tenant-admin tenant-app mobile orchestrator
echo   add -Err to tail error logs, e.g. scripts\view-log.ps1 api -Err
echo.
pause
exit /b 0

REM ============================================
REM  Subroutine: check_app <name> <port> <logbase> <service>
REM  Verifies the app is listening on its port. If not, prints the
REM  error/stdout log tails inline so failures are visible in this window.
REM
REM  NOTE: uses setlocal enabledelayedexpansion + !var! so that app names
REM  containing parentheses (e.g. "Mobile (Expo)") do NOT prematurely close
REM  the if-block and abort the whole script with "is was unexpected at this time".
REM ============================================
:check_app
setlocal enabledelayedexpansion
set "_cname=%~1"
set "_cport=%~2"
set "_clog=%~3"
set "_csvc=%~4"
echo.
echo [CHECK] !_cname! on port !_cport! ...
netstat -aon 2>nul | findstr ":!_cport! " | findstr "LISTENING" >nul
if !ERRORLEVEL! EQU 0 (
    echo [OK]    !_cname! is listening on port !_cport!.
    goto :check_done
)
echo [ERROR] !_cname! is NOT responding on port !_cport!.
if exist "!_clog!.err" (
    echo --- error log tail ^("!_clog!.err"^) ---
    powershell -NoProfile -Command "Get-Content -LiteralPath '!_clog!.err' -Tail 15 -ErrorAction SilentlyContinue"
)
if exist "!_clog!.out" (
    echo --- stdout log tail ^("!_clog!.out"^) ---
    powershell -NoProfile -Command "Get-Content -LiteralPath '!_clog!.out' -Tail 15 -ErrorAction SilentlyContinue"
)
if exist "!_clog!" if not exist "!_clog!.out" if not exist "!_clog!.err" (
    echo --- log tail ^("!_clog!"^) ---
    powershell -NoProfile -Command "Get-Content -LiteralPath '!_clog!' -Tail 15 -ErrorAction SilentlyContinue"
)
echo.
echo [TIP] Tail live with: powershell -ExecutionPolicy Bypass -File scripts\view-log.ps1 !_csvc! -Err
:check_done
endlocal
goto :eof

REM ============================================
REM  Subroutine: sleep <seconds>
REM  Redirect-safe sleep. The built-in `timeout` command fails with
REM  "Input redirection is not supported" whenever stdin is piped (scheduled
REM  tasks, some launchers, `run.bat < nul`), which breaks the boot waits and
REM  cascades into check failures. ping waits ~1s per hop regardless of stdin.
REM ============================================
:sleep
set /a "_sleepN=%~1 + 1" 2>nul
ping -n %_sleepN% 127.0.0.1 >nul 2>nul
set "_sleepN="
goto :eof
