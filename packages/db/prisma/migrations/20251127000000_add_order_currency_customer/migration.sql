-- Add currency and customerName fields to Order
ALTER TABLE "Order" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE "Order" ADD COLUMN "customerName" TEXT;

