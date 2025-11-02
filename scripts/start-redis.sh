#!/bin/bash

# Start Redis server (not as a service, just for this session)
echo "🚀 Starting Redis server..."

# Check if Redis is already running
if redis-cli ping &> /dev/null; then
    echo "✅ Redis is already running"
    exit 0
fi

# Start Redis in foreground (will block until Ctrl+C)
# Use --daemonize yes to run in background for this session
redis-server --daemonize yes --port 6379

# Wait a moment for Redis to start
sleep 1

# Verify it started
if redis-cli ping &> /dev/null; then
    echo "✅ Redis started successfully"
    echo "💡 To stop Redis: redis-cli shutdown"
else
    echo "❌ Failed to start Redis"
    exit 1
fi

