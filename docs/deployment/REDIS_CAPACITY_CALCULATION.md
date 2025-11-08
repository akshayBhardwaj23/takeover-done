# Redis Free Tier Capacity Calculation

## Upstash Free Tier Limits
- **500,000 commands/month**
- **50 GB bandwidth/month**
- **256 MB storage**

## Command Usage Breakdown (After Optimizations)

### 1. Webhook Idempotency (Optimized)
- **Before:** 2 commands per webhook (GET + SET)
- **After:** 1 command per webhook (SETNX atomic operation)
- **Commands per webhook:** 1

### 2. Worker Polling (Optimized)
- **Before:** Polling every ~1 second = ~60 commands/minute
- **After:** Polling every 5 seconds = ~12 commands/minute
- **Commands per minute:** ~12
- **Commands per hour:** ~720
- **Commands per day:** ~17,280
- **Commands per month:** ~518,400 (still over limit!)

### 3. Worker Job Processing
- **Per job:** ~10-15 commands (EVALSHA, DEL, RPOPLPUSH, HMGET, etc.)
- **Commands per job:** ~12 (average)

### 4. Queue Events
- **Per event:** ~2-3 commands
- **Commands per event:** ~2.5 (average)

## Capacity Scenarios

### Scenario A: Worker Running 24/7 (Current)
**Monthly baseline (worker only):**
- Worker polling: ~518,400 commands/month
- **Result:** ❌ Exceeds 500K limit even with 0 users!

**Problem:** Worker polling alone exceeds the free tier limit.

### Scenario B: Worker Only When Needed (Optimized)
**If worker only runs when jobs are queued:**
- Worker polling when idle: 0 commands
- Worker processing: ~12 commands per job
- Webhook idempotency: 1 command per webhook

**Monthly capacity calculation:**
- Reserve for worker overhead: ~50,000 commands/month
- Available for users: 450,000 commands/month
- Commands per user activity:
  - 1 order webhook: 1 command (SETNX)
  - 1 email webhook: 1 command (SETNX)
  - Worker processing email: ~12 commands
  - **Total per interaction:** ~14 commands

**Users per month:**
- 450,000 ÷ 14 = **~32,000 user interactions/month**
- If each user has ~10 interactions/month: **~3,200 users/month**
- If each user has ~5 interactions/month: **~6,400 users/month**

### Scenario C: Disable Worker Polling When Idle (Best)
**If worker only polls when jobs exist:**
- No idle polling = 0 baseline commands
- Only process jobs when they exist
- **Available for users:** ~500,000 commands/month

**Users per month:**
- 500,000 ÷ 14 = **~35,700 user interactions/month**
- If each user has ~10 interactions/month: **~3,570 users/month**
- If each user has ~5 interactions/month: **~7,140 users/month**

## Recommended Approach

### Option 1: Conditional Worker Polling (Recommended)
**Implement worker that only polls when jobs exist:**
- Use BullMQ's `getNextJob` with timeout instead of constant polling
- Or: Use scheduled jobs instead of continuous polling
- **Savings:** ~518,400 commands/month (entire free tier limit!)

### Option 2: Reduce Worker Polling Further
**If keeping worker running:**
- Increase polling interval to 10-15 seconds
- **Current:** 5 seconds = ~518K/month ❌
- **10 seconds:** ~259K/month ✅
- **15 seconds:** ~173K/month ✅

### Option 3: Database-Based Queues (Future)
**Replace BullMQ with database-backed queue:**
- Use `pg-boss` or similar PostgreSQL-based queue
- Zero Redis commands for queues
- **Available for users:** Full 500K commands/month

## Realistic Capacity (After Further Optimization)

### With Worker Polling at 10 seconds:
- Worker polling: ~259,200 commands/month
- Available for users: ~240,800 commands/month
- User interactions: ~17,200/month
- **Users (10 interactions each):** ~1,720 users/month
- **Users (5 interactions each):** ~3,440 users/month

### With Conditional Worker (No Idle Polling):
- Worker polling: ~0 commands/month (only when jobs exist)
- Available for users: ~500,000 commands/month
- User interactions: ~35,700/month
- **Users (10 interactions each):** ~3,570 users/month
- **Users (5 interactions each):** ~7,140 users/month

## Recommendations

1. **Immediate:** Increase worker polling to 10-15 seconds
2. **Short-term:** Implement conditional worker polling (only when jobs exist)
3. **Long-term:** Consider database-backed queues for better scalability

## Monitoring

Track these metrics:
- Commands per day (should stay under ~16,666/day for 500K/month)
- Worker polling frequency
- Jobs processed per day
- Webhooks received per day

Set alerts at:
- 400K commands/month (80% usage)
- 450K commands/month (90% usage)

