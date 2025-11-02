# Redis Service: How It Works

## 🔄 Redis vs Your Application

### Redis is a Separate Service

- **Redis** = Background service (like PostgreSQL, MySQL)
- **Your App** = Connects to Redis (doesn't manage it)

Think of it like this:
```
PostgreSQL Database  ←  Your App connects
Redis Server        ←  Your App connects
Your App (pnpm dev)  ←  You start this
```

---

## 🚀 How Redis Runs

### macOS (Homebrew):

```bash
# Start Redis (runs in background)
brew services start redis

# Redis automatically starts on boot ✅
# Keeps running even if you close terminal ✅
```

**What happens:**
1. Redis starts as a background service
2. Runs on `localhost:6379` by default
3. Stays running until you stop it or restart computer
4. `pnpm dev` connects to this existing Redis instance

### Linux:

```bash
# Start Redis (runs in background)
sudo systemctl start redis

# Enable auto-start on boot
sudo systemctl enable redis
```

---

## ⚙️ Starting/Stopping Redis

### Check if Redis is Running:

```bash
redis-cli ping
# Returns: PONG ✅ (Redis is running)
# Returns: Could not connect (Redis is NOT running)
```

### Start Redis:

**macOS:**
```bash
brew services start redis
```

**Linux:**
```bash
sudo systemctl start redis
```

### Stop Redis:

**macOS:**
```bash
brew services stop redis
```

**Linux:**
```bash
sudo systemctl stop redis
```

### Restart Redis:

**macOS:**
```bash
brew services restart redis
```

**Linux:**
```bash
sudo systemctl restart redis
```

---

## 📋 Typical Workflow

### First Time Setup (One-time):

```bash
# 1. Install Redis
brew install redis

# 2. Start Redis (runs in background)
brew services start redis

# 3. Verify it's running
redis-cli ping  # Should return: PONG

# Done! Redis will keep running in background
```

### Daily Development:

```bash
# 1. Redis is already running (background service)
# No need to start it again!

# 2. Just run your app
pnpm dev

# 3. App connects to Redis automatically
# You'll see: "[Redis] Connected successfully"
```

---

## 🔍 What Happens if Redis Isn't Running?

### If Redis is NOT running:

**Worker will show:**
```
Worker: REDIS_URL not set. Queues/workers are disabled.
```

**OR if REDIS_URL is set but Redis is down:**
```
[Redis] Connection error: connect ECONNREFUSED 127.0.0.1:6379
[Redis] Reconnecting...
```

**Rate limiting:**
- Falls back to in-memory rate limiting (works fine for dev)

**Background jobs:**
- Won't process (worker disabled)

---

## ✅ Best Practice: Auto-Start Redis

### macOS (Recommended):

```bash
# Start Redis and enable auto-start on boot
brew services start redis

# This makes Redis:
# ✅ Start automatically when computer boots
# ✅ Keep running in background
# ✅ Restart automatically if it crashes
```

### Verify Auto-Start:

```bash
# Check Redis service status
brew services list | grep redis

# Should show: redis started (auto-start enabled)
```

---

## 🛠️ Optional: Add Redis Check to Dev Script

You can add a check to warn if Redis isn't running. Create a helper script:

**`scripts/check-redis.sh`:**
```bash
#!/bin/bash
if ! redis-cli ping &> /dev/null; then
    echo "⚠️  Redis is not running!"
    echo "Start it with: brew services start redis"
    exit 1
fi
```

Then update `package.json`:
```json
{
  "scripts": {
    "dev": "node scripts/check-redis.js && turbo run dev --parallel"
  }
}
```

---

## 📊 Summary

| Question | Answer |
|----------|--------|
| **Does `pnpm dev` start Redis?** | ❌ No - Redis runs separately |
| **Does Redis run in background?** | ✅ Yes - It's a service |
| **Do I need to start Redis each time?** | ❌ No - Once started, it keeps running |
| **What if Redis isn't running?** | ⚠️ App will show warnings, some features disabled |
| **Does Redis auto-start on boot?** | ✅ Yes (if you use `brew services start`) |

---

## 🎯 Recommended Setup

### One-Time:
```bash
brew install redis
brew services start redis
```

### Daily:
```bash
# Redis is already running ✅
# Just run your app:
pnpm dev
```

**That's it!** Redis stays running in the background, and your app connects to it automatically.

