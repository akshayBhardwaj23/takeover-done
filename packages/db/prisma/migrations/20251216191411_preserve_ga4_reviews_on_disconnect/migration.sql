-- Make connectionId nullable to preserve reviews after disconnection (global cooldown)
DO $$
BEGIN
    -- Drop the old unique constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'GA4AIReview_userId_connectionId_reviewDate_key'
    ) THEN
        ALTER TABLE "GA4AIReview" DROP CONSTRAINT "GA4AIReview_userId_connectionId_reviewDate_key";
    END IF;
END $$;

-- Drop the old foreign key constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'GA4AIReview_connectionId_fkey'
    ) THEN
        ALTER TABLE "GA4AIReview" DROP CONSTRAINT "GA4AIReview_connectionId_fkey";
    END IF;
END $$;

-- Make connectionId nullable
ALTER TABLE "GA4AIReview" ALTER COLUMN "connectionId" DROP NOT NULL;

-- Recreate foreign key with SET NULL instead of CASCADE (preserves reviews on disconnect)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'GA4AIReview_connectionId_fkey'
    ) THEN
        ALTER TABLE "GA4AIReview" ADD CONSTRAINT "GA4AIReview_connectionId_fkey" 
        FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Create new unique constraint without connectionId (global cooldown per user)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'GA4AIReview_userId_reviewDate_key'
    ) THEN
        CREATE UNIQUE INDEX "GA4AIReview_userId_reviewDate_key" ON "GA4AIReview"("userId", "reviewDate");
    END IF;
END $$;

