# How to Check if Indexes Exist in Production Database

## Method 1: Using Prisma (Recommended)

### Step 1: Connect to Production Database

**Temporarily update your `.env` file:**
```bash
cd packages/db
# Backup current .env
cp .env .env.staging.backup

# Update DATABASE_URL to production
# Edit .env and replace DATABASE_URL with production connection string
```

### Step 2: Check Indexes

```bash
cd packages/db
pnpm prisma db execute --stdin <<< "SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename IN ('Connection', 'Message') 
  AND (
    indexname LIKE '%userId%' 
    OR indexname LIKE '%direction%' 
    OR indexname LIKE '%threadId%' 
    OR indexname LIKE '%orderId%'
  )
ORDER BY tablename, indexname;"
```

**Expected output if indexes exist:**
```
Connection | Connection_userId_idx | CREATE INDEX ...
Connection | Connection_userId_createdAt_idx | CREATE INDEX ...
Message | Message_direction_createdAt_idx | CREATE INDEX ...
Message | Message_threadId_idx | CREATE INDEX ...
Message | Message_orderId_idx | CREATE INDEX ...
```

### Step 3: Restore Staging .env

```bash
cp .env.staging.backup .env
```

## Method 2: Using Supabase Dashboard

1. Go to **Supabase Dashboard** → Your Production Project
2. Navigate to **Database** → **Indexes** (or **SQL Editor**)
3. Run this SQL query:

```sql
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename IN ('Connection', 'Message') 
  AND (
    indexname LIKE '%userId%' 
    OR indexname LIKE '%direction%' 
    OR indexname LIKE '%threadId%' 
    OR indexname LIKE '%orderId%'
  )
ORDER BY tablename, indexname;
```

## Method 3: Check Migration Status

```bash
cd packages/db
# Make sure DATABASE_URL points to production
pnpm prisma migrate status
```

**Look for:**
- `Database schema is up to date!` ✅
- Or list of applied migrations including `20251121134847_add_performance_indexes`

## Method 4: Quick Index Count Check

```bash
cd packages/db
pnpm prisma db execute --stdin <<< "SELECT 
  COUNT(*) as index_count,
  'Connection indexes' as table_name
FROM pg_indexes 
WHERE tablename = 'Connection' 
  AND (indexname LIKE '%userId%')
UNION ALL
SELECT 
  COUNT(*) as index_count,
  'Message indexes' as table_name
FROM pg_indexes 
WHERE tablename = 'Message' 
  AND (indexname LIKE '%direction%' OR indexname LIKE '%threadId%' OR indexname LIKE '%orderId%');"
```

**Expected:**
- Connection indexes: 2 (userId, userId_createdAt)
- Message indexes: 3 (direction_createdAt, threadId, orderId)

## Method 5: Check via Prisma Studio

```bash
cd packages/db
# Make sure DATABASE_URL points to production
pnpm prisma studio
```

Then in the browser:
- Look at table structures
- Indexes are shown in the table schema view

## Verification Checklist

✅ **Indexes that should exist:**

**Connection table:**
- `Connection_userId_idx`
- `Connection_userId_createdAt_idx`

**Message table:**
- `Message_direction_createdAt_idx`
- `Message_threadId_idx`
- `Message_orderId_idx`

## Troubleshooting

### If indexes are missing:

1. **Check if migration was applied:**
   ```bash
   pnpm prisma migrate status
   ```

2. **Manually apply migration:**
   ```bash
   pnpm prisma migrate deploy
   ```

3. **Or manually create indexes:**
   ```sql
   CREATE INDEX IF NOT EXISTS "Connection_userId_idx" ON "Connection"("userId");
   CREATE INDEX IF NOT EXISTS "Connection_userId_createdAt_idx" ON "Connection"("userId", "createdAt");
   CREATE INDEX IF NOT EXISTS "Message_direction_createdAt_idx" ON "Message"("direction", "createdAt");
   CREATE INDEX IF NOT EXISTS "Message_threadId_idx" ON "Message"("threadId");
   CREATE INDEX IF NOT EXISTS "Message_orderId_idx" ON "Message"("orderId");
   ```

## Safety Note

⚠️ **Always verify you're connected to the correct database before running commands!**

Check your DATABASE_URL:
```bash
cat packages/db/.env | grep DATABASE_URL
```

Make sure it points to production, not staging or local.

