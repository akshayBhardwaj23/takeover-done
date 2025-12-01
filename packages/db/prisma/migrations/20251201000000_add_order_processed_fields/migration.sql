-- Add processedAt and statusUpdatedAt fields to Order
ALTER TABLE "Order" ADD COLUMN "processedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "statusUpdatedAt" TIMESTAMP(3);

