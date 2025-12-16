-- CreateTable (with IF NOT EXISTS check)
CREATE TABLE IF NOT EXISTS "MetaAdsAIReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT,
    "adAccountId" TEXT NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "insights" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaAdsAIReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (check if index doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'MetaAdsAIReview_userId_createdAt_idx'
    ) THEN
        CREATE INDEX "MetaAdsAIReview_userId_createdAt_idx" ON "MetaAdsAIReview"("userId", "createdAt");
    END IF;
END $$;

-- CreateIndex (check if index doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'MetaAdsAIReview_adAccountId_idx'
    ) THEN
        CREATE INDEX "MetaAdsAIReview_adAccountId_idx" ON "MetaAdsAIReview"("adAccountId");
    END IF;
END $$;

-- CreateIndex (check if unique index doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'MetaAdsAIReview_userId_reviewDate_key'
    ) THEN
        CREATE UNIQUE INDEX "MetaAdsAIReview_userId_reviewDate_key" ON "MetaAdsAIReview"("userId", "reviewDate");
    END IF;
END $$;

-- AddForeignKey (check if constraint doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'MetaAdsAIReview_userId_fkey'
    ) THEN
        ALTER TABLE "MetaAdsAIReview" ADD CONSTRAINT "MetaAdsAIReview_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (check if constraint doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'MetaAdsAIReview_connectionId_fkey'
    ) THEN
        ALTER TABLE "MetaAdsAIReview" ADD CONSTRAINT "MetaAdsAIReview_connectionId_fkey" 
        FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

