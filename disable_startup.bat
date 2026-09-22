@echo off
setlocal
title FreeWispr - Disable Windows Auto-Start

set "SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\FreeWispr.lnk"

if exist "%SHORTCUT%" del /f /q "%SHORTCUT%"
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "FreeWispr" /f >nul 2>&1

if not exist "%SHORTCUT%" (
    echo [SUCCESS] FreeWispr Windows Auto-Start has been disabled.
) else (
    echo [ERROR] The Startup shortcut could not be removed.
)

echo.
pause
