/**
 * Racing Journal Hooks Server Functions
 *
 * TanStack Start server functions for creating journal entries when
 * racing tracker events occur (bet placed, win, loss, void, etc.).
 *
 * DO NOT use 'use server' directive - TanStack Start handles this via createServerFn()
 */

import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma'
import { provisionBookieAccounts } from '@/modules/accounts/api/db/accountProvisioner.server'
import { reverseJournalEntry } from '@/modules/accounts/api/db/journalService.server'
import {
  shouldCreateJournalEntry,
  isMultiLegParent,
  getMultiLegChildren,
} from '@/modules/the-furlong/utils/multiLegHelpers'
import {
  determineMultiLegOutcome,
  calculateMultiLegReturns,
  buildLegSummaries,
  buildSettlementDescription,
} from '@/modules/the-furlong/utils/multiLegSettlement'
import type {
  RecordRacingBetPlacedInput,
  RecordRacingBetPlacedResult,
  RecordRacingWinInput,
  RecordRacingWinResult,
  RecordRacingLossInput,
  RecordRacingLossResult,
  RecordRacingVoidInput,
  RecordRacingVoidResult,
  RecordRacingDeadHeatInput,
  RecordRacingDeadHeatResult,
  DeadHeatCalculation,
  VoidType,
  JournalEntryWithLines,
  SettleMultiLegInput,
  SettleMultiLegResult,
  LegSummary,
} from '@/modules/accounts/types/journal'
import type { Prisma, JournalEntryType, BetType, AccountSubType } from '@prisma/client'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map Prisma result to JournalEntryWithLines type
 */
function mapToJournalEntryWithLines(entry: {
  id: string
  profileId: string
  entryDate: Date
  entryType: JournalEntryType
  description: string | null
  referenceType: string | null
  referenceId: string | null
  betType: BetType | null
  isVoid: boolean
  createdAt: Date
  JournalLine: Array<{
    id: string
    accountId: string
    debit: Prisma.Decimal | number
    credit: Prisma.Decimal | number
    memo: string | null
  }>
}): JournalEntryWithLines {
  return {
    id: entry.id,
    profileId: entry.profileId,
    entryDate: entry.entryDate,
    entryType: entry.entryType,
    description: entry.description,
    referenceType: entry.referenceType,
    referenceId: entry.referenceId,
    betType: entry.betType,
    isVoid: entry.isVoid,
    createdAt: entry.createdAt,
    lines: entry.JournalLine.map((line) => ({
      id: line.id,
      accountId: line.accountId,
      debit: typeof line.debit === 'number' ? line.debit : Number(line.debit),
      credit: typeof line.credit === 'number' ? line.credit : Number(line.credit),
      memo: line.memo,
    })),
  }
}

/**
 * Get a system account by subType for a profile
 *
 * @throws Error if system accounts not seeded
 */
async function getSystemAccount(
  profileId: string,
  subType: AccountSubType
): Promise<{ id: string; code: string; name: string }> {
  const account = await prisma.account.findFirst({
    where: {
      profileId,
      subType,
      isSystem: true,
    },
    select: { id: true, code: true, name: true },
  })

  if (!account) {
    throw new Error(
      `System account ${subType} not found. Run seedSystemAccounts first.`
    )
  }

  return account
}

/**
 * Get the Pending Back Bets system account for a profile
 *
 * @throws Error if system accounts not seeded
 */
async function getPendingBackAccount(
  profileId: string
): Promise<{ id: string; code: string; name: string }> {
  return getSystemAccount(profileId, 'PENDING_BACK')
}

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Record a racing bet placement in the journal
 *
 * Creates journal entry:
 * - Debit Pending Back Bets (stake moves to pending)
 * - Credit Bookie Cash or Bookie Bonus (balance decreases)
 *
 * This function is idempotent - returns existing entry if already recorded
 * for the same trackerEntryId with entryType BET_PLACED.
 *
 * @param input - Racing bet placement details
 * @returns Journal entry with lines and wasExisting flag
 */
export const recordRacingBetPlaced = createServerFn({ method: 'POST' })
  .inputValidator((input: RecordRacingBetPlacedInput) => input)
  .handler(async ({ data }): Promise<RecordRacingBetPlacedResult> => {
    const {
      profileId,
      trackerEntryId,
      bookieId,
      stake,
      isBonusBet,
      horseName,
      track,
      raceNumber,
      entryDate,
    } = data

    // Validate stake
    if (stake <= 0) {
      throw new Error('Stake must be positive')
    }

    // Fetch the tracker entry to check multi-leg status
    const trackerEntry = await prisma.racingTrackerEntry.findUnique({
      where: { id: trackerEntryId },
    })

    if (!trackerEntry) {
      throw new Error(`Tracker entry ${trackerEntryId} not found`)
    }

    // Skip journal creation for child legs (parent handles journal)
    if (!shouldCreateJournalEntry(trackerEntry)) {
      return {
        journalEntry: null,
        wasExisting: false,
        wasSkipped: true,
        skipReason: 'Child leg - journal created on parent only',
      }
    }

    // Idempotency check: Return existing entry if already recorded
    const existing = await prisma.journalEntry.findFirst({
      where: {
        profileId,
        referenceType: 'RACING_TRACKER',
        referenceId: trackerEntryId,
        entryType: 'BET_PLACED',
        isVoid: false,
      },
      include: { JournalLine: true },
    })

    if (existing) {
      return {
        journalEntry: mapToJournalEntryWithLines(existing),
        wasExisting: true,
      }
    }

    // Provision bookie accounts if needed (idempotent)
    const bookieAccounts = await provisionBookieAccounts({
      data: { profileId, bookieId },
    })

    // Get pending back bets system account
    const pendingBackAccount = await getPendingBackAccount(profileId)

    // Determine source account (cash or bonus)
    const sourceAccount = isBonusBet
      ? bookieAccounts.bonusAccount
      : bookieAccounts.cashAccount

    // Build description - include multi-leg info if applicable
    let description: string
    if (isMultiLegParent(trackerEntry)) {
      const combinedOdds = trackerEntry.combinedOdds
        ? Number(trackerEntry.combinedOdds).toFixed(2)
        : 'N/A'
      description = `Multi (${trackerEntry.legCount} legs) bet placed @ ${combinedOdds} combined`
    } else {
      description = `Bet placed: ${horseName} R${raceNumber} @ ${track}`
    }

    // Create journal entry atomically
    const result = await prisma.$transaction(async (tx) => {
      const entryId = crypto.randomUUID()

      const entry = await tx.journalEntry.create({
        data: {
          id: entryId,
          profileId,
          entryDate: new Date(entryDate || new Date().toISOString().split('T')[0]),
          entryType: 'BET_PLACED',
          description,
          referenceType: 'RACING_TRACKER',
          referenceId: trackerEntryId,
          betType: 'RACING',
        },
      })

      // Memo includes multi-leg info if applicable
      const pendingMemo = isMultiLegParent(trackerEntry)
        ? `Pending: Multi (${trackerEntry.legCount} legs)`
        : `Pending: ${horseName}`
      const placedMemo = isMultiLegParent(trackerEntry)
        ? `Multi bet placed: ${trackerEntry.legCount} legs`
        : `Bet placed: ${horseName}`

      const lines = await Promise.all([
        // Debit Pending Back Bets (stake moves to pending)
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: pendingBackAccount.id,
            debit: stake,
            credit: 0,
            memo: pendingMemo,
          },
        }),
        // Credit source account (bookie cash or bonus)
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: sourceAccount.id,
            debit: 0,
            credit: stake,
            memo: placedMemo,
          },
        }),
      ])

      return { ...entry, JournalLine: lines }
    })

    return {
      journalEntry: mapToJournalEntryWithLines(result),
      wasExisting: false,
    }
  })

/**
 * Record a racing bet win in the journal
 *
 * For cash bets:
 * - Debit Bookie Cash (full returns = stake x odds)
 * - Credit Pending Back Bets (original stake)
 * - Credit Back Bet Wins (profit)
 *
 * For bonus bets:
 * - Debit Bookie Cash (profit only - stake not returned)
 * - Credit Pending Back Bets (stake cleared)
 * - Credit Back Bet Wins (profit as income)
 * - Debit Qualifying Loss (bonus stake expense)
 *
 * This function is idempotent - returns existing entry if already recorded.
 * Also reverses the pending BET_PLACED entry if it exists.
 *
 * @param input - Racing win settlement details
 * @returns Settlement entry, reversed pending entry, calculated returns/profit
 */
export const recordRacingWin = createServerFn({ method: 'POST' })
  .inputValidator((input: RecordRacingWinInput) => input)
  .handler(async ({ data }): Promise<RecordRacingWinResult> => {
    const {
      profileId,
      trackerEntryId,
      bookieId,
      stake,
      odds,
      isBonusBet,
      horseName,
      track,
      raceNumber,
      entryDate,
    } = data

    // Validate inputs
    if (stake <= 0) {
      throw new Error('Stake must be positive')
    }
    if (odds <= 1) {
      throw new Error('Odds must be greater than 1')
    }

    // Calculate returns and profit
    const returns = stake * odds
    const profit = returns - stake

    // Idempotency check: Return existing settlement if already recorded
    const existingSettlement = await prisma.journalEntry.findFirst({
      where: {
        profileId,
        referenceType: 'RACING_TRACKER',
        referenceId: trackerEntryId,
        entryType: 'BET_SETTLED',
        isVoid: false,
      },
      include: { JournalLine: true },
    })

    if (existingSettlement) {
      return {
        settlementEntry: mapToJournalEntryWithLines(existingSettlement),
        reversedPendingEntry: null,
        returns,
        profit,
        wasExisting: true,
      }
    }

    // Get required accounts (includes per-bookie income/expense accounts)
    const bookieAccounts = await provisionBookieAccounts({
      data: { profileId, bookieId },
    })
    const pendingBackAccount = await getPendingBackAccount(profileId)

    // Use per-bookie income/expense accounts instead of global
    const racingIncomeAccount = bookieAccounts.racingIncomeAccount
    const racingExpenseAccount = bookieAccounts.racingExpenseAccount

    // Find and reverse pending BET_PLACED entry if it exists
    let reversedEntry: JournalEntryWithLines | null = null
    const pendingEntry = await prisma.journalEntry.findFirst({
      where: {
        profileId,
        referenceType: 'RACING_TRACKER',
        referenceId: trackerEntryId,
        entryType: 'BET_PLACED',
        isVoid: false,
      },
    })

    if (pendingEntry) {
      try {
        const reversalResult = await reverseJournalEntry({
          data: {
            journalEntryId: pendingEntry.id,
            reason: `Settled: WIN - ${horseName}`,
          },
        })
        reversedEntry = reversalResult.original
      } catch (error) {
        // Log but continue if reversal fails
        console.warn('Failed to reverse pending entry:', error)
      }
    }

    // Build description
    const description = `WIN: ${horseName} R${raceNumber} @ ${track} (${odds.toFixed(2)})`

    // Create settlement journal entry atomically
    const result = await prisma.$transaction(async (tx) => {
      const entryId = crypto.randomUUID()

      const entry = await tx.journalEntry.create({
        data: {
          id: entryId,
          profileId,
          entryDate: new Date(entryDate || new Date().toISOString().split('T')[0]),
          entryType: 'BET_SETTLED',
          description,
          referenceType: 'RACING_TRACKER',
          referenceId: trackerEntryId,
          betType: 'RACING',
        },
      })

      let lines

      if (isBonusBet) {
        // Bonus bet win: profit to cash, stake cleared, income recorded, stake expensed
        // Uses per-bookie income/expense accounts
        lines = await Promise.all([
          // Debit Bookie Cash (profit only - bonus stake not returned)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: bookieAccounts.cashAccount.id,
              debit: profit,
              credit: 0,
              memo: `Bonus bet win profit: ${horseName}`,
            },
          }),
          // Credit Pending Back Bets (clear the stake)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: pendingBackAccount.id,
              debit: 0,
              credit: stake,
              memo: `Bonus stake cleared: ${horseName}`,
            },
          }),
          // Credit Racing Income (profit - per bookie)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: racingIncomeAccount.id,
              debit: 0,
              credit: profit,
              memo: `Bonus bet win: ${horseName}`,
            },
          }),
          // Debit Racing Expense (bonus stake as expense - per bookie)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: racingExpenseAccount.id,
              debit: stake,
              credit: 0,
              memo: `Bonus stake used: ${horseName}`,
            },
          }),
        ])
      } else {
        // Cash bet win: full returns to cash
        lines = await Promise.all([
          // Debit Bookie Cash (full returns = stake + profit)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: bookieAccounts.cashAccount.id,
              debit: returns,
              credit: 0,
              memo: `Returns: ${horseName}`,
            },
          }),
          // Credit Pending Back Bets (original stake cleared)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: pendingBackAccount.id,
              debit: 0,
              credit: stake,
              memo: `Stake returned: ${horseName}`,
            },
          }),
          // Credit Racing Income (profit - per bookie)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: racingIncomeAccount.id,
              debit: 0,
              credit: profit,
              memo: `Profit: ${horseName}`,
            },
          }),
        ])
      }

      return { ...entry, JournalLine: lines }
    })

    return {
      settlementEntry: mapToJournalEntryWithLines(result),
      reversedPendingEntry: reversedEntry,
      returns,
      profit,
      wasExisting: false,
    }
  })

/**
 * Record a racing bet loss in the journal
 *
 * For cash bets:
 * - Debit Back Bet Losses (expense increases)
 * - Credit Pending Back Bets (stake cleared)
 *
 * For bonus bets:
 * - Debit Qualifying Loss (expected cost of bonus use)
 * - Credit Pending Back Bets (stake cleared)
 *
 * This function is idempotent - returns existing entry if already recorded.
 * Also reverses the pending BET_PLACED entry if it exists.
 *
 * @param input - Racing loss settlement details
 * @returns Settlement entry, reversed pending entry, loss details
 */
export const recordRacingLoss = createServerFn({ method: 'POST' })
  .inputValidator((input: RecordRacingLossInput) => input)
  .handler(async ({ data }): Promise<RecordRacingLossResult> => {
    const {
      profileId,
      trackerEntryId,
      bookieId,
      stake,
      isBonusBet,
      horseName,
      track,
      raceNumber,
      entryDate,
    } = data

    // Validate inputs
    if (stake <= 0) {
      throw new Error('Stake must be positive')
    }

    // Determine expense type for reporting (used in return type)
    const expenseType: 'BACK_BET_LOSSES' | 'QUALIFYING_LOSS' = isBonusBet
      ? 'QUALIFYING_LOSS'
      : 'BACK_BET_LOSSES'

    // Idempotency check: Return existing settlement if already recorded
    const existingSettlement = await prisma.journalEntry.findFirst({
      where: {
        profileId,
        referenceType: 'RACING_TRACKER',
        referenceId: trackerEntryId,
        entryType: 'BET_SETTLED',
        isVoid: false,
      },
      include: { JournalLine: true },
    })

    if (existingSettlement) {
      return {
        settlementEntry: mapToJournalEntryWithLines(existingSettlement),
        reversedPendingEntry: null,
        lossAmount: stake,
        expenseType,
        wasExisting: true,
      }
    }

    // Get required accounts (includes per-bookie income/expense)
    const bookieAccounts = await provisionBookieAccounts({
      data: { profileId, bookieId },
    })
    const pendingBackAccount = await getPendingBackAccount(profileId)

    // Use per-bookie expense account instead of global
    const racingExpenseAccount = bookieAccounts.racingExpenseAccount

    // Find and reverse pending BET_PLACED entry if it exists
    let reversedEntry: JournalEntryWithLines | null = null
    const pendingEntry = await prisma.journalEntry.findFirst({
      where: {
        profileId,
        referenceType: 'RACING_TRACKER',
        referenceId: trackerEntryId,
        entryType: 'BET_PLACED',
        isVoid: false,
      },
    })

    if (pendingEntry) {
      try {
        const reversalResult = await reverseJournalEntry({
          data: {
            journalEntryId: pendingEntry.id,
            reason: `Settled: LOSS - ${horseName}`,
          },
        })
        reversedEntry = reversalResult.original
      } catch (error) {
        // Log but continue if reversal fails
        console.warn('Failed to reverse pending entry:', error)
      }
    }

    // Build description
    const expenseLabel = isBonusBet ? 'Qualifying loss' : 'Loss'
    const description = `${expenseLabel}: ${horseName} R${raceNumber} @ ${track}`

    // Create settlement journal entry atomically
    const result = await prisma.$transaction(async (tx) => {
      const entryId = crypto.randomUUID()

      const entry = await tx.journalEntry.create({
        data: {
          id: entryId,
          profileId,
          entryDate: new Date(entryDate || new Date().toISOString().split('T')[0]),
          entryType: 'BET_SETTLED',
          description,
          referenceType: 'RACING_TRACKER',
          referenceId: trackerEntryId,
          betType: 'RACING',
        },
      })

      const lines = await Promise.all([
        // Debit Racing Expense (loss recorded - per bookie)
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: racingExpenseAccount.id,
            debit: stake,
            credit: 0,
            memo: `${expenseLabel}: ${horseName}`,
          },
        }),
        // Credit Pending Back Bets (stake cleared)
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: pendingBackAccount.id,
            debit: 0,
            credit: stake,
            memo: `Stake lost: ${horseName}`,
          },
        }),
      ])

      return { ...entry, JournalLine: lines }
    })

    return {
      settlementEntry: mapToJournalEntryWithLines(result),
      reversedPendingEntry: reversedEntry,
      lossAmount: stake,
      expenseType,
      wasExisting: false,
    }
  })

/**
 * Get default reason text for void type
 */
function getDefaultVoidReason(voidType: VoidType): string {
  switch (voidType) {
    case 'SCRATCHED':
      return 'Horse scratched'
    case 'REFUND':
      return 'Bet refunded'
    case 'VOID':
      return 'Bet voided'
    default:
      return 'Refund'
  }
}

/**
 * Record a void/scratch/refund in the journal
 *
 * For cash bets:
 * - Debit Bookie Cash (stake returned to balance)
 * - Credit Pending Back Bets (stake cleared)
 *
 * For bonus bets:
 * - Debit Bookie Bonus (bonus stake returned)
 * - Credit Pending Back Bets (stake cleared)
 *
 * This function is idempotent - returns existing entry if already recorded.
 * Also reverses the pending BET_PLACED entry if it exists.
 *
 * @param input - Void/scratch/refund details
 * @returns Refund entry, reversed pending entry, refund details
 */
export const recordRacingVoid = createServerFn({ method: 'POST' })
  .inputValidator((input: RecordRacingVoidInput) => input)
  .handler(async ({ data }): Promise<RecordRacingVoidResult> => {
    const {
      profileId,
      trackerEntryId,
      bookieId,
      stake,
      isBonusBet,
      voidType,
      reason,
      horseName,
      track,
      raceNumber,
      entryDate,
    } = data

    // Validate inputs
    if (stake <= 0) {
      throw new Error('Stake must be positive')
    }

    // Determine refund account type
    const refundAccountType: 'BOOKIE_CASH' | 'BOOKIE_BONUS' = isBonusBet
      ? 'BOOKIE_BONUS'
      : 'BOOKIE_CASH'

    // Idempotency check: Return existing settlement if already recorded
    const existingSettlement = await prisma.journalEntry.findFirst({
      where: {
        profileId,
        referenceType: 'RACING_TRACKER',
        referenceId: trackerEntryId,
        entryType: 'BET_SETTLED',
        isVoid: false,
      },
      include: { JournalLine: true },
    })

    if (existingSettlement) {
      return {
        refundEntry: mapToJournalEntryWithLines(existingSettlement),
        reversedPendingEntry: null,
        refundAmount: stake,
        refundAccount: refundAccountType,
        wasExisting: true,
      }
    }

    // Get required accounts
    const bookieAccounts = await provisionBookieAccounts({
      data: { profileId, bookieId },
    })
    const pendingBackAccount = await getPendingBackAccount(profileId)

    // Determine refund account (cash or bonus)
    const refundAccount = isBonusBet
      ? bookieAccounts.bonusAccount
      : bookieAccounts.cashAccount

    // Find and reverse pending BET_PLACED entry if it exists
    let reversedEntry: JournalEntryWithLines | null = null
    const pendingEntry = await prisma.journalEntry.findFirst({
      where: {
        profileId,
        referenceType: 'RACING_TRACKER',
        referenceId: trackerEntryId,
        entryType: 'BET_PLACED',
        isVoid: false,
      },
    })

    if (pendingEntry) {
      try {
        const reversalResult = await reverseJournalEntry({
          data: {
            journalEntryId: pendingEntry.id,
            reason: `${voidType}: ${horseName}`,
          },
        })
        reversedEntry = reversalResult.original
      } catch (error) {
        // Log but continue if reversal fails
        console.warn('Failed to reverse pending entry:', error)
      }
    }

    // Build description with reason
    const voidReason = reason || getDefaultVoidReason(voidType)
    const description = `${voidType}: ${horseName} R${raceNumber} @ ${track} - ${voidReason}`

    // Create refund journal entry atomically
    const result = await prisma.$transaction(async (tx) => {
      const entryId = crypto.randomUUID()

      const entry = await tx.journalEntry.create({
        data: {
          id: entryId,
          profileId,
          entryDate: new Date(entryDate || new Date().toISOString().split('T')[0]),
          entryType: 'BET_SETTLED',
          description,
          referenceType: 'RACING_TRACKER',
          referenceId: trackerEntryId,
          betType: 'RACING',
        },
      })

      const lines = await Promise.all([
        // Debit refund account (stake returned)
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: refundAccount.id,
            debit: stake,
            credit: 0,
            memo: `Refund: ${voidReason}`,
          },
        }),
        // Credit Pending Back Bets (stake cleared)
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: pendingBackAccount.id,
            debit: 0,
            credit: stake,
            memo: `${voidType}: ${horseName}`,
          },
        }),
      ])

      return { ...entry, JournalLine: lines }
    })

    return {
      refundEntry: mapToJournalEntryWithLines(result),
      reversedPendingEntry: reversedEntry,
      refundAmount: stake,
      refundAccount: refundAccountType,
      wasExisting: false,
    }
  })

/**
 * Calculate dead heat returns
 *
 * Formula: returns = (stake/divisor) × odds + stake × (1 - 1/divisor)
 *
 * The "winning" portion (stake/divisor) pays at full odds.
 * The "non-winning" portion (stake - stake/divisor) is returned.
 */
function calculateDeadHeatReturns(
  stake: number,
  odds: number,
  deadHeatDivisor: number
): Omit<DeadHeatCalculation, 'originalStake' | 'deadHeatDivisor'> {
  // Validate divisor
  if (deadHeatDivisor < 1) {
    throw new Error('Dead heat divisor must be at least 1')
  }

  // If divisor is 1, it's a normal win
  if (deadHeatDivisor === 1) {
    const totalReturns = stake * odds
    return {
      effectiveStake: stake,
      returnedStake: 0,
      winningPortion: totalReturns,
      totalReturns,
      profit: totalReturns - stake,
    }
  }

  const effectiveStake = stake / deadHeatDivisor
  const returnedStake = stake - effectiveStake
  const winningPortion = effectiveStake * odds
  const totalReturns = winningPortion + returnedStake
  const profit = totalReturns - stake

  return {
    effectiveStake,
    returnedStake,
    winningPortion,
    totalReturns,
    profit,
  }
}

/**
 * Record a dead heat result in the journal
 *
 * Creates partial win entry with reduced profit based on dead heat rule.
 *
 * For cash bets:
 * - Debit Bookie Cash (reduced returns)
 * - Credit Pending Back Bets (original stake)
 * - Credit Back Bet Wins (reduced profit)
 *
 * For bonus bets:
 * - Only profit goes to cash (if positive)
 * - Stake is cleared from pending
 *
 * This function is idempotent - returns existing entry if already recorded.
 * Also reverses the pending BET_PLACED entry if it exists.
 *
 * @param input - Dead heat settlement details
 * @returns Settlement entry, reversed pending entry, calculation breakdown
 */
export const recordRacingDeadHeat = createServerFn({ method: 'POST' })
  .inputValidator((input: RecordRacingDeadHeatInput) => input)
  .handler(async ({ data }): Promise<RecordRacingDeadHeatResult> => {
    const {
      profileId,
      trackerEntryId,
      bookieId,
      stake,
      odds,
      deadHeatDivisor,
      isBonusBet,
      horseName,
      track,
      raceNumber,
      entryDate,
    } = data

    // Validate inputs
    if (stake <= 0) {
      throw new Error('Stake must be positive')
    }
    if (odds <= 1) {
      throw new Error('Odds must be greater than 1')
    }
    if (deadHeatDivisor < 1) {
      throw new Error('Dead heat divisor must be at least 1')
    }

    // Calculate dead heat returns
    const calc = calculateDeadHeatReturns(stake, odds, deadHeatDivisor)
    const fullCalculation: DeadHeatCalculation = {
      originalStake: stake,
      ...calc,
      deadHeatDivisor,
    }

    // Idempotency check: Return existing settlement if already recorded
    const existingSettlement = await prisma.journalEntry.findFirst({
      where: {
        profileId,
        referenceType: 'RACING_TRACKER',
        referenceId: trackerEntryId,
        entryType: 'BET_SETTLED',
        isVoid: false,
      },
      include: { JournalLine: true },
    })

    if (existingSettlement) {
      return {
        settlementEntry: mapToJournalEntryWithLines(existingSettlement),
        reversedPendingEntry: null,
        calculation: fullCalculation,
        wasExisting: true,
      }
    }

    // Get required accounts (includes per-bookie income/expense)
    const bookieAccounts = await provisionBookieAccounts({
      data: { profileId, bookieId },
    })
    const pendingBackAccount = await getPendingBackAccount(profileId)

    // Use per-bookie income/expense accounts instead of global
    const racingIncomeAccount = bookieAccounts.racingIncomeAccount
    const racingExpenseAccount = bookieAccounts.racingExpenseAccount

    // Find and reverse pending BET_PLACED entry if it exists
    let reversedEntry: JournalEntryWithLines | null = null
    const pendingEntry = await prisma.journalEntry.findFirst({
      where: {
        profileId,
        referenceType: 'RACING_TRACKER',
        referenceId: trackerEntryId,
        entryType: 'BET_PLACED',
        isVoid: false,
      },
    })

    if (pendingEntry) {
      try {
        const reversalResult = await reverseJournalEntry({
          data: {
            journalEntryId: pendingEntry.id,
            reason: `Settled: Dead Heat - ${horseName}`,
          },
        })
        reversedEntry = reversalResult.original
      } catch (error) {
        console.warn('Failed to reverse pending entry:', error)
      }
    }

    // Build description with dead heat factor
    const effectiveOddsMultiplier = odds / deadHeatDivisor + (1 - 1 / deadHeatDivisor)
    const description = `Dead Heat (1/${deadHeatDivisor}): ${horseName} R${raceNumber} @ ${track} (${odds.toFixed(2)} → eff. ${effectiveOddsMultiplier.toFixed(2)})`

    // Create settlement journal entry atomically
    const result = await prisma.$transaction(async (tx) => {
      const entryId = crypto.randomUUID()

      const entry = await tx.journalEntry.create({
        data: {
          id: entryId,
          profileId,
          entryDate: new Date(entryDate || new Date().toISOString().split('T')[0]),
          entryType: 'BET_SETTLED',
          description,
          referenceType: 'RACING_TRACKER',
          referenceId: trackerEntryId,
          betType: 'RACING',
        },
      })

      let lines

      if (isBonusBet) {
        // Bonus bet dead heat: only profit goes to cash
        if (calc.profit > 0) {
          // Positive profit - cash receives profit
          lines = await Promise.all([
            // Debit Bookie Cash (profit only)
            tx.journalLine.create({
              data: {
                id: crypto.randomUUID(),
                journalEntryId: entry.id,
                accountId: bookieAccounts.cashAccount.id,
                debit: calc.profit,
                credit: 0,
                memo: `Dead heat profit: ${horseName}`,
              },
            }),
            // Credit Pending Back Bets (stake cleared)
            tx.journalLine.create({
              data: {
                id: crypto.randomUUID(),
                journalEntryId: entry.id,
                accountId: pendingBackAccount.id,
                debit: 0,
                credit: stake,
                memo: `Bonus stake cleared: ${horseName}`,
              },
            }),
            // Credit Racing Income (profit - per bookie)
            tx.journalLine.create({
              data: {
                id: crypto.randomUUID(),
                journalEntryId: entry.id,
                accountId: racingIncomeAccount.id,
                debit: 0,
                credit: calc.profit,
                memo: `Dead heat win (1/${deadHeatDivisor}): ${horseName}`,
              },
            }),
            // Debit Racing Expense (bonus stake used - per bookie)
            tx.journalLine.create({
              data: {
                id: crypto.randomUUID(),
                journalEntryId: entry.id,
                accountId: racingExpenseAccount.id,
                debit: stake,
                credit: 0,
                memo: `Bonus stake used: ${horseName}`,
              },
            }),
          ])
        } else {
          // Zero or negative profit (rare - very low odds dead heat)
          // Bonus stake is lost, record as racing expense
          lines = await Promise.all([
            // Debit Racing Expense (bonus stake expense - per bookie)
            tx.journalLine.create({
              data: {
                id: crypto.randomUUID(),
                journalEntryId: entry.id,
                accountId: racingExpenseAccount.id,
                debit: stake,
                credit: 0,
                memo: `Dead heat loss: ${horseName}`,
              },
            }),
            // Credit Pending Back Bets (stake cleared)
            tx.journalLine.create({
              data: {
                id: crypto.randomUUID(),
                journalEntryId: entry.id,
                accountId: pendingBackAccount.id,
                debit: 0,
                credit: stake,
                memo: `Bonus stake cleared: ${horseName}`,
              },
            }),
          ])
        }
      } else {
        // Cash bet dead heat: receive reduced returns
        lines = await Promise.all([
          // Debit Bookie Cash (reduced returns)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: bookieAccounts.cashAccount.id,
              debit: calc.totalReturns,
              credit: 0,
              memo: `Dead heat returns: ${horseName}`,
            },
          }),
          // Credit Pending Back Bets (original stake)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: pendingBackAccount.id,
              debit: 0,
              credit: stake,
              memo: `Stake cleared: ${horseName}`,
            },
          }),
          // Credit Racing Income (reduced profit - per bookie)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: racingIncomeAccount.id,
              debit: 0,
              credit: calc.profit,
              memo: `Dead heat profit (1/${deadHeatDivisor}): ${horseName}`,
            },
          }),
        ])
      }

      return { ...entry, JournalLine: lines }
    })

    return {
      settlementEntry: mapToJournalEntryWithLines(result),
      reversedPendingEntry: reversedEntry,
      calculation: fullCalculation,
      wasExisting: false,
    }
  })

// ============================================================================
// Multi-leg Settlement
// ============================================================================

/**
 * Settle a multi-leg bet (Racing Tracker)
 *
 * Called when all legs have outcomes (or when a loss is detected for early settlement).
 * Creates settlement journal entry on the parent entry only.
 *
 * Settlement rules:
 * - LOSS: Immediate settlement when any leg loses (no wait for remaining)
 * - WIN: All active legs won, pays at combined odds (adjusted for scratched)
 * - VOID: All legs scratched, full refund
 * - DEAD_HEAT: Any leg is dead heat, reduced payout with combined DH factor
 *
 * This function is idempotent - returns existing entry if already recorded.
 *
 * @param input - Multi-leg settlement details
 * @returns Settlement result with outcome, calculation, and journal entry
 */
export const settleMultiLegBet = createServerFn({ method: 'POST' })
  .inputValidator((input: SettleMultiLegInput) => input)
  .handler(async ({ data }): Promise<SettleMultiLegResult> => {
    const { profileId, parentEntryId, model, bookieId } = data

    // Only handle racing model in this file
    if (model !== 'racing') {
      throw new Error('Use layManagerJournalHooks for lay model')
    }

    // Get parent entry
    const parent = await prisma.racingTrackerEntry.findUnique({
      where: { id: parentEntryId },
    })

    if (!parent) {
      throw new Error(`Parent entry ${parentEntryId} not found`)
    }

    if (!parent.isMultiLeg) {
      throw new Error('Entry is not a multi-leg parent')
    }

    // Get all child legs
    const children = await getMultiLegChildren(parentEntryId, 'racing')

    if (children.length === 0) {
      return {
        settled: false,
        reason: 'No child legs found for multi-leg bet',
      }
    }

    // Build leg summaries for outcome determination
    const legSummaries = buildLegSummaries(
      children.map((child) => ({
        id: child.id,
        legNumber: child.legNumber,
        outcome: child.outcome,
        backOdds: child.backOdds,
        autoResult: child.autoResult as { deadHeatDivisor?: number } | null,
        horseName: child.horseName,
        track: child.track,
        raceNumber: child.raceNumber,
      }))
    )

    // Determine outcome
    const outcomeResult = determineMultiLegOutcome(legSummaries)

    // If still pending, don't settle yet (unless early loss)
    if (outcomeResult.outcome === 'PENDING') {
      return {
        settled: false,
        reason: 'Not all legs have outcomes yet',
        legSummaries,
      }
    }

    // Idempotency check: Return existing settlement if already recorded
    const existingSettlement = await prisma.journalEntry.findFirst({
      where: {
        profileId,
        referenceType: 'RACING_TRACKER',
        referenceId: parentEntryId,
        entryType: 'BET_SETTLED',
        isVoid: false,
      },
      include: { JournalLine: true },
    })

    if (existingSettlement) {
      return {
        settled: true,
        wasExisting: true,
        outcome: outcomeResult.outcome,
        settlementEntry: mapToJournalEntryWithLines(existingSettlement),
        legSummaries,
      }
    }

    // Get settlement details from parent
    const stake = Number(parent.backStake)
    const originalCombinedOdds = Number(parent.combinedOdds || 1)
    const isBonusBet = !!parent.linkedBonusId
    const resolvedBookieId = bookieId ?? parent.bookieId

    // Get required accounts (includes per-bookie income/expense)
    const bookieAccounts = await provisionBookieAccounts({
      data: { profileId, bookieId: resolvedBookieId },
    })
    const pendingBackAccount = await getPendingBackAccount(profileId)

    // Use per-bookie income/expense accounts
    const racingIncomeAccount = bookieAccounts.racingIncomeAccount
    const racingExpenseAccount = bookieAccounts.racingExpenseAccount

    // Find and reverse pending BET_PLACED entry if it exists
    let reversedPendingEntry: JournalEntryWithLines | null = null
    const pendingEntry = await prisma.journalEntry.findFirst({
      where: {
        profileId,
        referenceType: 'RACING_TRACKER',
        referenceId: parentEntryId,
        entryType: 'BET_PLACED',
        isVoid: false,
      },
    })

    if (pendingEntry) {
      try {
        const reversalResult = await reverseJournalEntry({
          data: {
            journalEntryId: pendingEntry.id,
            reason: `Multi settled: ${outcomeResult.outcome}`,
          },
        })
        reversedPendingEntry = reversalResult.original
      } catch (error) {
        console.warn('Failed to reverse pending entry:', error)
      }
    }

    // Handle based on outcome
    switch (outcomeResult.outcome) {
      case 'LOSS': {
        // Multi loses - stake is lost (use per-bookie expense account)
        const description = buildSettlementDescription(
          'LOSS',
          children.length,
          outcomeResult.activeLegCount,
          outcomeResult.scratchedLegCount,
          0,
          outcomeResult.losingLeg
        )

        const lossResult = await prisma.$transaction(async (tx) => {
          const entryId = crypto.randomUUID()

          const entry = await tx.journalEntry.create({
            data: {
              id: entryId,
              profileId,
              entryDate: new Date(),
              entryType: 'BET_SETTLED',
              description,
              referenceType: 'RACING_TRACKER',
              referenceId: parentEntryId,
              betType: 'RACING',
            },
          })

          const lines = await Promise.all([
            // Debit Racing Expense (stake lost - per bookie)
            tx.journalLine.create({
              data: {
                id: crypto.randomUUID(),
                journalEntryId: entry.id,
                accountId: racingExpenseAccount.id,
                debit: stake,
                credit: 0,
                memo: `Multi loss: ${outcomeResult.losingLeg?.horseName || 'leg lost'}`,
              },
            }),
            // Credit Pending Back Bets (stake cleared)
            tx.journalLine.create({
              data: {
                id: crypto.randomUUID(),
                journalEntryId: entry.id,
                accountId: pendingBackAccount.id,
                debit: 0,
                credit: stake,
                memo: 'Multi stake cleared',
              },
            }),
          ])

          return { ...entry, JournalLine: lines }
        })

        // Update parent entry outcome
        await prisma.racingTrackerEntry.update({
          where: { id: parentEntryId },
          data: {
            outcome: 'LOSS',
            profitLoss: -stake,
          },
        })

        return {
          settled: true,
          outcome: 'LOSS',
          settlementEntry: mapToJournalEntryWithLines(lossResult),
          reversedPendingEntry,
          legSummaries,
        }
      }

      case 'VOID': {
        // All legs scratched - full refund
        const refundAccount = isBonusBet
          ? bookieAccounts.bonusAccount
          : bookieAccounts.cashAccount

        const description = buildSettlementDescription(
          'VOID',
          children.length,
          0,
          children.length,
          0
        )

        const voidResult = await prisma.$transaction(async (tx) => {
          const entryId = crypto.randomUUID()

          const entry = await tx.journalEntry.create({
            data: {
              id: entryId,
              profileId,
              entryDate: new Date(),
              entryType: 'BET_SETTLED',
              description,
              referenceType: 'RACING_TRACKER',
              referenceId: parentEntryId,
              betType: 'RACING',
            },
          })

          const lines = await Promise.all([
            // Debit bookie account (refund returned)
            tx.journalLine.create({
              data: {
                id: crypto.randomUUID(),
                journalEntryId: entry.id,
                accountId: refundAccount.id,
                debit: stake,
                credit: 0,
                memo: 'Multi refund: all legs scratched',
              },
            }),
            // Credit Pending Back Bets (stake cleared)
            tx.journalLine.create({
              data: {
                id: crypto.randomUUID(),
                journalEntryId: entry.id,
                accountId: pendingBackAccount.id,
                debit: 0,
                credit: stake,
                memo: 'Multi stake refunded',
              },
            }),
          ])

          return { ...entry, JournalLine: lines }
        })

        // Update parent entry outcome
        await prisma.racingTrackerEntry.update({
          where: { id: parentEntryId },
          data: {
            outcome: 'SCRATCHED',
            profitLoss: 0,
          },
        })

        return {
          settled: true,
          outcome: 'VOID',
          settlementEntry: mapToJournalEntryWithLines(voidResult),
          reversedPendingEntry,
          legSummaries,
        }
      }

      case 'WIN':
      case 'DEAD_HEAT': {
        // Calculate returns
        const calculation = calculateMultiLegReturns(
          stake,
          originalCombinedOdds,
          outcomeResult.adjustedCombinedOdds,
          outcomeResult.deadHeatFactor
        )

        const deadHeatLegs = legSummaries.filter((l) => l.isDeadHeat)
        const description = buildSettlementDescription(
          outcomeResult.outcome,
          children.length,
          outcomeResult.activeLegCount,
          outcomeResult.scratchedLegCount,
          outcomeResult.adjustedCombinedOdds,
          undefined,
          deadHeatLegs.length > 0
            ? { factor: outcomeResult.deadHeatFactor, legs: deadHeatLegs }
            : undefined
        )

        // Handle bonus bet vs cash bet differently
        let winResult
        if (isBonusBet) {
          // Bonus bet: profit to cash, stake cleared, bonus stake expensed (per-bookie)
          winResult = await prisma.$transaction(async (tx) => {
            const entryId = crypto.randomUUID()

            const entry = await tx.journalEntry.create({
              data: {
                id: entryId,
                profileId,
                entryDate: new Date(),
                entryType: 'BET_SETTLED',
                description,
                referenceType: 'RACING_TRACKER',
                referenceId: parentEntryId,
                betType: 'RACING',
              },
            })

            const lines = await Promise.all([
              // Debit Bookie Cash (profit only)
              tx.journalLine.create({
                data: {
                  id: crypto.randomUUID(),
                  journalEntryId: entry.id,
                  accountId: bookieAccounts.cashAccount.id,
                  debit: calculation.profit,
                  credit: 0,
                  memo: `Multi ${outcomeResult.outcome} profit`,
                },
              }),
              // Credit Pending Back Bets (stake cleared)
              tx.journalLine.create({
                data: {
                  id: crypto.randomUUID(),
                  journalEntryId: entry.id,
                  accountId: pendingBackAccount.id,
                  debit: 0,
                  credit: stake,
                  memo: 'Multi bonus stake cleared',
                },
              }),
              // Credit Racing Income (profit - per bookie)
              tx.journalLine.create({
                data: {
                  id: crypto.randomUUID(),
                  journalEntryId: entry.id,
                  accountId: racingIncomeAccount.id,
                  debit: 0,
                  credit: calculation.profit,
                  memo: `Multi ${outcomeResult.outcome}`,
                },
              }),
              // Debit Racing Expense (bonus stake expensed - per bookie)
              tx.journalLine.create({
                data: {
                  id: crypto.randomUUID(),
                  journalEntryId: entry.id,
                  accountId: racingExpenseAccount.id,
                  debit: stake,
                  credit: 0,
                  memo: 'Multi bonus stake used',
                },
              }),
            ])

            return { ...entry, JournalLine: lines }
          })
        } else {
          // Cash bet: full returns to cash
          winResult = await prisma.$transaction(async (tx) => {
            const entryId = crypto.randomUUID()

            const entry = await tx.journalEntry.create({
              data: {
                id: entryId,
                profileId,
                entryDate: new Date(),
                entryType: 'BET_SETTLED',
                description,
                referenceType: 'RACING_TRACKER',
                referenceId: parentEntryId,
                betType: 'RACING',
              },
            })

            const lines = await Promise.all([
              // Debit Bookie Cash (full returns)
              tx.journalLine.create({
                data: {
                  id: crypto.randomUUID(),
                  journalEntryId: entry.id,
                  accountId: bookieAccounts.cashAccount.id,
                  debit: calculation.totalReturns,
                  credit: 0,
                  memo: `Multi ${outcomeResult.outcome} returns`,
                },
              }),
              // Credit Pending Back Bets (stake cleared)
              tx.journalLine.create({
                data: {
                  id: crypto.randomUUID(),
                  journalEntryId: entry.id,
                  accountId: pendingBackAccount.id,
                  debit: 0,
                  credit: stake,
                  memo: 'Multi stake returned',
                },
              }),
              // Credit Racing Income (profit - per bookie)
              tx.journalLine.create({
                data: {
                  id: crypto.randomUUID(),
                  journalEntryId: entry.id,
                  accountId: racingIncomeAccount.id,
                  debit: 0,
                  credit: calculation.profit,
                  memo: `Multi ${outcomeResult.outcome} profit`,
                },
              }),
            ])

            return { ...entry, JournalLine: lines }
          })
        }

        // Update parent entry outcome and profit
        await prisma.racingTrackerEntry.update({
          where: { id: parentEntryId },
          data: {
            outcome: outcomeResult.outcome === 'DEAD_HEAT' ? 'DEAD_HEAT' : 'WIN',
            combinedOdds: outcomeResult.adjustedCombinedOdds,
            profitLoss: calculation.profit,
          },
        })

        return {
          settled: true,
          outcome: outcomeResult.outcome,
          settlementEntry: mapToJournalEntryWithLines(winResult),
          reversedPendingEntry,
          calculation,
          legSummaries,
        }
      }
    }
  })
