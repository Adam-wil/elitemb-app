-- CreateView: AccountBalanceView
-- Calculates account balances from JournalLine entries (double-entry accounting)
-- Only includes non-voided journal entries

CREATE OR REPLACE VIEW "AccountBalanceView" AS
SELECT
  a."id",
  a."profileId",
  a."code",
  a."name",
  a."type",
  a."subType",
  a."parentCode",
  a."category",
  a."profileBookieId",
  a."bookieId",
  a."bookieName",
  a."bankName",
  a."isActive",
  a."isSystem",
  a."createdAt",
  a."updatedAt",
  COALESCE(SUM(jl."debit"), 0) - COALESCE(SUM(jl."credit"), 0) AS "balance"
FROM "Account" a
LEFT JOIN "JournalLine" jl ON jl."accountId" = a."id"
LEFT JOIN "JournalEntry" je ON je."id" = jl."journalEntryId" AND je."isVoid" = false
GROUP BY
  a."id",
  a."profileId",
  a."code",
  a."name",
  a."type",
  a."subType",
  a."parentCode",
  a."category",
  a."profileBookieId",
  a."bookieId",
  a."bookieName",
  a."bankName",
  a."isActive",
  a."isSystem",
  a."createdAt",
  a."updatedAt";

-- Create index for performance on JournalLine queries
CREATE INDEX IF NOT EXISTS "JournalLine_accountId_idx" ON "JournalLine"("accountId");

-- Create composite index for JournalEntry void filtering
CREATE INDEX IF NOT EXISTS "JournalEntry_isVoid_idx" ON "JournalEntry"("isVoid");
