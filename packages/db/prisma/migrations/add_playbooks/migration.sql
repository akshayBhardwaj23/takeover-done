-- CreateEnum
CREATE TYPE "PlaybookCategory" AS ENUM ('REFUND_RETURN', 'MARKETING', 'FULFILLMENT', 'SUPPORT', 'INVENTORY', 'CUSTOM');

-- CreateTable
CREATE TABLE "Playbook" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "PlaybookCategory" NOT NULL,
    "trigger" JSONB NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "confidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "lastExecutedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybookExecution" (
    "id" TEXT NOT NULL,
    "playbookId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "triggerData" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "PlaybookExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Playbook_userId_category_idx" ON "Playbook"("userId", "category");

-- CreateIndex
CREATE INDEX "Playbook_enabled_idx" ON "Playbook"("enabled");

-- CreateIndex
CREATE INDEX "PlaybookExecution_playbookId_createdAt_idx" ON "PlaybookExecution"("playbookId", "createdAt");

-- CreateIndex
CREATE INDEX "PlaybookExecution_status_idx" ON "PlaybookExecution"("status");

-- AddForeignKey
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybookExecution" ADD CONSTRAINT "PlaybookExecution_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

