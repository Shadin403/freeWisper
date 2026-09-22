@echo off
setlocal
cd /d "%~dp0"
title FreeWispr - Build Windows Setup Installer

echo =========================================================
echo    FreeWispr Windows Setup Builder
echo =========================================================
echo.

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] NPM was not found. Install Node.js 18 or later.
    pause
    exit /b 1
)

echo [1/6] Closing running FreeWispr instances...
taskkill /f /im "FreeWispr Voice Assistant.exe" >nul 2>&1
taskkill /f /im "WisprFlow Voice Assistant.exe" >nul 2>&1
taskkill /f /im electron.exe >nul 2>&1
timeout /t 1 /nobreak >nul

if exist "dist-electron" rmdir /s /q "dist-electron" >nul 2>&1

echo.
echo [2/6] Checking Node.js dependencies...
if not exist "node_modules" call npm install
if %errorlevel% neq 0 goto build_failed

echo.
echo [3/6] Generating multi-resolution FreeWispr icons...
call node scripts/build-icons.js
if %errorlevel% neq 0 goto build_failed

echo.
echo [4/6] Building the React interface...
call npm run build
if %errorlevel% neq 0 goto build_failed

echo.
echo [5/6] Creating the FreeWispr Windows Setup wizard...
call npx electron-builder --win nsis -c.win.signAndEditExecutable=false
if %errorlevel% neq 0 goto build_failed

echo.
echo [6/6] Applying FreeWispr icon and Windows metadata...
call node scripts/brand-release-executables.js
if %errorlevel% neq 0 goto build_failed

for %%F in ("dist-electron\FreeWispr-Setup-*.exe") do set "SETUP_FILE=%%~fF"
if not defined SETUP_FILE goto build_failed

echo.
echo =========================================================
echo    SUCCESS: FreeWispr Setup Installer Ready!
echo.
echo    %SETUP_FILE%
echo.
echo    Upload this Setup EXE to the GitHub Release.
echo =========================================================
echo.
explorer.exe /select,"%SETUP_FILE%"
pause
exit /b 0

:build_failed
echo.
echo [ERROR] The FreeWispr Setup build failed. Review the output above.
pause
exit /b 1
