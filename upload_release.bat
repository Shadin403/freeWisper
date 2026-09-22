@echo off
setlocal
cd /d "%~dp0"
title FreeWispr - Upload Release to GitHub

echo =========================================================
echo    FreeWispr GitHub Release Uploader
echo    Repo: Shadin403/freeWisper   Tag: FreeWispr
echo =========================================================
echo.

set "OLD_ASSET=FreeWispr.Voice.Assistant.exe"
set "NEW_ASSET=FreeWispr-Setup-1.1.0-x64.exe"
set "SETUP_FILE=dist-electron\%NEW_ASSET%"

if not exist "%SETUP_FILE%" goto missing_file

where gh >nul 2>&1
if %errorlevel% neq 0 goto no_gh

echo [1/3] Checking GitHub authentication...
gh auth status >nul 2>&1
if %errorlevel% neq 0 goto not_logged_in
echo       Logged in OK.

echo.
echo [2/3] Checking the FreeWispr release exists...
gh release view FreeWispr --repo Shadin403/freeWisper >nul 2>&1
if %errorlevel% neq 0 goto create_release

echo       Release FreeWispr exists.
goto upload

:create_release
echo [INFO] Release tag FreeWispr was not found. Creating it now...
gh release create FreeWispr --repo Shadin403/freeWisper --title "FreeWispr v1.1.0" --notes "FreeWispr v1.1.0 initial Windows release."
if %errorlevel% neq 0 goto upload_failed
echo       Release created.

:upload
echo.
echo [3/3] Uploading the FreeWispr Setup installer...
gh release upload FreeWispr "%SETUP_FILE%" --repo Shadin403/freeWisper --clobber
if %errorlevel% neq 0 goto upload_failed
echo       Upload complete.

echo.
echo Cleaning up the old standalone asset...
gh release delete-asset FreeWispr "%OLD_ASSET%" --repo Shadin403/freeWisper --yes >nul 2>&1
echo       Old asset removed (or already absent). Done.

echo.
echo =========================================================
echo    SUCCESS: FreeWispr Setup installer published!
echo    https://github.com/Shadin403/freeWisper/releases/tag/FreeWispr
echo =========================================================
pause
exit /b 0

:missing_file
echo [ERROR] Setup installer not found: %SETUP_FILE%
echo Please run build_exe.bat first.
pause
exit /b 1

:no_gh
echo [ERROR] GitHub CLI gh is not installed or not in PATH.
echo.
echo Install it from: https://cli.github.com/
echo   winget install --id GitHub.cli
echo   or scoop install gh
echo.
echo After installing, run: gh auth login
echo Then run this file again.
pause
exit /b 1

:not_logged_in
echo [ERROR] You are not logged in to GitHub CLI.
echo Please run: gh auth login
pause
exit /b 1

:upload_failed
echo.
echo [ERROR] GitHub upload failed. Review the message above.
pause
exit /b 1