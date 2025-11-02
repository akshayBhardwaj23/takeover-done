#!/bin/bash

# Script to start Redis, run dev server, and stop Redis when done

echo "🔧 Starting Redis for development..."

# Start Redis if not running
if ! redis-cli ping &> /dev/null; then
    echo "🚀 Starting Redis..."
    redis-server --daemonize yes --port 6379
    sleep 1
    
    if ! redis-cli ping &> /dev/null; then
        echo "❌ Failed to start Redis"
        exit 1
    fi
    echo "✅ Redis started"
    REDIS_STARTED_BY_SCRIPT=true
else
    echo "✅ Redis is already running"
    REDIS_STARTED_BY_SCRIPT=false
fi

# Trap to stop Redis when script exits
cleanup() {
    if [ "$REDIS_STARTED_BY_SCRIPT" = true ]; then
        echo ""
        echo "🛑 Stopping Redis..."
        redis-cli shutdown &> /dev/null
        echo "✅ Redis stopped"
    fi
}

trap cleanup EXIT INT TERM

# Run the dev server
echo "🚀 Starting dev server..."
echo "💡 Press Ctrl+C to stop both Redis and dev server"
echo ""

cd "$(dirname "$0")/.."
pnpm dev

