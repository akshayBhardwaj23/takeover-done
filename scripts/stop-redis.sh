#!/bin/bash

# Stop Redis server
echo "🛑 Stopping Redis server..."

if redis-cli ping &> /dev/null; then
    redis-cli shutdown
    echo "✅ Redis stopped"
else
    echo "ℹ️  Redis is not running"
fi

