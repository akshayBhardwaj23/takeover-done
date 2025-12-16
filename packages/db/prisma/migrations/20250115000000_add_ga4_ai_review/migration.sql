-- CreateTable
CREATE TABLE "GA4AIReview" (
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

-- CreateIndex
CREATE INDEX "GA4AIReview_userId_createdAt_idx" ON "GA4AIReview"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GA4AIReview_connectionId_idx" ON "GA4AIReview"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "GA4AIReview_userId_connectionId_reviewDate_key" ON "GA4AIReview"("userId", "connectionId", "reviewDate");

-- AddForeignKey
ALTER TABLE "GA4AIReview" ADD CONSTRAINT "GA4AIReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GA4AIReview" ADD CONSTRAINT "GA4AIReview_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

