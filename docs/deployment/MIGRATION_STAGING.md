# Running Database Migrations in Staging

## Overview

Database migrations need to be run **manually** for staging. This guide shows you how to safely run migrations against your staging database.

## Prerequisites

- Access to your staging database connection string
- Your local development environment set up
- The migration files are already committed to your repository

## Step-by-Step Process

### 1. Get Your Staging Database URL

1. Go to your Supabase dashboard (or database provider)
2. Navigate to **Settings** → **Database**
3. Copy the **Connection String** (use port **5432** for migrations, NOT 6543)
   - Format: `postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres`
   - ⚠️ **Important**: Use direct connection (port 5432) for migrations, not the pooler

### 2. Backup Your Local Database URL

**Before changing anything, save your local development database URL:**

```bash
# Copy your current DATABASE_URL from packages/db/.env
# Save it somewhere safe - you'll need it back for local development!
```

### 3. Update DATABASE_URL Temporarily

**Option A: Edit the file directly (Recommended)**

1. Open `packages/db/.env` in your editor
2. **Save your current local DATABASE_URL** (copy it somewhere)
3. Replace the `DATABASE_URL` line with your staging connection string:
   ```bash
   DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"
   ```
4. Save the file

**Option B: Use terminal (one-time)**

```bash
cd packages/db
# Backup current .env
cp .env .env.local.backup

# Set staging URL (replace with your actual staging URL)
echo 'DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"' > .env
```

### 4. Run the Migration

```bash
# From project root
pnpm db:migrate
```

Or if you're in the packages/db directory:

```bash
cd packages/db
pnpm prisma migrate deploy
```

**Expected output:**

```
Applying migration `20241120_add_performance_indexes`
✔ Applied migration `20241120_add_performance_indexes` in 234ms
```

### 5. Verify Migration Succeeded

**Option A: Check migration status**

```bash
cd packages/db
pnpm prisma migrate status
```

**Option B: Open Prisma Studio**

```bash
cd packages/db
pnpm prisma studio
```

This opens a browser window where you can verify the indexes were created.

**Option C: Check database directly**

- Go to Supabase Dashboard → **Table Editor**
- Check that indexes exist on `Connection` and `Message` tables

### 6. Restore Your Local Database URL

**⚠️ CRITICAL: Change back to your local development URL!**

1. Open `packages/db/.env`
2. Replace the staging URL with your local development URL
3. Save the file

Or restore from backup:

```bash
cd packages/db
cp .env.local.backup .env
```

### 7. Verify Local Development Still Works

```bash
# Test that local database connection works
cd packages/db
pnpm prisma studio
```

If Prisma Studio opens and shows your local database, you're good!

## Alternative: Using Environment Variable Override

Instead of editing `.env`, you can override it temporarily:

```bash
# Set staging URL as environment variable
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"

# Run migration
cd packages/db
pnpm prisma migrate deploy

# Unset the variable
unset DATABASE_URL
```

## For Production

The same process applies, but:

1. Use your **production** database connection string
2. Be extra careful - test in staging first!
3. Consider running during low-traffic hours
4. Have a rollback plan ready

## Troubleshooting

### Error: "Tenant or user not found"

- ✅ Verify your password is correct (no extra spaces)
- ✅ Check that you're using port **5432** (direct connection), not 6543
- ✅ Verify project reference is correct

### Error: "Migration already applied"

- This is fine! It means the migration was already run
- Check `prisma migrate status` to see current state

### Error: "Connection timeout"

- Check your database is accessible
- Verify firewall/network settings
- Try using the connection pooler URL (port 6543) if direct connection fails

### Migration fails partway through

- Check the error message
- You may need to manually fix the database state
- Consider rolling back if possible

## Safety Tips

1. **Always backup your local `.env`** before changing it
2. **Test migrations in staging** before production
3. **Verify the migration** after running it
4. **Change back to local URL** immediately after
5. **Document what you did** for the team

## Quick Reference

```bash
# 1. Backup local .env
cp packages/db/.env packages/db/.env.local.backup

# 2. Update to staging URL (edit .env file)

# 3. Run migration
pnpm db:migrate

# 4. Verify
cd packages/db && pnpm prisma migrate status

# 5. Restore local .env
cp packages/db/.env.local.backup packages/db/.env
```

---

**Note:** For this specific migration (performance indexes), the migration should complete in seconds and won't lock tables, so it's safe to run anytime.
