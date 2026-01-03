-- Add actualBalance reconciliation fields to Account table
ALTER TABLE "Account" ADD COLUMN "actualBalance" DECIMAL(19,4);
ALTER TABLE "Account" ADD COLUMN "actualBalanceAt" TIMESTAMP(3);
