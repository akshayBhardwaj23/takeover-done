-- Add optional shopDomain to Order for tenant scoping by shop
ALTER TABLE "Order" ADD COLUMN "shopDomain" TEXT;

-- Optional index if filtering frequently by shopDomain
-- CREATE INDEX "Order_shopDomain_idx" ON "Order"("shopDomain");

