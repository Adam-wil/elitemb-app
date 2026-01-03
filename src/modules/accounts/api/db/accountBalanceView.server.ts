/**
 * Account Balance View Server Functions
 *
 * TanStack Start server functions for querying the AccountBalanceView.
 * The view calculates account balances from JournalLine entries.
 *
 * DO NOT use 'use server' directive - TanStack Start handles this via createServerFn()
 */

import { createServerFn } from '@tanstack/react-start'
import type { AccountBalanceView } from '../../types'

// Dynamic import helper - prevents prisma from being bundled for client
async function getPrisma() {
  const { default: prisma } = await import('@/lib/prisma.server')
  return prisma
}

import type { AccountType, AccountSubType } from '@prisma/client'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get default profile ID (creates one if needed)
 * Note: TypeScript errors are due to Prisma type inference limitations
 * but the code works correctly at runtime.
 */
async function getDefaultProfileId(): Promise<string> {
  const prisma = await getPrisma()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user: any = await prisma.user.findUnique({
    where: { email: 'default@elitemb.local' },
    include: { Profile: { where: { isDefault: true } } },
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'default@elitemb.local',
        Profile: {
          create: {
            name: 'Default Profile',
            isDefault: true,
          },
        },
      },
      include: { Profile: { where: { isDefault: true } } },
    })
  }

  const profile = user.Profile[0]
  if (!profile) {
    const newProfile = await prisma.profile.create({
      data: {
        userId: user.id,
        name: 'Default Profile',
        isDefault: true,
      },
    })
    return newProfile.id
  }

  return profile.id
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get all account balances for a profile
 */
export const getAccountBalances = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId: string }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const { profileId } = data

    const results = await prisma.$queryRaw<AccountBalanceView[]>`
      SELECT * FROM "AccountBalanceView"
      WHERE "profileId" = ${profileId}
      ORDER BY "type", "code"
    `

    return results
  })

/**
 * Get account balances filtered by account type
 */
export const getAccountBalancesByType = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId: string; type: AccountType }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const { profileId, type } = data

    const results = await prisma.$queryRaw<AccountBalanceView[]>`
      SELECT * FROM "AccountBalanceView"
      WHERE "profileId" = ${profileId}
        AND "type" = ${type}::"AccountType"
      ORDER BY "code"
    `

    return results
  })

/**
 * Get account balances filtered by subType
 */
export const getAccountBalancesBySubType = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId: string; subType: AccountSubType }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const { profileId, subType } = data

    const results = await prisma.$queryRaw<AccountBalanceView[]>`
      SELECT * FROM "AccountBalanceView"
      WHERE "profileId" = ${profileId}
        AND "subType" = ${subType}::"AccountSubType"
      ORDER BY "code"
    `

    return results
  })

/**
 * Get a single account balance by ID
 */
export const getAccountBalance = createServerFn({ method: 'GET' })
  .inputValidator((d: { accountId: string }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const { accountId } = data

    const results = await prisma.$queryRaw<AccountBalanceView[]>`
      SELECT * FROM "AccountBalanceView"
      WHERE "id" = ${accountId}
      LIMIT 1
    `

    return results[0] ?? null
  })

/**
 * Get total balance summary by account type for a profile
 */
export const getBalanceSummaryByType = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId: string }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const { profileId } = data

    const results = await prisma.$queryRaw<
      { type: AccountType; totalBalance: number; accountCount: number }[]
    >`
      SELECT
        "type",
        SUM("balance")::numeric AS "totalBalance",
        COUNT(*)::int AS "accountCount"
      FROM "AccountBalanceView"
      WHERE "profileId" = ${profileId}
      GROUP BY "type"
      ORDER BY "type"
    `

    return results
  })

/**
 * Get active bookie account balances (BOOKIE_CASH and BOOKIE_BONUS)
 */
export const getBookieAccountBalances = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId: string }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const { profileId } = data

    const results = await prisma.$queryRaw<AccountBalanceView[]>`
      SELECT * FROM "AccountBalanceView"
      WHERE "profileId" = ${profileId}
        AND "subType" IN ('BOOKIE_CASH', 'BOOKIE_BONUS')
        AND "isActive" = true
      ORDER BY "bookieName", "subType"
    `

    return results
  })

// ============================================================================
// Balance Summary Card Data
// ============================================================================

/**
 * Balance summary data for the BalanceSummaryCard component
 */
export interface BalanceSummaryCardData {
  /** Total balance: BOOKIE_CASH + BOOKIE_BONUS + BETFAIR_AVAILABLE */
  totalBalance: number
  /** Total P&L: Income accounts - Expense accounts */
  totalPL: number
  /** Whether any account has a variance (calculated != actual) */
  hasVariance: boolean
  /** Count of accounts with variance */
  varianceCount: number
}

/**
 * Get aggregated balance summary for the BalanceSummaryCard
 *
 * - Total Balance = sum of BOOKIE_CASH + BOOKIE_BONUS + BETFAIR_AVAILABLE
 * - Total P&L = sum of Income accounts - sum of Expense accounts
 * - Variance detection based on AccountBalance overrides
 */
export const getBalanceSummaryForCard = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId?: string }) => d)
  .handler(async ({ data }): Promise<BalanceSummaryCardData> => {
    const prisma = await getPrisma()
    const profileId = data.profileId || (await getDefaultProfileId())

    // Query total balance from operational accounts (BOOKIE_CASH, BOOKIE_BONUS, BETFAIR_AVAILABLE)
    const balanceResult = await prisma.$queryRaw<{ total: number }[]>`
      SELECT COALESCE(SUM("balance"), 0)::numeric AS "total"
      FROM "AccountBalanceView"
      WHERE "profileId" = ${profileId}
        AND "subType" IN ('BOOKIE_CASH', 'BOOKIE_BONUS', 'BETFAIR_AVAILABLE')
        AND "isActive" = true
    `

    // Query P&L: Income - Expense
    const plResult = await prisma.$queryRaw<{ income: number; expense: number }[]>`
      SELECT
        COALESCE(SUM(CASE WHEN "type" = 'INCOME' THEN "balance" ELSE 0 END), 0)::numeric AS "income",
        COALESCE(SUM(CASE WHEN "type" = 'EXPENSE' THEN "balance" ELSE 0 END), 0)::numeric AS "expense"
      FROM "AccountBalanceView"
      WHERE "profileId" = ${profileId}
    `

    // Check for variance: accounts where actualBalance is set and differs from calculated balance
    // We check cash/exchange accounts (BOOKIE_CASH, BETFAIR_AVAILABLE) since those hold the actualBalance
    const varianceAccounts = await prisma.$queryRaw<{ varianceCount: number }[]>`
      SELECT COUNT(*)::int AS "varianceCount"
      FROM "Account" a
      JOIN LATERAL (
        SELECT COALESCE(SUM(jl."debit") - SUM(jl."credit"), 0) AS calculated
        FROM "JournalLine" jl
        JOIN "JournalEntry" je ON je."id" = jl."journalEntryId" AND je."isVoid" = false
        WHERE jl."accountId" = a."id"
      ) calc ON true
      WHERE a."profileId" = ${profileId}
        AND a."subType" IN ('BOOKIE_CASH', 'BETFAIR_AVAILABLE')
        AND a."isActive" = true
        AND a."actualBalance" IS NOT NULL
        AND ABS(a."actualBalance" - calc.calculated) > 0.01
    `
    const varianceResult = varianceAccounts[0]?.varianceCount ?? 0

    const totalBalance = Number(balanceResult[0]?.total ?? 0)
    const income = Number(plResult[0]?.income ?? 0)
    const expense = Number(plResult[0]?.expense ?? 0)
    // P&L = Income - Expense (expense accounts have positive balances representing costs)
    const totalPL = income - expense

    return {
      totalBalance,
      totalPL,
      hasVariance: varianceResult > 0,
      varianceCount: varianceResult,
    }
  })

// ============================================================================
// Grouped Bookie Balances
// ============================================================================

import type { BookieAccountData } from '../../types/ledger'

/**
 * Raw result from grouped query
 */
interface GroupedBalanceRow {
  bookieName: string
  bookieId: number | null
  isExchange: boolean
  cashBalance: number
  bonusBalance: number
  totalBalance: number
  racingIncome: number
  racingExpense: number
  bonusDepositMatchIncome: number
  actualBalance: number | null
}

/**
 * Get bookie balances grouped by bookieName with cash/bonus split and per-bookie P&L
 *
 * Groups AccountBalanceView rows by bookieId and aggregates:
 * - BOOKIE_CASH / BETFAIR_AVAILABLE -> cashBalance
 * - BOOKIE_BONUS -> bonusBalance
 * - RACING_INCOME -> racingIncome (credit balances = income earned)
 * - BONUS_DEPOSIT_MATCH_RACING_INCOME -> bonusDepositMatchIncome (deposit match bonuses)
 * - RACING_EXPENSE -> racingExpense (debit balances = costs incurred)
 * - P&L = racingIncome + bonusDepositMatchIncome - racingExpense
 */
export const getBookieBalancesGrouped = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId?: string }) => d)
  .handler(async ({ data }): Promise<BookieAccountData[]> => {
    const prisma = await getPrisma()
    const profileId = data.profileId || (await getDefaultProfileId())

    // Query grouped balances by bookieId
    // Includes asset accounts (BOOKIE_CASH, BOOKIE_BONUS, BETFAIR_AVAILABLE)
    // and income/expense accounts (RACING_INCOME, RACING_EXPENSE, BONUS_DEPOSIT_MATCH_RACING_INCOME) for P&L calculation
    // Also joins with Account table to get actualBalance for variance detection
    const groupedResults = await prisma.$queryRaw<GroupedBalanceRow[]>`
      SELECT
        abv."bookieName",
        abv."bookieId"::int AS "bookieId",
        BOOL_OR(abv."subType" = 'BETFAIR_AVAILABLE') AS "isExchange",
        COALESCE(SUM(CASE
          WHEN abv."subType" IN ('BOOKIE_CASH', 'BETFAIR_AVAILABLE')
          THEN abv."balance" ELSE 0
        END), 0)::numeric AS "cashBalance",
        COALESCE(SUM(CASE
          WHEN abv."subType" = 'BOOKIE_BONUS'
          THEN abv."balance" ELSE 0
        END), 0)::numeric AS "bonusBalance",
        COALESCE(SUM(CASE
          WHEN abv."subType" IN ('BOOKIE_CASH', 'BOOKIE_BONUS', 'BETFAIR_AVAILABLE')
          THEN abv."balance" ELSE 0
        END), 0)::numeric AS "totalBalance",
        COALESCE(SUM(CASE
          WHEN abv."subType" = 'RACING_INCOME'
          THEN abv."balance" ELSE 0
        END), 0)::numeric AS "racingIncome",
        COALESCE(SUM(CASE
          WHEN abv."subType" = 'RACING_EXPENSE'
          THEN abv."balance" ELSE 0
        END), 0)::numeric AS "racingExpense",
        COALESCE(SUM(CASE
          WHEN abv."subType" = 'BONUS_DEPOSIT_MATCH_RACING_INCOME'
          THEN abv."balance" ELSE 0
        END), 0)::numeric AS "bonusDepositMatchIncome",
        -- Get actualBalance from BOOKIE_CASH or BETFAIR_AVAILABLE account (primary cash account)
        MAX(CASE
          WHEN abv."subType" IN ('BOOKIE_CASH', 'BETFAIR_AVAILABLE')
          THEN a."actualBalance"
          ELSE NULL
        END)::numeric AS "actualBalance"
      FROM "AccountBalanceView" abv
      LEFT JOIN "Account" a ON a."id" = abv."id"
      WHERE abv."profileId" = ${profileId}
        AND abv."subType" IN ('BOOKIE_CASH', 'BOOKIE_BONUS', 'BETFAIR_AVAILABLE', 'RACING_INCOME', 'RACING_EXPENSE', 'BONUS_DEPOSIT_MATCH_RACING_INCOME')
        AND abv."isActive" = true
        AND abv."bookieId" IS NOT NULL
      GROUP BY abv."bookieId", abv."bookieName"
      ORDER BY abv."bookieName"
    `

    // Transform results - calculate variance from actualBalance vs totalBalance
    return groupedResults.map((row): BookieAccountData => {
      // Variance = actualBalance - totalBalance (calculated from journal entries)
      // If actualBalance is not set, there's no variance to report
      const actualBalance = row.actualBalance !== null ? Number(row.actualBalance) : null
      const calculatedBalance = Number(row.totalBalance)
      const varianceAmount = actualBalance !== null ? actualBalance - calculatedBalance : null
      const hasVariance = varianceAmount !== null && Math.abs(varianceAmount) > 0.01
      // P&L = Racing Income + Bonus Deposit Match Income - Racing Expense
      // Income accounts have credit balances (positive = earned income)
      // Expense accounts have debit balances (positive = costs incurred)
      // Bonus deposit match income includes sign-up offers, reloads, deposit bonuses
      const totalPL =
        Number(row.racingIncome) +
        Number(row.bonusDepositMatchIncome) -
        Number(row.racingExpense)
      return {
        bookieName: row.bookieName,
        bookieId: row.bookieId,
        isExchange: row.isExchange,
        cashBalance: Number(row.cashBalance),
        bonusBalance: Number(row.bonusBalance),
        totalBalance: Number(row.totalBalance),
        totalPL,
        hasVariance,
        needsAttention: hasVariance,
        varianceAmount,
      }
    })
  })

// ============================================================================
// Account Lookup by Bookie Name
// ============================================================================

/**
 * Account info for a bookie
 */
export interface BookieAccountInfo {
  accountId: string
  accountCode: string
  accountName: string
  bookieName: string
  bookieId: number | null
  subType: AccountSubType
  isExchange: boolean
}

/**
 * Get account by bookie name and optional subType
 *
 * Used to resolve bookieName -> accountId for journal queries.
 * Defaults to BOOKIE_CASH for regular bookies, BETFAIR_AVAILABLE for exchanges.
 */
export const getAccountByBookieName = createServerFn({ method: 'GET' })
  .inputValidator(
    (d: { bookieName: string; profileId?: string; subType?: AccountSubType }) => d
  )
  .handler(async ({ data }): Promise<BookieAccountInfo | null> => {
    const prisma = await getPrisma()
    const { bookieName, subType } = data
    const profileId = data.profileId || (await getDefaultProfileId())

    // Build where clause
    const whereSubType = subType
      ? [subType]
      : ['BOOKIE_CASH', 'BETFAIR_AVAILABLE'] // Default to cash accounts

    const account = await prisma.account.findFirst({
      where: {
        profileId,
        bookieName,
        subType: { in: whereSubType as AccountSubType[] },
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        bookieName: true,
        bookieId: true,
        subType: true,
      },
    })

    if (!account) {
      return null
    }

    return {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      bookieName: account.bookieName || bookieName,
      bookieId: account.bookieId,
      subType: account.subType!,
      isExchange: account.subType === 'BETFAIR_AVAILABLE',
    }
  })

// ============================================================================
// Actual Balance Reconciliation
// ============================================================================

/**
 * Result of updating actual balance
 */
export interface UpdateActualBalanceResult {
  accountId: string
  actualBalance: number
  actualBalanceAt: string
  calculatedBalance: number
  variance: number
}

/**
 * Update the user-entered actual balance for an account
 *
 * This is used for reconciliation - comparing what the bookie app shows
 * vs what our calculated balance from journal entries shows.
 */
export const updateActualBalance = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { accountId: string; actualBalance: number; profileId?: string }) => d
  )
  .handler(async ({ data }): Promise<UpdateActualBalanceResult> => {
    const prisma = await getPrisma()
    const { accountId, actualBalance } = data
    const profileId = data.profileId || (await getDefaultProfileId())

    // Update the account with actual balance
    const updated = await prisma.account.update({
      where: {
        id: accountId,
        profileId, // Security: ensure user owns this account
      },
      data: {
        actualBalance,
        actualBalanceAt: new Date(),
      },
    })

    // Get calculated balance from the view
    const balanceResult = await prisma.$queryRaw<{ balance: number }[]>`
      SELECT "balance"::numeric
      FROM "AccountBalanceView"
      WHERE "id" = ${accountId}
      LIMIT 1
    `
    const calculatedBalance = Number(balanceResult[0]?.balance ?? 0)

    return {
      accountId: updated.id,
      actualBalance: Number(updated.actualBalance),
      actualBalanceAt: updated.actualBalanceAt!.toISOString(),
      calculatedBalance,
      variance: Number(updated.actualBalance) - calculatedBalance,
    }
  })

/**
 * Get actual balance info for an account
 */
export interface ActualBalanceInfo {
  accountId: string
  calculatedBalance: number
  actualBalance: number | null
  actualBalanceAt: string | null
  variance: number | null
}

/**
 * Get actual balance info for an account by ID
 */
export const getActualBalanceInfo = createServerFn({ method: 'GET' })
  .inputValidator((d: { accountId: string }) => d)
  .handler(async ({ data }): Promise<ActualBalanceInfo | null> => {
    const prisma = await getPrisma()
    const { accountId } = data

    // Get account with actual balance fields
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        actualBalance: true,
        actualBalanceAt: true,
      },
    })

    if (!account) {
      return null
    }

    // Get calculated balance from the view
    const balanceResult = await prisma.$queryRaw<{ balance: number }[]>`
      SELECT "balance"::numeric
      FROM "AccountBalanceView"
      WHERE "id" = ${accountId}
      LIMIT 1
    `
    const calculatedBalance = Number(balanceResult[0]?.balance ?? 0)
    const actualBalance = account.actualBalance
      ? Number(account.actualBalance)
      : null
    const variance =
      actualBalance !== null ? actualBalance - calculatedBalance : null

    return {
      accountId: account.id,
      calculatedBalance,
      actualBalance,
      actualBalanceAt: account.actualBalanceAt?.toISOString() ?? null,
      variance,
    }
  })
