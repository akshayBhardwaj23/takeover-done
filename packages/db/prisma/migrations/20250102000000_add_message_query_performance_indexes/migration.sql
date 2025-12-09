-- Add composite indexes for optimized message queries
-- These indexes improve performance for:
-- 1. Thread-based queries with ordering (threadId + createdAt)
-- 2. Pending email count calculation (orderId + createdAt + direction)

-- Index for thread-based queries with ordering
CREATE INDEX IF NOT EXISTS "Message_threadId_createdAt_idx" ON "Message"("threadId", "createdAt");

-- Index for pending email count calculation (optimizes the window function query)
CREATE INDEX IF NOT EXISTS "Message_orderId_createdAt_direction_idx" ON "Message"("orderId", "createdAt", "direction");

