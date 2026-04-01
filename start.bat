@echo off
setlocal EnableExtensions EnableDelayedExpansion

echo =========================================
echo Starting Discord Threat Detector locally...
echo =========================================

if not exist ".env" (
	echo.
	echo [ERROR] Missing .env file.
	echo Copy .env.example to .env and fill in your credentials.
	pause
	exit /b 1
)

echo.
echo [Preflight] Checking dependencies...
if not exist "node_modules\.bin\next.cmd" (
	echo [INFO] Dependencies are missing or incomplete. Running npm install...
	call npm install
	if errorlevel 1 (
		echo [ERROR] npm install failed.
		pause
		exit /b 1
	)
)

call :ensure_port_free 3001 Backend
if errorlevel 1 (
	pause
	exit /b 1
)

call :ensure_port_free 3000 Dashboard
if errorlevel 1 (
	pause
	exit /b 1
)

echo.
echo [1/4] Running Database Migrations...
call npm run db:migrate --workspace=packages/backend
if errorlevel 1 (
	echo.
	echo [ERROR] Migration failed.
	echo Verify DATABASE_URL and ensure PostgreSQL is running.
	pause
	exit /b 1
)

echo.
echo [2/4] Starting Backend API...
start "Backend API" cmd /k "npm run dev:backend"

echo.
echo [3/4] Starting Discord Bot...
start "Discord Bot" cmd /k "npm run dev:bot"

echo.
echo [4/4] Starting Dashboard...
start "Dashboard" cmd /k "npm run dev:dashboard"

echo.
echo =========================================
echo All services are starting in new windows.
echo To stop everything, close those command prompt windows.
echo =========================================
pause
exit /b 0

:ensure_port_free
set "PORT=%~1"
set "SERVICE=%~2"
set "PID="

for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do (
	set "PID=%%P"
	goto :port_busy
)

echo [OK] Port %PORT% is available.
exit /b 0

:port_busy
echo [WARN] Port %PORT% is already in use by PID !PID! (%SERVICE%).
echo [INFO] Attempting to stop PID !PID!... 
taskkill /PID !PID! /F >nul 2>&1
if errorlevel 1 (
	echo [ERROR] Failed to stop PID !PID!. Please stop it manually and re-run start.bat.
	exit /b 1
)

timeout /t 1 >nul
set "PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do (
	set "PID=%%P"
	goto :still_busy
)

echo [OK] Freed port %PORT% (%SERVICE%).
exit /b 0

:still_busy
echo [ERROR] Port %PORT% is still in use by PID !PID! after stop attempt.
echo Run stop.bat or stop that process manually, then run start.bat again.
exit /b 1
