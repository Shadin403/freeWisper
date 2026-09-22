@echo off
setlocal
cd /d "%~dp0"
title FreeWispr - Enable Windows Auto-Start

echo =========================================================
echo    FreeWispr Windows Auto-Start Setup
echo =========================================================
echo.

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP%\FreeWispr.lnk"
set "EXE=%~dp0dist-electron\win-unpacked\FreeWispr Voice Assistant.exe"
set "VBS=%~dp0Start_FreeWispr.vbs"
set "ICON=%~dp0build\icon.ico"

if exist "%EXE%" (
    set "TARGET=%EXE%"
) else (
    set "TARGET=%VBS%"
)

if not exist "%TARGET%" (
    echo [ERROR] FreeWispr executable or launcher was not found.
    echo Please run build_exe.bat first, then run this file again.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%SHORTCUT%'); $s.TargetPath='%TARGET%'; $s.WorkingDirectory='%~dp0'; $s.Description='FreeWispr Voice Assistant Auto-Launch'; if(Test-Path '%ICON%'){$s.IconLocation='%ICON%,0'}; $s.Save()"

if exist "%SHORTCUT%" (
    echo.
    echo [SUCCESS] FreeWispr will now start automatically when you sign in to Windows.
    echo Startup shortcut: %SHORTCUT%
) else (
    echo.
    echo [ERROR] Windows Startup shortcut could not be created.
)

echo.
if /I "%~1"=="silent" exit /b 0
pause
