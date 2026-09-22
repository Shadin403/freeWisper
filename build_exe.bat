@echo off
setlocal
cd /d "%~dp0"
title FreeWispr - Package & Auto-Launch (.exe)

echo =========================================================
echo    FreeWispr Windows Standalone (.EXE) Builder & Launcher
echo =========================================================
echo.

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] NPM was not found. Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

:: Terminate running instances
echo [1/5] Closing running FreeWispr instances...
taskkill /f /im "FreeWispr Voice Assistant.exe" >nul 2>&1
taskkill /f /im "WisprFlow Voice Assistant.exe" >nul 2>&1
taskkill /f /im electron.exe >nul 2>&1
timeout /t 1 /nobreak >nul

:: Clean old build artifacts safely
if exist "dist-electron" rmdir /s /q "dist-electron" >nul 2>&1

echo.
echo [2/5] Checking Node.js dependencies...
if not exist "node_modules" (
    call npm install
)

echo.
echo [3/5] Generating High-Definition Icons...
call node scripts/build-icons.js

echo.
echo [4/5] Building Vite React UI...
call npm run build

echo.
echo [5/5] Packaging Standalone Windows .EXE with FreeWispr Icon & Metadata...
call npx electron-builder --win dir -c.win.icon=build/icon.ico

if %errorlevel% equ 0 (
    echo.
    echo =========================================================
    echo    SUCCESS: Standalone Windows .EXE Ready!
    echo.
    echo    Executable Path:
    echo    dist-electron\win-unpacked\FreeWispr Voice Assistant.exe
    echo.
    echo    🚀 Launching as a standalone independent background process...
    echo =========================================================
    echo.

    :: Enable Windows auto-start immediately after a successful build
    echo    Enabling FreeWispr auto-start on Windows login...
    call "%~dp0enable_startup.bat" silent

    :: Launch completely detached via Windows Explorer shell (independent of CMD terminal)
    explorer.exe "%~dp0dist-electron\win-unpacked\FreeWispr Voice Assistant.exe"

    timeout /t 2 /nobreak >nul
    exit
) else (
    echo.
    echo [WARNING] Build encountered an error. Please review the output above.
    pause
)
