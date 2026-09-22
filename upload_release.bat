@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title FreeWispr - Upload Release to GitHub (Shadin403/freeWisper)

echo =========================================================
echo    FreeWispr GitHub Release Uploader
echo    Repo: Shadin403/freeWisper  Tag: FreeWispr
echo =========================================================
echo.

:: Optional: delete the old 180MB asset and replace with the Setup installer.
set "OLD_ASSET=FreeWispr.Voice.Assistant.exe"
set "NEW_ASSET=FreeWispr-Setup-1.1.0-x64.exe"
set "SETUP_FILE=dist-electron\%NEW_ASSET%"

if not exist "%SETUP_FILE%" (
    echo [ERROR] Setup installer not found: %SETUP_FILE%
    echo Please run build_exe.bat first.
    pause
    exit /b 1
)

where gh >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] GitHub CLI (gh) is not installed or not in PATH.
    echo.
    echo Install it from:  https://cli.github.com/
    echo   - winget install --id GitHub.cli
    echo   - scoop install gh
    echo   - or download the installer from the link above
    echo.
    echo After installing, run:   gh auth login
    echo Then run this file again.
    pause
    exit /b 1
)

echo [1/3] Checking GitHub authentication...
gh auth status >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] You are not logged in to GitHub CLI.
    echo Please run:  gh auth login
    pause
    exit /b 1
)
echo       Logged in OK.

echo.
echo [2/3] Checking the FreeWispr release exists...
gh release view FreeWispr --repo Shadin403/freeWisper >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Release tag "FreeWispr" was not found. Creating it now...
    gh release create FreeWispr "FreeWispr v1.1.0" --repo Shadin403/freeWisper --title "FreeWispr v1.1.0" --notes "FreeWispr v1.1.0 initial Windows release." || goto upload_failed
    echo       Release created.
) else (
    echo       Release "FreeWispr" exists.
)

echo.
echo [3/3] Uploading the FreeWispr Setup installer...
gh release upload FreeWispr "%SETUP_FILE%" --repo Shadin403/freeWisper --clobber
if %errorlevel% neq 0 goto upload_failed
echo       Upload complete.

:: Remove the old standalone asset now that the Setup installer is published.
gh release delete-asset FreeWispr "%OLD_ASSET%" --repo Shadin403/freeWisper --yes >nul 2>&1
if %errorlevel% equ 0 (
    echo       Old asset removed: %OLD_ASSET%
) else (
    echo [INFO] Could not remove old asset (it may not exist or you may prefer to keep it).
)

echo.
echo =========================================================
echo    SUCCESS: FreeWispr Setup installer published!
echo    https://github.com/Shadin403/freeWisper/releases/tag/FreeWispr
echo =========================================================
pause
exit /b 0

:upload_failed
echo.
echo [ERROR] GitHub upload failed. Review the message above.
pause
exit /b 1