-- AlterTable
ALTER TABLE "Thread" ADD COLUMN "isUnread" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Thread" ADD COLUMN "isFlagged" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Thread_isUnread_idx" ON "Thread"("isUnread");

-- CreateIndex
CREATE INDEX "Thread_isFlagged_idx" ON "Thread"("isFlagged");

