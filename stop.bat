@echo off
setlocal EnableExtensions

echo =========================================
echo Stopping Discord Threat Detector services...
echo =========================================

call :kill_port 3001 Backend
call :kill_port 3000 Dashboard

call :kill_window "Backend API"
call :kill_window "Dashboard"
call :kill_window "Discord Bot"

echo [INFO] Attempting to stop bot Node process by workspace path...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$botProcs = Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '*packages\\bot*' }; if ($botProcs) { foreach ($p in $botProcs) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue; Write-Host ('[OK] Stopped bot PID ' + $p.ProcessId) } } else { Write-Host '[INFO] No bot process found.' }"

echo.
echo =========================================
echo Stop routine completed.
echo =========================================
pause
exit /b 0

:kill_port
set "PORT=%~1"
set "SERVICE=%~2"
set "FOUND="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do (
	set FOUND=1
	taskkill /PID %%P /F >nul 2>&1
)

if not defined FOUND (
	echo [OK] Port %PORT% - %SERVICE% is already free.
) else (
	timeout /t 1 >nul
	netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul
	if errorlevel 1 (
		echo [OK] Freed port %PORT% - %SERVICE%.
	) else (
		echo [WARN] Port %PORT% - %SERVICE% is still in use.
	)
)
exit /b 0

:kill_window
set "TITLE=%~1"
taskkill /F /T /FI "WINDOWTITLE eq %TITLE%" >nul 2>&1
if errorlevel 1 (
	echo [INFO] No window named %TITLE% was running.
) else (
	echo [OK] Stopped window %TITLE%.
)
exit /b 0
