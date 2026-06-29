@echo off
REM ======================================================
REM  Dexo Master Start - All Apps with Logging
REM ======================================================
REM  This script starts all 4 apps:
REM   - API server (port 4000)
REM   - Web platform (port 3000)
REM   - Admin console (port 3001)
REM   - Mobile app (Expo LAN mode)
REM
REM  Each app logs to /logs/<app>/<app>-<timestamp>.log
REM ======================================================

cd /d "%~dp0"

REM Get current timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localtime /value') do set "dt=%%a"
set "TIMESTAMP=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%-%dt:~8,2%%dt:~10,2%%dt:~12,2%"

echo.
echo ======================================================================
echo   Dexo Platform - Master Start (Batch Mode)
echo   Session: %TIMESTAMP%
echo   Logs:    .\logs\
echo ======================================================================
echo.

REM Create log dirs
if not exist "logs\api" mkdir "logs\api"
if not exist "logs\web" mkdir "logs\web"
if not exist "logs\admin" mkdir "logs\admin"
if not exist "logs\mobile" mkdir "logs\mobile"
if not exist "logs\orchestrator" mkdir "logs\orchestrator"

REM Clear stale turbo pid
if exist "%TEMP%\turbod" (
  del /q /f "%TEMP%\turbod\*.pid" 2>nul
  echo Cleared stale turbo pid files.
)

echo Starting API server (port 4000)...
start "Dexo-API" /MIN cmd /c "cd /d %~dp0 && npx ts-node --transpile-only apps/api/src/main.ts > logs\api\api-%TIMESTAMP%.log 2>&1"
timeout /t 18 /nobreak >nul

echo Starting Web platform (port 3000)...
start "Dexo-Web" /MIN cmd /c "cd /d %~dp0\apps\web && npx next dev -p 3000 > ..\..\logs\web\web-%TIMESTAMP%.log 2>&1"
timeout /t 12 /nobreak >nul

echo Starting Admin console (port 3001)...
start "Dexo-Admin" /MIN cmd /c "cd /d %~dp0\apps\admin && npx next dev -p 3001 > ..\..\logs\admin\admin-%TIMESTAMP%.log 2>&1"
timeout /t 12 /nobreak >nul

echo Starting Mobile (Expo LAN mode)...
start "Dexo-Mobile" /MIN cmd /c "cd /d %~dp0\apps\mobile && set EXPO_NO_TELEMETRY=1 && npx expo start --lan --port 8081 --clear > ..\..\logs\mobile\mobile-%TIMESTAMP%.log 2>&1"
timeout /t 25 /nobreak >nul

echo.
echo ======================================================================
echo   All apps started successfully!
echo ======================================================================
echo.
echo   API:        http://localhost:4000/api/docs
echo   Web:        http://localhost:3000
echo   Admin:      http://localhost:3001
echo   Mobile:     Scan QR with Expo Go
echo.
echo   Logs are in .\logs\ subfolders
echo   Use type logs\api\api-*.log to view
echo.
echo   To stop all apps, run: stop-all.bat
echo.

pause
