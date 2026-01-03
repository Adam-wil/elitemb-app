/**
 * Ledger Sync Server Functions
 *
 * Server functions to import data from various sources into the ledger:
 * - Racing Tracker entries → BET_WIN/BET_LOSS/BONUS/REFUND entries
 * - Bank transactions → DEPOSIT/WITHDRAWAL entries
 * - Bonuses (The Stable) → BONUS_CREDIT/BONUS_TURNOVER entries
 *
 * DO NOT use 'use server' directive - TanStack Start handles this via createServerFn()
 */

import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma'
import type { RaceOutcome } from '@prisma/client'
import type { LedgerEntryType, LedgerDirection } from '../../types/ledger'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get default profile ID (creates one if needed)
 */
async function getDefaultProfileId(): Promise<string> {
  let user = await prisma.user.findUnique({
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

/**
 * Check if a bookie is an exchange
 */
function isExchangeBookie(bookieName: string): boolean {
  const exchanges = ['betfair', 'smarkets', 'betdaq', 'matchbook']
  return exchanges.some((ex) => bookieName.toLowerCase().includes(ex))
}

/**
 * Map racing outcome to ledger entry type
 */
function outcomeToLedgerType(outcome: RaceOutcome): { entryType: LedgerEntryType; direction: LedgerDirection } | null {
  switch (outcome) {
    case 'WIN':
      return { entryType: 'BET_WIN', direction: 'in' }
    case 'LOSS':
      return { entryType: 'BET_LOSS', direction: 'out' }
    case 'BONUS':
      return { entryType: 'BONUS_CREDIT', direction: 'in' }
    case 'REFUND':
    case 'SCRATCHED':
      return { entryType: 'REFUND', direction: 'in' }
    case 'DEAD_HEAT':
    case 'MIDDLE':
      // Dead heat/middle can be win or loss depending on profitLoss
      return null // Will be determined by profitLoss sign
    case 'PENDING':
    default:
      return null
  }
}

// ============================================================================
// Sync Tracker Entries → Ledger
// ============================================================================

export interface SyncTrackerResult {
  synced: number
  skipped: number
  errors: string[]
  entries: Array<{
    trackerEntryId: string
    ledgerEntryId: string
    bookieName: string
    amount: number
    entryType: string
  }>
}

/**
 * Sync racing tracker entries to the ledger
 * Creates BET_WIN/BET_LOSS/BONUS_CREDIT/REFUND entries for settled races
 */
export const syncTrackerEntriesToLedger = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { startDate?: string; endDate?: string; forceResync?: boolean }) => input
  )
  .handler(async ({ data }): Promise<SyncTrackerResult> => {
    const profileId = await getDefaultProfileId()
    const result: SyncTrackerResult = { synced: 0, skipped: 0, errors: [], entries: [] }

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (data.startDate) dateFilter.gte = new Date(data.startDate)
    if (data.endDate) dateFilter.lte = new Date(data.endDate)

    // Get tracker entries that are settled (not PENDING)
    const trackerEntries = await prisma.racingTrackerEntry.findMany({
      where: {
        profileId,
        outcome: { not: 'PENDING' },
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      },
      orderBy: { date: 'asc' },
    })

    for (const entry of trackerEntries) {
      try {
        // Check if already synced
        if (!data.forceResync) {
          const existing = await prisma.accountLedger.findFirst({
            where: { trackerEntryId: entry.id },
          })
          if (existing) {
            result.skipped++
            continue
          }
        }

        // Skip if no profitLoss value
        const profitLoss = entry.profitLoss ? Number(entry.profitLoss) : null
        if (profitLoss === null || profitLoss === 0) {
          result.skipped++
          continue
        }

        // Determine entry type and direction
        let mapping = outcomeToLedgerType(entry.outcome)

        // For dead heat/middle, determine by profitLoss sign
        if (!mapping && (entry.outcome === 'DEAD_HEAT' || entry.outcome === 'MIDDLE')) {
          mapping = profitLoss > 0
            ? { entryType: 'BET_WIN', direction: 'in' }
            : { entryType: 'BET_LOSS', direction: 'out' }
        }

        if (!mapping) {
          result.skipped++
          continue
        }

        const bookieName = entry.backBookie
        const isExchange = isExchangeBookie(bookieName)
        const amount = Math.abs(profitLoss)

        // Get current balance for this bookie
        const currentBalance = await prisma.accountBalance.findUnique({
          where: {
            profileId_bookieName: { profileId, bookieName },
          },
        })

        const currentBalanceValue = currentBalance
          ? Number(currentBalance.currentBalance)
          : 0

        // Calculate new running balance
        const balanceEffect = mapping.direction === 'in' ? amount : -amount
        const newBalance = currentBalanceValue + balanceEffect

        // Delete existing entry if force resync
        if (data.forceResync) {
          await prisma.accountLedger.deleteMany({
            where: { trackerEntryId: entry.id },
          })
        }

        // Create ledger entry
        const ledgerEntry = await prisma.accountLedger.create({
          data: {
            profileId,
            bookieName,
            isExchange,
            entryType: mapping.entryType,
            amount,
            direction: mapping.direction,
            runningBalance: newBalance,
            date: entry.date,
            description: `${entry.track} R${entry.raceNumber} - ${entry.selectionName}`,
            notes: `Outcome: ${entry.outcome}`,
            trackerEntryId: entry.id,
          },
        })

        // Update account balance
        const plEffect =
          mapping.entryType === 'BET_WIN' || mapping.entryType === 'BET_LOSS'
            ? balanceEffect
            : 0

        await prisma.accountBalance.upsert({
          where: {
            profileId_bookieName: { profileId, bookieName },
          },
          update: {
            currentBalance: newBalance,
            totalPL: { increment: plEffect },
            lastUpdated: new Date(),
          },
          create: {
            profileId,
            bookieName,
            isExchange,
            currentBalance: newBalance,
            totalPL: plEffect,
          },
        })

        result.synced++
        result.entries.push({
          trackerEntryId: entry.id,
          ledgerEntryId: ledgerEntry.id,
          bookieName,
          amount,
          entryType: mapping.entryType,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        result.errors.push(`Entry ${entry.id}: ${message}`)
      }
    }

    return result
  })

// ============================================================================
// Sync Bank Transactions → Ledger
// ============================================================================

export interface BankTransactionInput {
  id: string
  date: string
  bookieName: string
  amount: number // Positive = deposit, negative = withdrawal
  description?: string
  isExchange?: boolean
}

export interface SyncBankResult {
  synced: number
  skipped: number
  errors: string[]
  entries: Array<{
    transactionId: string
    ledgerEntryId: string
    bookieName: string
    amount: number
    entryType: string
  }>
}

/**
 * Sync bank transactions to the ledger
 * Creates DEPOSIT/WITHDRAWAL entries based on transaction direction
 */
export const syncBankTransactionsToLedger = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { transactions: BankTransactionInput[]; forceResync?: boolean }) => input
  )
  .handler(async ({ data }): Promise<SyncBankResult> => {
    const profileId = await getDefaultProfileId()
    const result: SyncBankResult = { synced: 0, skipped: 0, errors: [], entries: [] }

    for (const txn of data.transactions) {
      try {
        // Check if already synced
        if (!data.forceResync) {
          const existing = await prisma.accountLedger.findFirst({
            where: { bankTransactionId: txn.id },
          })
          if (existing) {
            result.skipped++
            continue
          }
        }

        // Skip transactions without a detected bookie
        if (!txn.bookieName) {
          result.skipped++
          continue
        }

        const bookieName = txn.bookieName
        const isExchange = txn.isExchange ?? isExchangeBookie(bookieName)

        // Determine entry type based on amount sign
        // Positive amount = money going INTO bookie (deposit FROM bank perspective)
        // Negative amount = money coming FROM bookie (withdrawal TO bank perspective)
        const entryType: LedgerEntryType = txn.amount > 0 ? 'DEPOSIT' : 'WITHDRAWAL'
        const direction: LedgerDirection = txn.amount > 0 ? 'in' : 'out'
        const amount = Math.abs(txn.amount)

        // Get current balance for this bookie
        const currentBalance = await prisma.accountBalance.findUnique({
          where: {
            profileId_bookieName: { profileId, bookieName },
          },
        })

        const currentBalanceValue = currentBalance
          ? Number(currentBalance.currentBalance)
          : 0

        // Calculate new running balance
        const balanceEffect = direction === 'in' ? amount : -amount
        const newBalance = currentBalanceValue + balanceEffect

        // Delete existing entry if force resync
        if (data.forceResync) {
          await prisma.accountLedger.deleteMany({
            where: { bankTransactionId: txn.id },
          })
        }

        // Create ledger entry
        const ledgerEntry = await prisma.accountLedger.create({
          data: {
            profileId,
            bookieName,
            isExchange,
            entryType,
            amount,
            direction,
            runningBalance: newBalance,
            date: new Date(txn.date),
            description: txn.description || `${entryType === 'DEPOSIT' ? 'Deposit to' : 'Withdrawal from'} ${bookieName}`,
            bankTransactionId: txn.id,
          },
        })

        // Update account balance (deposits/withdrawals don't affect P&L)
        await prisma.accountBalance.upsert({
          where: {
            profileId_bookieName: { profileId, bookieName },
          },
          update: {
            currentBalance: newBalance,
            lastUpdated: new Date(),
          },
          create: {
            profileId,
            bookieName,
            isExchange,
            currentBalance: newBalance,
            totalPL: 0,
          },
        })

        result.synced++
        result.entries.push({
          transactionId: txn.id,
          ledgerEntryId: ledgerEntry.id,
          bookieName,
          amount,
          entryType,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        result.errors.push(`Transaction ${txn.id}: ${message}`)
      }
    }

    return result
  })

// ============================================================================
// Sync Bonuses → Ledger
// ============================================================================

export interface BonusInput {
  id: string
  bookie: string
  amount: number
  dateEarned: string
  status: 'pending' | 'turned_over' | 'expired' | 'cancelled'
  turnedOverAt?: string
  bonusTurnoverProfit?: number
  sourceEntryId?: string
}

export interface SyncBonusResult {
  synced: number
  skipped: number
  errors: string[]
  entries: Array<{
    bonusId: string
    ledgerEntryId: string
    bookieName: string
    amount: number
    entryType: string
  }>
}

/**
 * Sync bonuses to the ledger
 * Creates BONUS_CREDIT entries for pending bonuses
 * Creates BONUS_TURNOVER entries for turned over bonuses
 */
export const syncBonusesToLedger = createServerFn({ method: 'POST' })
  .inputValidator((input: { bonuses: BonusInput[]; forceResync?: boolean }) => input)
  .handler(async ({ data }): Promise<SyncBonusResult> => {
    const profileId = await getDefaultProfileId()
    const result: SyncBonusResult = { synced: 0, skipped: 0, errors: [], entries: [] }

    for (const bonus of data.bonuses) {
      try {
        // Skip cancelled/expired bonuses unless turned over
        if (bonus.status === 'cancelled' || bonus.status === 'expired') {
          result.skipped++
          continue
        }

        // Check if already synced
        if (!data.forceResync) {
          const existing = await prisma.accountLedger.findFirst({
            where: { bonusCreditId: bonus.id },
          })
          if (existing) {
            result.skipped++
            continue
          }
        }

        const bookieName = bonus.bookie
        const isExchange = isExchangeBookie(bookieName)

        // Determine entry type
        const entryType: LedgerEntryType =
          bonus.status === 'turned_over' ? 'BONUS_TURNOVER' : 'BONUS_CREDIT'

        // For turned over bonuses, use the turnover profit (can be positive or negative)
        // For pending bonuses, use the bonus amount
        let amount: number
        let direction: LedgerDirection

        if (bonus.status === 'turned_over' && bonus.bonusTurnoverProfit !== undefined) {
          amount = Math.abs(bonus.bonusTurnoverProfit)
          direction = bonus.bonusTurnoverProfit >= 0 ? 'in' : 'out'
        } else {
          amount = bonus.amount
          direction = 'in'
        }

        // Get current balance for this bookie
        const currentBalance = await prisma.accountBalance.findUnique({
          where: {
            profileId_bookieName: { profileId, bookieName },
          },
        })

        const currentBalanceValue = currentBalance
          ? Number(currentBalance.currentBalance)
          : 0

        // Calculate new running balance
        const balanceEffect = direction === 'in' ? amount : -amount
        const newBalance = currentBalanceValue + balanceEffect

        // Delete existing entry if force resync
        if (data.forceResync) {
          await prisma.accountLedger.deleteMany({
            where: { bonusCreditId: bonus.id },
          })
        }

        // Create ledger entry
        const date = bonus.status === 'turned_over' && bonus.turnedOverAt
          ? new Date(bonus.turnedOverAt)
          : new Date(bonus.dateEarned)

        const ledgerEntry = await prisma.accountLedger.create({
          data: {
            profileId,
            bookieName,
            isExchange,
            entryType,
            amount,
            direction,
            runningBalance: newBalance,
            date,
            description:
              entryType === 'BONUS_TURNOVER'
                ? `Bonus turnover - ${bonus.bonusTurnoverProfit && bonus.bonusTurnoverProfit >= 0 ? 'Profit' : 'Loss'}`
                : `Bonus bet received - $${bonus.amount}`,
            bonusCreditId: bonus.id,
            trackerEntryId: bonus.sourceEntryId || null,
          },
        })

        // Update account balance
        // BONUS_TURNOVER affects P&L, BONUS_CREDIT does not
        const plEffect = entryType === 'BONUS_TURNOVER' ? balanceEffect : 0

        await prisma.accountBalance.upsert({
          where: {
            profileId_bookieName: { profileId, bookieName },
          },
          update: {
            currentBalance: newBalance,
            totalPL: { increment: plEffect },
            lastUpdated: new Date(),
          },
          create: {
            profileId,
            bookieName,
            isExchange,
            currentBalance: newBalance,
            totalPL: plEffect,
          },
        })

        result.synced++
        result.entries.push({
          bonusId: bonus.id,
          ledgerEntryId: ledgerEntry.id,
          bookieName,
          amount,
          entryType,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        result.errors.push(`Bonus ${bonus.id}: ${message}`)
      }
    }

    return result
  })

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get sync status - shows what has been synced and what's pending
 */
export const getLedgerSyncStatus = createServerFn({ method: 'GET' })
  .inputValidator((input: Record<string, never>) => input)
  .handler(async (): Promise<{
    trackerEntries: { total: number; synced: number; pending: number }
    bankTransactions: { synced: number }
    bonuses: { synced: number }
  }> => {
    const profileId = await getDefaultProfileId()

    // Count tracker entries
    const totalTrackerEntries = await prisma.racingTrackerEntry.count({
      where: { profileId, outcome: { not: 'PENDING' } },
    })

    const syncedTrackerEntries = await prisma.accountLedger.count({
      where: { profileId, trackerEntryId: { not: null } },
    })

    // Count bank transactions synced
    const syncedBankTxns = await prisma.accountLedger.count({
      where: { profileId, bankTransactionId: { not: null } },
    })

    // Count bonuses synced
    const syncedBonuses = await prisma.accountLedger.count({
      where: { profileId, bonusCreditId: { not: null } },
    })

    return {
      trackerEntries: {
        total: totalTrackerEntries,
        synced: syncedTrackerEntries,
        pending: totalTrackerEntries - syncedTrackerEntries,
      },
      bankTransactions: { synced: syncedBankTxns },
      bonuses: { synced: syncedBonuses },
    }
  })

/**
 * Clear all synced ledger entries (for testing/reset)
 */
export const clearSyncedLedgerEntries = createServerFn({ method: 'POST' })
  .inputValidator((input: { source?: 'tracker' | 'bank' | 'bonus' | 'all' }) => input)
  .handler(async ({ data }): Promise<{ deleted: number }> => {
    const profileId = await getDefaultProfileId()
    const source = data.source || 'all'

    let deleted = 0

    if (source === 'all' || source === 'tracker') {
      const result = await prisma.accountLedger.deleteMany({
        where: { profileId, trackerEntryId: { not: null } },
      })
      deleted += result.count
    }

    if (source === 'all' || source === 'bank') {
      const result = await prisma.accountLedger.deleteMany({
        where: { profileId, bankTransactionId: { not: null } },
      })
      deleted += result.count
    }

    if (source === 'all' || source === 'bonus') {
      const result = await prisma.accountLedger.deleteMany({
        where: { profileId, bonusCreditId: { not: null } },
      })
      deleted += result.count
    }

    // Recalculate all balances
    const bookies = await prisma.accountBalance.findMany({
      where: { profileId },
      select: { bookieName: true },
    })

    for (const { bookieName } of bookies) {
      // Get all remaining entries for this bookie
      const entries = await prisma.accountLedger.findMany({
        where: { profileId, bookieName },
        orderBy: { date: 'asc' },
      })

      let runningBalance = 0
      let totalPL = 0

      for (const entry of entries) {
        const amount = Number(entry.amount)
        const balanceEffect = entry.direction === 'in' ? amount : -amount
        runningBalance += balanceEffect

        if (entry.entryType === 'BET_WIN' || entry.entryType === 'BET_LOSS' || entry.entryType === 'COMMISSION') {
          totalPL += balanceEffect
        }

        await prisma.accountLedger.update({
          where: { id: entry.id },
          data: { runningBalance },
        })
      }

      await prisma.accountBalance.update({
        where: { profileId_bookieName: { profileId, bookieName } },
        data: { currentBalance: runningBalance, totalPL, lastUpdated: new Date() },
      })
    }

    return { deleted }
  })
