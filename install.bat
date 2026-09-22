@echo off
setlocal
cd /d "%~dp0"
title FreeWispr Voice Assistant - Node.js Setup

echo =========================================================
echo    🎙️ FreeWispr Electron + React - Setup & Installer
echo =========================================================
echo.

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js and NPM not found!
    echo Please install Node.js 18+ from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Auto-cleanup old Python/legacy files
del /f /q *.py 2>nul
del /f /q requirements.txt 2>nul
del /f /q run_silent.vbs 2>nul
del /f /q kill_all_instances.bat 2>nul
del /f /q Launch_WisprFlow.bat 2>nul
del /f /q Launch_FreeWispr.bat 2>nul
del /f /q Start_WisprFlow.vbs 2>nul
if exist "__pycache__" rmdir /s /q "__pycache__"
if exist ".venv" rmdir /s /q ".venv"
if exist "build" rmdir /s /q "build"

echo [1/3] Installing Node.js & React Dependencies...
call npm install

echo.
echo [2/3] Generating High-Definition Icons...
call node scripts/build-icons.js

echo.
echo [3/3] Building Vite React Frontend...
call npm run build

echo.
echo =========================================================
echo    ✅ Setup Completed Successfully!
echo    * To run the app: Double click 'run.bat'
echo    * To build Windows .EXE: Double click 'build_exe.bat'
echo =========================================================
echo.
pause
