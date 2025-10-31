-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "paymentGateway" TEXT,
ADD COLUMN     "gatewaySubscriptionId" TEXT,
ADD COLUMN     "gatewayCustomerId" TEXT,
ADD COLUMN     "gatewayPlanId" TEXT,
ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE INDEX "Subscription_gatewaySubscriptionId_idx" ON "Subscription"("gatewaySubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_gatewayCustomerId_idx" ON "Subscription"("gatewayCustomerId");


