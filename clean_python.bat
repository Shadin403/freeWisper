@echo off
setlocal
cd /d "%~dp0"
title Cleaning up Python files

echo =========================================================
echo    Removing all old Python files and virtual environments...
echo =========================================================
echo.

:: Delete Python scripts
del /f /q audio_recorder.py 2>nul
del /f /q ai_refiner.py 2>nul
del /f /q app.py 2>nul
del /f /q auto_paster.py 2>nul
del /f /q config.py 2>nul
del /f /q db_manager.py 2>nul
del /f /q floating_widget.py 2>nul
del /f /q history_manager.py 2>nul
del /f /q settings_window.py 2>nul
del /f /q setup_env.py 2>nul
del /f /q sound_effects.py 2>nul
del /f /q stt_engine.py 2>nul
del /f /q tray_manager.py 2>nul
del /f /q requirements.txt 2>nul
del /f /q run_silent.vbs 2>nul
del /f /q kill_all_instances.bat 2>nul
del /f /q Launch_WisprFlow.bat 2>nul
del /f /q Launch_FreeWispr.bat 2>nul

:: Delete Python cache and virtual environment
if exist "__pycache__" rmdir /s /q "__pycache__"
if exist ".venv" rmdir /s /q ".venv"
if exist "build" rmdir /s /q "build"

echo.
echo =========================================================
echo    SUCCESS: All Python files removed cleanly!
echo    Your project is now 100%% pure Node.js + React + Electron.
echo =========================================================
echo.
pause
