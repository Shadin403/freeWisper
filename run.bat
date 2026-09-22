@echo off
setlocal
cd /d "%~dp0"
title FreeWispr Voice Assistant

if not exist "node_modules" (
    echo [INFO] Installing Node.js dependencies...
    call npm install
)

if not exist "dist\index.html" (
    echo [INFO] Building React UI...
    call npm run build
)

echo Starting FreeWispr Voice Assistant...
call npx electron .
