#!/bin/bash

# Setup script for local Redis (development only)
# This script helps install and configure local Redis for development

echo "🔧 Setting up local Redis for development..."

# Check if Redis is already installed
if command -v redis-cli &> /dev/null; then
    echo "✅ Redis is already installed"
    redis-cli ping
else
    echo "📦 Installing Redis..."
    
    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install redis
            # Don't auto-start Redis - user will start manually when needed
            echo "✅ Redis installed via Homebrew"
            echo "💡 Redis will NOT auto-start. Use ./scripts/start-redis.sh when needed"
        else
            echo "❌ Homebrew not found. Please install Redis manually:"
            echo "   brew install redis && brew services start redis"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y redis-server
            sudo systemctl start redis
            echo "✅ Redis installed and started via apt-get"
        elif command -v yum &> /dev/null; then
            sudo yum install -y redis
            sudo systemctl start redis
            echo "✅ Redis installed and started via yum"
        else
            echo "❌ Package manager not found. Please install Redis manually."
            exit 1
        fi
    else
        echo "❌ Unsupported OS. Please install Redis manually."
        exit 1
    fi
fi

# Verify Redis is running
if redis-cli ping &> /dev/null; then
    echo "✅ Redis is running and responding"
    echo ""
    echo "📝 Next steps:"
    echo "1. Update apps/web/.env.local:"
    echo "   REDIS_URL=redis://localhost:6379"
    echo "   (Remove UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)"
    echo ""
    echo "2. Update apps/worker/.env:"
    echo "   REDIS_URL=redis://localhost:6379"
    echo ""
    echo "3. Restart your dev server:"
    echo "   pnpm dev"
    echo ""
    echo "🎉 Local Redis setup complete! Development will now use local Redis."
    echo "   Upstash quota will be saved for staging/production use."
else
    echo "❌ Redis is not responding. Please check the installation."
    exit 1
fi

