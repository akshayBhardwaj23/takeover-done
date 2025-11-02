# Manual Redis Setup (Start/Stop When Needed)

## 🎯 Goal

Redis will **NOT** run in the background all the time.  
Start it only when you need to develop, stop it when done.

---

## 🚀 Quick Start

### Option 1: Automated Script (Recommended)

**Start Redis + Dev Server (stops Redis when you exit):**
```bash
./scripts/dev-with-redis.sh
```

This script:
- ✅ Starts Redis if not running
- ✅ Runs `pnpm dev`
- ✅ Stops Redis automatically when you press Ctrl+C

**That's it!** Easiest way to work.

---

### Option 2: Manual Control

**Start Redis:**
```bash
./scripts/start-redis.sh
```

**Run dev server:**
```bash
pnpm dev
```

**Stop Redis when done:**
```bash
./scripts/stop-redis.sh
```

---

## 📋 Detailed Commands

### Start Redis (Manual):

```bash
# Start Redis in background (this session only)
redis-server --daemonize yes

# OR use the helper script
./scripts/start-redis.sh
```

**What happens:**
- Redis starts and runs
- Stays running until you stop it or close terminal
- Does NOT auto-start on computer boot ✅

### Stop Redis:

```bash
# Stop Redis
redis-cli shutdown

# OR use the helper script
./scripts/stop-redis.sh
```

### Check if Redis is Running:

```bash
redis-cli ping
# Returns: PONG ✅ (running)
# Returns: Could not connect (not running)
```

---

## 🔧 Setup Scripts

### Scripts Created:

1. **`scripts/start-redis.sh`**
   - Starts Redis if not running
   - Quick helper command

2. **`scripts/stop-redis.sh`**
   - Stops Redis safely
   - Quick helper command

3. **`scripts/dev-with-redis.sh`**
   - Starts Redis → Runs dev → Stops Redis on exit
   - **Recommended for daily use!**

---

## ✅ Daily Workflow

### Recommended Workflow:

```bash
# 1. Start Redis + Dev (one command!)
./scripts/dev-with-redis.sh

# 2. Work on your app...

# 3. Press Ctrl+C when done
# Redis automatically stops ✅
```

### Alternative Workflow:

```bash
# 1. Start Redis
./scripts/start-redis.sh

# 2. Run dev server (in another terminal)
pnpm dev

# 3. When done, stop Redis
./scripts/stop-redis.sh
```

---

## 🚫 Disable Auto-Start (If Already Enabled)

If you previously used `brew services start redis`:

```bash
# Stop and disable auto-start
brew services stop redis

# Verify it won't auto-start
brew services list | grep redis
# Should show: redis stopped (not "started")
```

Now Redis will only run when you manually start it.

---

## 📊 Comparison

| Method | Auto-Start? | Always Running? | Start Command |
|--------|-------------|----------------|---------------|
| **`brew services start`** | ✅ Yes (on boot) | ✅ Yes (always) | Not needed |
| **Manual (`redis-server`)`** | ❌ No | ⚠️ Only when started | `./scripts/start-redis.sh` |
| **Dev Script** | ❌ No | ❌ Only during dev | `./scripts/dev-with-redis.sh` |

---

## 🎯 Recommended: Use Dev Script

**Best option:** Use `./scripts/dev-with-redis.sh`

**Why:**
- ✅ Redis only runs during development
- ✅ Automatically stops when you're done
- ✅ One command to start everything
- ✅ No need to remember to stop Redis

**Usage:**
```bash
# Just run this when you want to develop:
./scripts/dev-with-redis.sh
```

---

## 🛠️ Troubleshooting

### "Redis not running" error:

```bash
# Start Redis first
./scripts/start-redis.sh

# Then run dev
pnpm dev
```

### "Port 6379 already in use":

```bash
# Redis is already running from another session
# Check if it's running:
redis-cli ping

# If yes, you're good to go!
# If no, kill the process:
lsof -ti:6379 | xargs kill
```

### Want to verify Redis status:

```bash
redis-cli ping
# PONG = running ✅
# Error = not running ❌
```

---

## 💡 Pro Tips

1. **Use the dev script** (`./scripts/dev-with-redis.sh`) - easiest way
2. **Check status** with `redis-cli ping` if unsure
3. **Stop Redis** with `./scripts/stop-redis.sh` when done
4. **No auto-start** = Redis won't waste resources when not developing

---

## ✅ Summary

- ✅ Redis **NOT** running in background all the time
- ✅ Start only when needed (`./scripts/dev-with-redis.sh`)
- ✅ Stops automatically when dev server stops
- ✅ No resource waste when not developing

**Recommended:** Just use `./scripts/dev-with-redis.sh` every time you develop!

