/**
 * Account Ledger Database Server Functions
 *
 * TanStack Start server functions for Account Ledger database operations.
 * These run on the server to access the PostgreSQL database via Prisma.
 *
 * DO NOT use 'use server' directive - TanStack Start handles this via createServerFn()
 */

import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma'
import type { LedgerEntryType as PrismaLedgerEntryType } from '@prisma/client'
import type {
  LedgerEntry,
  AccountBalance,
  LedgerSummary,
  LedgerFilters,
  CreateLedgerEntryInput,
  AdjustBalanceInput,
  LedgerEntryType,
  LedgerDirection,
} from '../../types/ledger'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get default profile ID (creates one if needed)
 */
async function getDefaultProfileId(): Promise<string> {
  let user = await prisma.user.findUnique({
    where: { email: 'default@elitemb.local' },
    include: { profiles: { where: { isDefault: true } } },
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'default@elitemb.local',
        profiles: {
          create: {
            name: 'Default Profile',
            isDefault: true,
          },
        },
      },
      include: { profiles: { where: { isDefault: true } } },
    })
  }

  const profile = user.profiles[0]
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

/**
 * Convert Prisma ledger entry to frontend type
 */
function mapPrismaToLedgerEntry(entry: {
  id: string
  profileId: string
  bookieId: number | null
  bookieName: string
  isExchange: boolean
  entryType: PrismaLedgerEntryType
  amount: { toNumber: () => number } | number
  direction: string
  runningBalance: { toNumber: () => number } | number
  date: Date
  description: string | null
  notes: string | null
  bankTransactionId: string | null
  trackerEntryId: string | null
  layManagerEntryId: string | null
  bonusCreditId: string | null
  isReconciled: boolean
  reconciledAt: Date | null
  createdAt: Date
  updatedAt: Date
}): LedgerEntry {
  return {
    id: entry.id,
    profileId: entry.profileId,
    bookieId: entry.bookieId,
    bookieName: entry.bookieName,
    isExchange: entry.isExchange,
    entryType: entry.entryType as LedgerEntryType,
    amount: typeof entry.amount === 'number' ? entry.amount : entry.amount.toNumber(),
    direction: entry.direction as LedgerDirection,
    runningBalance: typeof entry.runningBalance === 'number' ? entry.runningBalance : entry.runningBalance.toNumber(),
    date: entry.date.toISOString(),
    description: entry.description || undefined,
    notes: entry.notes || undefined,
    bankTransactionId: entry.bankTransactionId,
    trackerEntryId: entry.trackerEntryId,
    layManagerEntryId: entry.layManagerEntryId,
    bonusCreditId: entry.bonusCreditId,
    isReconciled: entry.isReconciled,
    reconciledAt: entry.reconciledAt?.toISOString() || null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  }
}

/**
 * Convert Prisma account balance to frontend type
 */
function mapPrismaToAccountBalance(balance: {
  id: string
  profileId: string
  bookieId: number | null
  bookieName: string
  isExchange: boolean
  currentBalance: { toNumber: () => number } | number
  totalPL: { toNumber: () => number } | number
  lastUpdated: Date
  isOverridden: boolean
  overrideValue: { toNumber: () => number } | number | null
  overrideReason: string | null
  overrideAt: Date | null
}): AccountBalance {
  return {
    id: balance.id,
    profileId: balance.profileId,
    bookieId: balance.bookieId,
    bookieName: balance.bookieName,
    isExchange: balance.isExchange,
    currentBalance: typeof balance.currentBalance === 'number' ? balance.currentBalance : balance.currentBalance.toNumber(),
    totalPL: typeof balance.totalPL === 'number' ? balance.totalPL : balance.totalPL.toNumber(),
    lastUpdated: balance.lastUpdated.toISOString(),
    isOverridden: balance.isOverridden,
    overrideValue: balance.overrideValue
      ? typeof balance.overrideValue === 'number'
        ? balance.overrideValue
        : balance.overrideValue.toNumber()
      : null,
    overrideReason: balance.overrideReason,
    overrideAt: balance.overrideAt?.toISOString() || null,
  }
}

// ============================================================================
// Server Functions - Ledger Entries
// ============================================================================

/**
 * Get ledger entries with optional filters
 */
export const getLedgerEntries = createServerFn({ method: 'GET' })
  .inputValidator((input: { filters?: LedgerFilters }) => input)
  .handler(async ({ data }: { data: { filters?: LedgerFilters } }): Promise<LedgerEntry[]> => {
    const profileId = await getDefaultProfileId()
    const { filters } = data

    const where: Record<string, unknown> = { profileId }

    if (filters?.bookieName) {
      where.bookieName = filters.bookieName
    }

    if (filters?.isExchange !== undefined) {
      where.isExchange = filters.isExchange
    }

    if (filters?.entryTypes && filters.entryTypes.length > 0) {
      where.entryType = { in: filters.entryTypes }
    }

    if (filters?.dateRange) {
      where.date = {
        gte: new Date(filters.dateRange.start),
        lte: new Date(filters.dateRange.end),
      }
    }

    if (filters?.isReconciled !== undefined) {
      where.isReconciled = filters.isReconciled
    }

    const entries = await prisma.accountLedger.findMany({
      where,
      orderBy: { date: 'desc' },
      take: filters?.limit || 100,
      skip: filters?.offset || 0,
    })

    return entries.map(mapPrismaToLedgerEntry)
  })

/**
 * Get ledger entries for a specific bookie
 */
export const getLedgerEntriesByBookie = createServerFn({ method: 'GET' })
  .inputValidator((input: { bookieName: string; limit?: number }) => input)
  .handler(async ({ data }: { data: { bookieName: string; limit?: number } }): Promise<LedgerEntry[]> => {
    const profileId = await getDefaultProfileId()

    const entries = await prisma.accountLedger.findMany({
      where: {
        profileId,
        bookieName: data.bookieName,
      },
      orderBy: { date: 'desc' },
      take: data.limit || 50,
    })

    return entries.map(mapPrismaToLedgerEntry)
  })

/**
 * Create a new ledger entry
 */
export const createLedgerEntry = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateLedgerEntryInput) => input)
  .handler(async ({ data }: { data: CreateLedgerEntryInput }): Promise<LedgerEntry> => {
    const profileId = data.profileId || (await getDefaultProfileId())

    // Get current balance for this bookie
    const currentBalance = await prisma.accountBalance.findUnique({
      where: {
        profileId_bookieName: {
          profileId,
          bookieName: data.bookieName,
        },
      },
    })

    const currentBalanceValue = currentBalance
      ? typeof currentBalance.currentBalance === 'number'
        ? currentBalance.currentBalance
        : currentBalance.currentBalance.toNumber()
      : 0

    // Calculate new running balance
    const balanceEffect = data.direction === 'in' ? data.amount : -data.amount
    const newBalance = currentBalanceValue + balanceEffect

    // Create the entry
    const entry = await prisma.accountLedger.create({
      data: {
        profileId,
        bookieId: data.bookieId,
        bookieName: data.bookieName,
        isExchange: data.isExchange,
        entryType: data.entryType as PrismaLedgerEntryType,
        amount: data.amount,
        direction: data.direction,
        runningBalance: newBalance,
        date: new Date(data.date),
        description: data.description,
        notes: data.notes,
        bankTransactionId: data.bankTransactionId,
        trackerEntryId: data.trackerEntryId,
        layManagerEntryId: data.layManagerEntryId,
        bonusCreditId: data.bonusCreditId,
      },
    })

    // Update or create the account balance
    const plEffect =
      data.entryType === 'BET_WIN' || data.entryType === 'BET_LOSS' || data.entryType === 'COMMISSION'
        ? balanceEffect
        : 0

    await prisma.accountBalance.upsert({
      where: {
        profileId_bookieName: {
          profileId,
          bookieName: data.bookieName,
        },
      },
      update: {
        currentBalance: newBalance,
        totalPL: {
          increment: plEffect,
        },
        lastUpdated: new Date(),
      },
      create: {
        profileId,
        bookieId: data.bookieId,
        bookieName: data.bookieName,
        isExchange: data.isExchange,
        currentBalance: newBalance,
        totalPL: plEffect,
      },
    })

    return mapPrismaToLedgerEntry(entry)
  })

// ============================================================================
// Server Functions - Account Balances
// ============================================================================

/**
 * Get all account balances
 */
export const getAccountBalances = createServerFn({ method: 'GET' })
  .inputValidator((input: { isExchange?: boolean }) => input)
  .handler(async ({ data }: { data: { isExchange?: boolean } }): Promise<AccountBalance[]> => {
    const profileId = await getDefaultProfileId()

    const where: Record<string, unknown> = { profileId }

    if (data.isExchange !== undefined) {
      where.isExchange = data.isExchange
    }

    const balances = await prisma.accountBalance.findMany({
      where,
      orderBy: { bookieName: 'asc' },
    })

    return balances.map(mapPrismaToAccountBalance)
  })

/**
 * Get account balance for a specific bookie
 */
export const getAccountBalance = createServerFn({ method: 'GET' })
  .inputValidator((input: { bookieName: string }) => input)
  .handler(async ({ data }: { data: { bookieName: string } }): Promise<AccountBalance | null> => {
    const profileId = await getDefaultProfileId()

    const balance = await prisma.accountBalance.findUnique({
      where: {
        profileId_bookieName: {
          profileId,
          bookieName: data.bookieName,
        },
      },
    })

    return balance ? mapPrismaToAccountBalance(balance) : null
  })

/**
 * Set manual balance override
 */
export const setBalanceOverride = createServerFn({ method: 'POST' })
  .inputValidator((input: { bookieName: string; overrideValue: number; reason: string }) => input)
  .handler(async ({ data }: { data: { bookieName: string; overrideValue: number; reason: string } }): Promise<AccountBalance> => {
    const profileId = await getDefaultProfileId()

    const balance = await prisma.accountBalance.upsert({
      where: {
        profileId_bookieName: {
          profileId,
          bookieName: data.bookieName,
        },
      },
      update: {
        isOverridden: true,
        overrideValue: data.overrideValue,
        overrideReason: data.reason,
        overrideAt: new Date(),
      },
      create: {
        profileId,
        bookieName: data.bookieName,
        isExchange: false,
        currentBalance: data.overrideValue,
        totalPL: 0,
        isOverridden: true,
        overrideValue: data.overrideValue,
        overrideReason: data.reason,
        overrideAt: new Date(),
      },
    })

    return mapPrismaToAccountBalance(balance)
  })

/**
 * Clear manual balance override
 */
export const clearBalanceOverride = createServerFn({ method: 'POST' })
  .inputValidator((input: { bookieName: string }) => input)
  .handler(async ({ data }: { data: { bookieName: string } }): Promise<AccountBalance | null> => {
    const profileId = await getDefaultProfileId()

    const balance = await prisma.accountBalance.update({
      where: {
        profileId_bookieName: {
          profileId,
          bookieName: data.bookieName,
        },
      },
      data: {
        isOverridden: false,
        overrideValue: null,
        overrideReason: null,
        overrideAt: null,
      },
    })

    return mapPrismaToAccountBalance(balance)
  })

// ============================================================================
// Server Functions - Summary & Analytics
// ============================================================================

/**
 * Get ledger summary for a date range
 */
export const getLedgerSummary = createServerFn({ method: 'GET' })
  .inputValidator((input: { bookieName?: string; dateRange?: { start: string; end: string } }) => input)
  .handler(async ({ data }: { data: { bookieName?: string; dateRange?: { start: string; end: string } } }): Promise<LedgerSummary> => {
    const profileId = await getDefaultProfileId()

    const where: Record<string, unknown> = { profileId }

    if (data.bookieName) {
      where.bookieName = data.bookieName
    }

    if (data.dateRange) {
      where.date = {
        gte: new Date(data.dateRange.start),
        lte: new Date(data.dateRange.end),
      }
    }

    // Get all entries in range
    const entries = await prisma.accountLedger.findMany({
      where,
      select: {
        entryType: true,
        amount: true,
        direction: true,
      },
    })

    // Calculate totals
    let totalDeposits = 0
    let totalWithdrawals = 0
    let totalWins = 0
    let totalLosses = 0
    let totalBonuses = 0
    let totalCommissions = 0

    for (const entry of entries) {
      const amount = typeof entry.amount === 'number' ? entry.amount : entry.amount.toNumber()

      switch (entry.entryType) {
        case 'DEPOSIT':
          totalDeposits += amount
          break
        case 'WITHDRAWAL':
          totalWithdrawals += amount
          break
        case 'BET_WIN':
          totalWins += amount
          break
        case 'BET_LOSS':
          totalLosses += amount
          break
        case 'BONUS_CREDIT':
        case 'BONUS_TURNOVER':
          totalBonuses += entry.direction === 'in' ? amount : -amount
          break
        case 'COMMISSION':
          totalCommissions += amount
          break
      }
    }

    // Get current balance
    let currentBalance = 0
    if (data.bookieName) {
      const balance = await prisma.accountBalance.findUnique({
        where: {
          profileId_bookieName: {
            profileId,
            bookieName: data.bookieName,
          },
        },
      })
      currentBalance = balance
        ? typeof balance.currentBalance === 'number'
          ? balance.currentBalance
          : balance.currentBalance.toNumber()
        : 0
    } else {
      const balances = await prisma.accountBalance.findMany({
        where: { profileId },
      })
      currentBalance = balances.reduce((sum, b) => {
        const val = typeof b.currentBalance === 'number' ? b.currentBalance : b.currentBalance.toNumber()
        return sum + val
      }, 0)
    }

    // Calculate P&L and discrepancy
    const netPL = totalWins - totalLosses - totalCommissions
    const bankNet = totalWithdrawals - totalDeposits // What bank shows we extracted
    const discrepancy = bankNet - netPL // Difference between bank and tracker

    return {
      totalDeposits,
      totalWithdrawals,
      totalWins,
      totalLosses,
      totalBonuses,
      totalCommissions,
      netPL,
      currentBalance,
      discrepancy,
    }
  })

/**
 * Recalculate balance from ledger entries (for recovery/correction)
 */
export const recalculateBalance = createServerFn({ method: 'POST' })
  .inputValidator((input: { bookieName: string }) => input)
  .handler(async ({ data }: { data: { bookieName: string } }): Promise<AccountBalance> => {
    const profileId = await getDefaultProfileId()

    // Get all entries for this bookie ordered by date
    const entries = await prisma.accountLedger.findMany({
      where: {
        profileId,
        bookieName: data.bookieName,
      },
      orderBy: { date: 'asc' },
    })

    // Calculate running balance and P&L
    let runningBalance = 0
    let totalPL = 0

    for (const entry of entries) {
      const amount = typeof entry.amount === 'number' ? entry.amount : entry.amount.toNumber()
      const balanceEffect = entry.direction === 'in' ? amount : -amount

      runningBalance += balanceEffect

      // Update running balance in entry
      await prisma.accountLedger.update({
        where: { id: entry.id },
        data: { runningBalance },
      })

      // Track P&L
      if (entry.entryType === 'BET_WIN' || entry.entryType === 'BET_LOSS' || entry.entryType === 'COMMISSION') {
        totalPL += balanceEffect
      }
    }

    // Update account balance
    const balance = await prisma.accountBalance.upsert({
      where: {
        profileId_bookieName: {
          profileId,
          bookieName: data.bookieName,
        },
      },
      update: {
        currentBalance: runningBalance,
        totalPL,
        lastUpdated: new Date(),
      },
      create: {
        profileId,
        bookieName: data.bookieName,
        isExchange: entries[0]?.isExchange || false,
        currentBalance: runningBalance,
        totalPL,
      },
    })

    return mapPrismaToAccountBalance(balance)
  })

// ============================================================================
// Server Functions - Adjustments
// ============================================================================

/**
 * Adjust balance manually (creates an ADJUSTMENT entry)
 */
export const adjustBalance = createServerFn({ method: 'POST' })
  .inputValidator((input: AdjustBalanceInput) => input)
  .handler(async ({ data }: { data: AdjustBalanceInput }): Promise<{ entry: LedgerEntry; balance: AccountBalance }> => {
    const profileId = data.profileId || (await getDefaultProfileId())

    // Get current balance
    const currentBalanceRecord = await prisma.accountBalance.findUnique({
      where: {
        profileId_bookieName: {
          profileId,
          bookieName: data.bookieName,
        },
      },
    })

    const currentBalance = currentBalanceRecord
      ? typeof currentBalanceRecord.currentBalance === 'number'
        ? currentBalanceRecord.currentBalance
        : currentBalanceRecord.currentBalance.toNumber()
      : 0

    // Calculate adjustment amount
    const difference = data.newBalance - currentBalance
    const adjustmentAmount = Math.abs(difference)
    const direction: LedgerDirection = difference >= 0 ? 'in' : 'out'

    // Create adjustment entry
    const entry = await prisma.accountLedger.create({
      data: {
        profileId,
        bookieName: data.bookieName,
        isExchange: currentBalanceRecord?.isExchange || false,
        entryType: 'ADJUSTMENT',
        amount: adjustmentAmount,
        direction,
        runningBalance: data.newBalance,
        date: new Date(),
        description: 'Manual balance adjustment',
        notes: data.reason,
      },
    })

    // Update balance
    const balance = await prisma.accountBalance.upsert({
      where: {
        profileId_bookieName: {
          profileId,
          bookieName: data.bookieName,
        },
      },
      update: {
        currentBalance: data.newBalance,
        lastUpdated: new Date(),
      },
      create: {
        profileId,
        bookieName: data.bookieName,
        isExchange: false,
        currentBalance: data.newBalance,
        totalPL: 0,
      },
    })

    return {
      entry: mapPrismaToLedgerEntry(entry),
      balance: mapPrismaToAccountBalance(balance),
    }
  })
