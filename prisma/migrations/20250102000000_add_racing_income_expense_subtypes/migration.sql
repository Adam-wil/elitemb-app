-- Add RACING_INCOME and RACING_EXPENSE to AccountSubType enum
-- These are used for per-bookie income/expense tracking

-- Add RACING_INCOME after BONUS_INCOME
ALTER TYPE "AccountSubType" ADD VALUE IF NOT EXISTS 'RACING_INCOME';

-- Add RACING_EXPENSE after BONUS_EXPIRED
ALTER TYPE "AccountSubType" ADD VALUE IF NOT EXISTS 'RACING_EXPENSE';
