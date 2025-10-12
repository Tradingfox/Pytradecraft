#!/bin/bash

# PyTradeCraft Backend Startup Script
# This script helps start the backend server with proper checks

echo "=================================="
echo "PyTradeCraft Backend Startup"
echo "=================================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
    echo ""
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found."
    echo "   Creating from .env.local.example..."
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        echo "✅ Created .env.local file"
        echo "   Please edit .env.local and add your GEMINI_API_KEY"
        echo ""
    else
        echo "⚠️  .env.local.example not found either"
        echo "   Please create .env.local manually with your configuration"
        echo ""
    fi
fi

# Check if port 3001 is already in use
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 3001 is already in use"
    echo "   A server might already be running"
    echo ""
    read -p "Do you want to kill the existing process and restart? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping existing server..."
        lsof -ti :3001 | xargs kill -9 2>/dev/null
        sleep 2
        echo "✅ Stopped existing server"
        echo ""
    else
        echo "❌ Exiting. Please stop the existing server first."
        exit 1
    fi
fi

# Start the backend server
echo "🚀 Starting backend server on port 3001..."
echo "   API endpoints will be available at http://localhost:3001/api"
echo "   Press Ctrl+C to stop the server"
echo ""
npm run server
