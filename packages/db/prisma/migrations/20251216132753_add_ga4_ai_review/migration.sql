-- CreateTable (with IF NOT EXISTS check)
CREATE TABLE IF NOT EXISTS "GA4AIReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "insights" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GA4AIReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (check if index doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'GA4AIReview_userId_createdAt_idx'
    ) THEN
        CREATE INDEX "GA4AIReview_userId_createdAt_idx" ON "GA4AIReview"("userId", "createdAt");
    END IF;
END $$;

-- CreateIndex (check if index doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'GA4AIReview_connectionId_idx'
    ) THEN
        CREATE INDEX "GA4AIReview_connectionId_idx" ON "GA4AIReview"("connectionId");
    END IF;
END $$;

-- CreateIndex (check if unique index doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'GA4AIReview_userId_connectionId_reviewDate_key'
    ) THEN
        CREATE UNIQUE INDEX "GA4AIReview_userId_connectionId_reviewDate_key" ON "GA4AIReview"("userId", "connectionId", "reviewDate");
    END IF;
END $$;

-- AddForeignKey (check if constraint doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'GA4AIReview_userId_fkey'
    ) THEN
        ALTER TABLE "GA4AIReview" ADD CONSTRAINT "GA4AIReview_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (check if constraint doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'GA4AIReview_connectionId_fkey'
    ) THEN
        ALTER TABLE "GA4AIReview" ADD CONSTRAINT "GA4AIReview_connectionId_fkey" 
        FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

