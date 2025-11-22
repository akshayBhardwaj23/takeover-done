# Fix Database Connection for Migrations

## Current Problem

You're using: `pooler.supabase.com:5432` ❌

This doesn't work because:

- Pooler URLs need port **6543**, not 5432
- OR you need the **direct connection** URL

## Solution Options

### Option 1: Use Pooler with Correct Port (Quick Fix)

Edit `packages/db/.env`:

```bash
DATABASE_URL=postgresql://postgres.wuggwjnpkhrdkazrhkcb:zyypstagingdb@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Changes:**

- Port: `5432` → `6543`
- Added: `?pgbouncer=true`

### Option 2: Use Direct Connection (Recommended for Migrations)

1. Go to **Supabase Dashboard** → Your Project
2. **Settings** → **Database**
3. Under **Connection string**, select **URI** tab (NOT "Connection pooling")
4. Copy the direct connection string

It should look like:

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**Note:** Replace `[PASSWORD]` and `[PROJECT-REF]` with your actual values.

### Option 3: Check Supabase Connection Settings

If neither works, check:

1. **Supabase Dashboard** → **Settings** → **Database**
2. Verify **Connection pooling** is enabled
3. Check if there are any **IP restrictions** or **firewall rules**
4. Verify your **database password** is correct

## After Fixing

Test the connection:

```bash
cd packages/db
pnpm prisma migrate status
```

If it works, create the migration:

```bash
pnpm prisma migrate dev --name add_performance_indexes
```

## Common Issues

### "Can't reach database server"

- ✅ Check you're using the correct port (6543 for pooler, 5432 for direct)
- ✅ Verify password is correct (no extra spaces)
- ✅ Check if Supabase project is paused (free tier pauses after inactivity)

### "Tenant or user not found"

- ✅ Verify project reference in URL is correct
- ✅ Check password doesn't have special characters that need URL encoding
- ✅ Try using direct connection instead of pooler

### "Connection timeout"

- ✅ Check your internet connection
- ✅ Verify Supabase project is active (not paused)
- ✅ Try direct connection URL
