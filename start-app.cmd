@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% equ 0 (
  set "NODE_EXE=node"
) else (
  set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)

if not exist node_modules (
  echo App packages are missing. Open this project in Codex and ask it to install the dependencies.
  pause
  exit /b 1
)

if not "%NODE_EXE%"=="node" if not exist "%NODE_EXE%" (
  echo Node.js was not found. Install Node.js from https://nodejs.org/ and try again.
  pause
  exit /b 1
)

set "EXPO_NO_TELEMETRY=1"
"%NODE_EXE%" node_modules\expo\bin\cli start

if errorlevel 1 pause
