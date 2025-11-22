#!/bin/bash

# BetFun Arena - Development Startup Script

echo "🚀 Starting BetFun Arena Development Environment..."
echo ""

# Check if .env files exist
if [ ! -f "apps/web/.env.local" ]; then
    echo "⚠️  Frontend .env.local not found!"
    echo "Run 'npm run setup:env' first."
    exit 1
fi

if [ ! -f "packages/api/.env" ]; then
    echo "⚠️  API .env not found!"
    echo "Run 'npm run setup:env' first."
    exit 1
fi

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "⚠️  Redis is not running!"
    echo "Starting Redis..."
    if command -v redis-server &> /dev/null; then
        redis-server --daemonize yes
        echo "✅ Redis started"
    else
        echo "❌ Redis not installed. Install with: brew install redis"
        echo "Or use Redis Cloud: https://redis.com/try-free/"
        exit 1
    fi
fi

# Start all services
echo ""
echo "🎯 Starting all services..."
echo ""
echo "📱 Frontend:  http://localhost:3000"
echo "🔧 API:       http://localhost:3001"
echo "🔌 WebSocket: http://localhost:3002"
echo "📡 Indexer:   Running in background"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Use concurrently to run all services
npm run dev

