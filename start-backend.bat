@echo off
REM PyTradeCraft Backend Startup Script (Windows)
REM This script helps start the backend server with proper checks

echo ==================================
echo PyTradeCraft Backend Startup
echo ==================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Warning: node_modules not found. Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Error: Failed to install dependencies
        exit /b 1
    )
    echo Success: Dependencies installed successfully
    echo.
)

REM Check if .env.local exists
if not exist ".env.local" (
    echo Warning: .env.local not found.
    echo Creating from .env.local.example...
    if exist ".env.local.example" (
        copy .env.local.example .env.local >nul
        echo Success: Created .env.local file
        echo Please edit .env.local and add your GEMINI_API_KEY
        echo.
    ) else (
        echo Warning: .env.local.example not found either
        echo Please create .env.local manually with your configuration
        echo.
    )
)

REM Check if port 3001 is already in use
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo Warning: Port 3001 is already in use
    echo A server might already be running
    echo.
    set /p choice="Do you want to kill the existing process and restart? (y/N): "
    if /i "%choice%"=="y" (
        echo Stopping existing server...
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
            taskkill /F /PID %%a >nul 2>&1
        )
        timeout /t 2 /nobreak >nul
        echo Success: Stopped existing server
        echo.
    ) else (
        echo Error: Exiting. Please stop the existing server first.
        exit /b 1
    )
)

REM Start the backend server
echo Starting backend server on port 3001...
echo API endpoints will be available at http://localhost:3001/api
echo Press Ctrl+C to stop the server
echo.
npm run server
