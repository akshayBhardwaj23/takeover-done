# ⚠️ Database Migration Required

## Critical: Multi-Tenant Security Fixes Need Database Changes

The security fixes added `connectionId` to `Order` and `Thread` models in the Prisma schema.
This requires a database migration.

### Schema Changes Made:

1. **Order Model**: Added `connectionId` field linking to `Connection`
2. **Thread Model**: Added `connectionId` field linking to `Connection`

### Migration Steps:

#### Step 1: Handle Existing Data

Since you have existing orders and threads in the database, you need to:

1. **Connect to your database** and ensure it's running
2. **Run this SQL to link existing data** (before the Prisma migration):

```sql
-- First, create a temporary default connection for existing data
-- Replace 'your-user-email@example.com' with your actual email
DO $$
DECLARE
  default_user_id TEXT;
  default_shopify_conn_id TEXT;
  default_email_conn_id TEXT;
BEGIN
  -- Get or create default user
  SELECT id INTO default_user_id FROM "User" WHERE email = 'your-user-email@example.com' LIMIT 1;

  IF default_user_id IS NULL THEN
    INSERT INTO "User" (id, email, "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, 'your-user-email@example.com', NOW(), NOW())
    RETURNING id INTO default_user_id;
  END IF;

  -- Get or create default Shopify connection
  SELECT id INTO default_shopify_conn_id
  FROM "Connection"
  WHERE "userId" = default_user_id AND type = 'SHOPIFY'
  LIMIT 1;

  IF default_shopify_conn_id IS NULL THEN
    INSERT INTO "Connection" (id, type, "accessToken", "userId", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, 'SHOPIFY', 'placeholder', default_user_id, NOW(), NOW())
    RETURNING id INTO default_shopify_conn_id;
  END IF;

  -- Get or create default Email connection
  SELECT id INTO default_email_conn_id
  FROM "Connection"
  WHERE "userId" = default_user_id AND type = 'CUSTOM_EMAIL'
  LIMIT 1;

  IF default_email_conn_id IS NULL THEN
    INSERT INTO "Connection" (id, type, "accessToken", "userId", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, 'CUSTOM_EMAIL', 'placeholder', default_user_id, NOW(), NOW())
    RETURNING id INTO default_email_conn_id;
  END IF;

  -- Now add the columns with the default connection
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "connectionId" TEXT;
  UPDATE "Order" SET "connectionId" = default_shopify_conn_id WHERE "connectionId" IS NULL;
  ALTER TABLE "Order" ALTER COLUMN "connectionId" SET NOT NULL;

  ALTER TABLE "Thread" ADD COLUMN IF NOT EXISTS "connectionId" TEXT;
  UPDATE "Thread" SET "connectionId" = default_email_conn_id WHERE "connectionId" IS NULL;
  ALTER TABLE "Thread" ALTER COLUMN "connectionId" SET NOT NULL;

  -- Add foreign key constraints
  ALTER TABLE "Order" ADD CONSTRAINT "Order_connectionId_fkey"
    FOREIGN KEY ("connectionId") REFERENCES "Connection"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

  ALTER TABLE "Thread" ADD CONSTRAINT "Thread_connectionId_fkey"
    FOREIGN KEY ("connectionId") REFERENCES "Connection"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
END $$;
```

#### Step 2: Run Prisma Commands

After the SQL above succeeds:

```bash
cd packages/db

# Generate Prisma client
pnpm prisma generate

# Push schema to database (since we manually added the columns)
pnpm prisma db push

# Or create migration if you prefer tracked migrations
pnpm prisma migrate dev --name add_connection_id_to_order_and_thread
```

#### Step 3: Verify

```bash
# Check the schema is correct
pnpm prisma db pull

# Verify data integrity
pnpm prisma studio
```

---

## Alternative: Fresh Start (Development Only)

If this is just dev/test data and you don't mind losing it:

```bash
cd packages/db

# Reset database (WARNING: Deletes all data!)
pnpm prisma migrate reset

# This will:
# 1. Drop all tables
# 2. Run all migrations
# 3. Seed data (if seed script exists)
```

---

## What These Changes Enable

Once the migration is complete, the application will have **proper multi-tenant security**:

✅ Users can only access their own orders
✅ Users can only access their own email threads
✅ Users can only access their own analytics
✅ Complete data isolation between tenants

**This is CRITICAL for production security!**

---

## Current Status

- ✅ Schema updated in `packages/db/prisma/schema.prisma`
- ✅ Prisma client generated
- ⏳ **Database migration pending** (blocked by database connection issue)
- ⏳ All tRPC endpoints updated with scoping logic (waiting for migration)

---

## Next Steps After Migration

1. Test authentication (try accessing without login)
2. Test multi-tenant isolation (create 2 users, verify they can't see each other's data)
3. Continue with rate limiting implementation
4. Add input validation
5. Implement webhook idempotency

---

## Troubleshooting

### "Can't reach database server"

Check your `packages/db/.env` file and verify:

```bash
DATABASE_URL="postgresql://user:password@host:port/database?params"
```

Make sure:

- Database server is running
- Credentials are correct
- Network allows connection
- Using correct port (5432 for direct, 6543 for pooler)

### "Column already exists"

If you get errors about columns existing, it means the SQL script partially ran. You can either:

1. Drop the columns and try again
2. Or just run `pnpm prisma db push` to sync the schema

---

## Contact

If you need help with the migration, check:

- Supabase dashboard for database status
- `packages/db/.env` for connection string
- Run `psql $DATABASE_URL` to test connection

