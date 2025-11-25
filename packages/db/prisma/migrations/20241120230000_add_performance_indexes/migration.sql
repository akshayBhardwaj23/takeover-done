-- CreateIndex
CREATE INDEX IF NOT EXISTS "Connection_userId_idx" ON "Connection"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Connection_userId_createdAt_idx" ON "Connection"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_direction_createdAt_idx" ON "Message"("direction", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_threadId_idx" ON "Message"("threadId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_orderId_idx" ON "Message"("orderId");

