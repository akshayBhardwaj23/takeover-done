# Database Appears Empty - Diagnostic Steps

## Quick Checks

### 1. Verify You're Looking at the Right Database

**Check your DATABASE_URL:**
```bash
cd packages/db
cat .env | grep DATABASE_URL
```

**In Supabase Dashboard:**
- Go to your Supabase project
- Check the project reference in the URL matches your DATABASE_URL
- Make sure you're looking at **staging** project, not production or a different project

### 2. Check if Tables Exist

**Using Prisma Studio (Visual):**
```bash
cd packages/db
pnpm prisma studio
```
This opens a browser where you can see all tables and data.

**Using Supabase Dashboard:**
- Go to **Table Editor**
- Check if tables like `User`, `Connection`, `Message`, `Order` exist
- Check if they have any rows

### 3. Verify Database Connection

**Test connection:**
```bash
cd packages/db
pnpm prisma migrate status
```

If this works, you're connected to the right database.

### 4. Check Migration History

**See what migrations were applied:**
```bash
cd packages/db
pnpm prisma db execute --stdin <<< "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10;"
```

## Common Causes

### ✅ Database Was Already Empty
- If this is a new staging database, it might have been empty from the start
- Migrations create tables but don't add data
- You need to create users/connections through the app

### ✅ Wrong Database/Project
- You might be looking at a different Supabase project
- Check the project reference in DATABASE_URL matches Supabase Dashboard

### ✅ Connection Pooler Issue
- Pooler connections sometimes show cached/empty results
- Try using direct connection (port 5432) instead of pooler (6543)

### ❌ Migration Did NOT Delete Data
- The performance indexes migration only creates indexes
- It cannot and did not delete any data
- If data is missing, it was missing before the migration

## Recovery Steps

### If Data Was Actually Lost

1. **Check Supabase Backups:**
   - Supabase automatically backs up databases
   - Go to Settings → Database → Backups
   - You can restore from a backup

2. **Check if you have a local backup:**
   ```bash
   # If you have a dump file
   pg_restore -d your_database dump_file.sql
   ```

3. **Check Git History:**
   - See if there were any other migrations run
   - Check if DATABASE_URL was changed recently

## Prevention

- Always verify DATABASE_URL before running migrations
- Use `prisma migrate status` to check what will be applied
- Review migration.sql files before applying
- Keep database backups

