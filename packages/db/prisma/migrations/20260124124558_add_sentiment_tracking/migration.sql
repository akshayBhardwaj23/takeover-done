-- CreateEnum
CREATE TYPE "SentimentSource" AS ENUM ('EMAIL', 'ORDER', 'RETURN_REQUEST');

-- CreateEnum
CREATE TYPE "SentimentType" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'FRUSTRATED', 'ANGRY');

-- CreateTable
CREATE TABLE "SentimentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "SentimentSource" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sentiment" "SentimentType" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "customerEmail" TEXT,
    "customerId" TEXT,
    "orderId" TEXT,
    "connectionId" TEXT,
    "metadata" JSONB,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentimentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SentimentRecord_userId_analyzedAt_idx" ON "SentimentRecord"("userId", "analyzedAt");

-- CreateIndex
CREATE INDEX "SentimentRecord_userId_source_idx" ON "SentimentRecord"("userId", "source");

-- CreateIndex
CREATE INDEX "SentimentRecord_customerId_idx" ON "SentimentRecord"("customerId");

-- CreateIndex
CREATE INDEX "SentimentRecord_orderId_idx" ON "SentimentRecord"("orderId");

-- CreateIndex
CREATE INDEX "SentimentRecord_connectionId_idx" ON "SentimentRecord"("connectionId");

-- CreateIndex
CREATE INDEX "SentimentRecord_sentiment_idx" ON "SentimentRecord"("sentiment");

-- AddForeignKey
ALTER TABLE "SentimentRecord" ADD CONSTRAINT "SentimentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentimentRecord" ADD CONSTRAINT "SentimentRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentimentRecord" ADD CONSTRAINT "SentimentRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentimentRecord" ADD CONSTRAINT "SentimentRecord_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
