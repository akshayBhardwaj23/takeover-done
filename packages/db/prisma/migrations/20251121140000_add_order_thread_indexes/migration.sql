-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_connectionId_idx" ON "Order"("connectionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_connectionId_createdAt_idx" ON "Order"("connectionId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Thread_connectionId_idx" ON "Thread"("connectionId");

