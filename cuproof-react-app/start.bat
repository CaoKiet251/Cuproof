@echo off
REM Cuproof React Application Startup Script for Windows
REM This script helps you start the complete Cuproof React + Node.js system

echo 🚀 Starting Cuproof React Application System
echo ==========================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the cuproof-react-app directory
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing root dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Error: Failed to install root dependencies
        pause
        exit /b 1
    )
)

if not exist "client\node_modules" (
    echo 📦 Installing client dependencies...
    cd client
    npm install
    if errorlevel 1 (
        echo ❌ Error: Failed to install client dependencies
        pause
        exit /b 1
    )
    cd ..
)

if not exist "server\node_modules" (
    echo 📦 Installing server dependencies...
    cd server
    npm install
    if errorlevel 1 (
        echo ❌ Error: Failed to install server dependencies
        pause
        exit /b 1
    )
    cd ..
)

echo ✅ Dependencies installed

REM Check if Cuproof CLI is available
echo 🔍 Checking Cuproof CLI availability...
if exist "..\target\release\cuproof.exe" (
    echo ✅ Cuproof CLI found
) else (
    echo ⚠️  Warning: Cuproof CLI not found. Please compile it first:
    echo    cd .. ^&^& cargo build --release
    echo    Press any key to continue anyway, or Ctrl+C to exit
    pause
)

REM Check if Hardhat blockchain is running
echo 🔍 Checking Hardhat blockchain...
curl -s http://localhost:8545 >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Warning: Hardhat blockchain is not running.
    echo    Please start it in another terminal:
    echo    cd ..\cuproof-blockchain ^&^& npm run node
    echo    Press any key to continue anyway, or Ctrl+C to exit
    pause
)

REM Create environment file if it doesn't exist
if not exist "server\.env" (
    echo 📝 Creating server .env file...
    (
        echo PORT=3001
        echo NODE_ENV=development
        echo CLIENT_URL=http://localhost:3000
        echo CUPROOF_VERIFIER_ADDRESS=
        echo CUPROOF_REGISTRY_ADDRESS=
    ) > server\.env
    echo ✅ Created server .env file
    echo ⚠️  Please update the contract addresses in server\.env
)

echo.
echo 🎉 Setup complete! Starting the React application...
echo.
echo 📋 Next steps:
echo 1. Make sure MetaMask is installed and connected to Hardhat network
echo 2. Update contract addresses in server\.env if needed
echo 3. Open http://localhost:3000 in your browser
echo.
echo 🛠️  Available commands:
echo    npm run dev          # Start both frontend and backend
echo    npm run client       # Start only frontend
echo    npm run server       # Start only backend
echo    npm run build        # Build for production
echo.

REM Start the development servers
echo 🚀 Starting React + Node.js development servers...
npm run dev
