/**
 * Lay Manager Journal Hooks Server Functions
 *
 * TanStack Start server functions for creating journal entries when
 * Lay Manager events occur (matched bet placed, settled, etc.).
 *
 * DO NOT use 'use server' directive - TanStack Start handles this via createServerFn()
 */

import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma'
import { provisionBookieAccounts, provisionBetfairAccounts } from '@/modules/accounts/api/db/accountProvisioner.server'
import { reverseJournalEntry } from '@/modules/accounts/api/db/journalService.server'
import { shouldCreateJournalEntry, isMultiLegParent } from '@/modules/the-furlong/utils/multiLegHelpers'
import type {
  RecordMatchedBetPlacedInput,
  RecordMatchedBetPlacedResult,
  RecordMatchedBetBackWinsInput,
  RecordMatchedBetBackWinsResult,
  RecordMatchedBetLayWinsInput,
  RecordMatchedBetLayWinsResult,
  JournalEntryWithLines,
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
 */
async function getPendingBackAccount(
  profileId: string
): Promise<{ id: string; code: string; name: string }> {
  return getSystemAccount(profileId, 'PENDING_BACK')
}

/**
 * Get the Pending Lay Bets system account for a profile
 */
async function getPendingLayAccount(
  profileId: string
): Promise<{ id: string; code: string; name: string }> {
  return getSystemAccount(profileId, 'PENDING_LAY')
}

/**
 * Calculate lay liability
 * Liability = (Lay Odds - 1) x Lay Stake
 */
function calculateLayLiability(layOdds: number, layStake: number): number {
  return (layOdds - 1) * layStake
}

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Record a matched bet placement in the journal
 *
 * Creates a single journal entry with 4 lines:
 * - Debit Pending Back Bets (back stake)
 * - Credit Bookie Cash/Bonus (back stake leaves bookie)
 * - Debit Pending Lay Bets (lay liability)
 * - Credit Betfair Available (liability reserved)
 *
 * This function is idempotent - returns existing entry if already recorded.
 *
 * @param input - Matched bet placement details
 * @returns Journal entry with lines and calculation details
 */
export const recordMatchedBetPlaced = createServerFn({ method: 'POST' })
  .inputValidator((input: RecordMatchedBetPlacedInput) => input)
  .handler(async ({ data }): Promise<RecordMatchedBetPlacedResult> => {
    const {
      profileId,
      layManagerEntryId,
      backBookieId,
      backStake,
      backOdds,
      isBonusBet,
      layStake,
      layOdds,
      horseName,
      track,
      raceNumber,
      entryDate,
    } = data

    // Validate inputs
    if (backStake <= 0) {
      throw new Error('Back stake must be positive')
    }
    if (layStake <= 0) {
      throw new Error('Lay stake must be positive')
    }
    if (layOdds <= 1) {
      throw new Error('Lay odds must be greater than 1')
    }

    // Calculate lay liability
    const layLiability = calculateLayLiability(layOdds, layStake)
    const totalExposure = backStake + layLiability

    // Fetch the lay manager entry to check multi-leg status
    const layEntry = await prisma.layManagerEntry.findUnique({
      where: { id: layManagerEntryId },
    })

    if (!layEntry) {
      throw new Error(`Lay Manager entry ${layManagerEntryId} not found`)
    }

    // Skip journal creation for child legs (parent handles journal)
    if (!shouldCreateJournalEntry(layEntry)) {
      return {
        journalEntry: null,
        backStake,
        layLiability,
        totalExposure,
        wasExisting: false,
        wasSkipped: true,
        skipReason: 'Child leg - journal created on parent only',
      }
    }

    // Check for existing entry (idempotency)
    const existing = await prisma.journalEntry.findFirst({
      where: {
        profileId,
        referenceType: 'LAY_MANAGER',
        referenceId: layManagerEntryId,
        entryType: 'BET_PLACED',
        isVoid: false,
      },
      include: { JournalLine: true },
    })

    if (existing) {
      return {
        journalEntry: mapToJournalEntryWithLines(existing),
        backStake,
        layLiability,
        totalExposure,
        wasExisting: true,
      }
    }

    // Provision accounts
    const bookieAccounts = await provisionBookieAccounts({
      data: { profileId, bookieId: backBookieId },
    })
    const betfairAccounts = await provisionBetfairAccounts({
      data: { profileId },
    })
    const pendingBackAccount = await getPendingBackAccount(profileId)
    const pendingLayAccount = await getPendingLayAccount(profileId)

    // Determine back source account (cash or bonus)
    const backSourceAccount = isBonusBet
      ? bookieAccounts.bonusAccount
      : bookieAccounts.cashAccount

    // Build description - include multi-leg info if applicable
    let description: string
    if (isMultiLegParent(layEntry)) {
      const combinedOdds = layEntry.combinedOdds
        ? Number(layEntry.combinedOdds).toFixed(2)
        : 'N/A'
      description = `Matched multi (${layEntry.legCount} legs) @ ${combinedOdds} combined (Back $${backStake.toFixed(2)}, Lay $${layStake.toFixed(2)} @ ${layOdds.toFixed(2)})`
    } else {
      description = `Matched bet: ${horseName} R${raceNumber} @ ${track} (Back $${backStake.toFixed(2)} @ ${backOdds.toFixed(2)}, Lay $${layStake.toFixed(2)} @ ${layOdds.toFixed(2)})`
    }

    // Create journal entry with 4 lines
    const result = await prisma.$transaction(async (tx) => {
      const entryId = crypto.randomUUID()

      const entry = await tx.journalEntry.create({
        data: {
          id: entryId,
          profileId,
          entryDate: new Date(entryDate || new Date().toISOString().split('T')[0]),
          entryType: 'BET_PLACED',
          description,
          referenceType: 'LAY_MANAGER',
          referenceId: layManagerEntryId,
          betType: 'LAY_MANAGER',
        },
      })

      // Build memos - include multi-leg info if applicable
      const betLabel = isMultiLegParent(layEntry)
        ? `Multi (${layEntry.legCount} legs)`
        : horseName

      const lines = await Promise.all([
        // === BACK SIDE ===
        // Debit Pending Back Bets (back stake moves to pending)
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: pendingBackAccount.id,
            debit: backStake,
            credit: 0,
            memo: `Back pending: ${betLabel}`,
          },
        }),
        // Credit Bookie Cash/Bonus (back stake leaves bookie)
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: backSourceAccount.id,
            debit: 0,
            credit: backStake,
            memo: `Back stake: ${betLabel}`,
          },
        }),

        // === LAY SIDE ===
        // Debit Pending Lay Bets (lay liability moves to pending)
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: pendingLayAccount.id,
            debit: layLiability,
            credit: 0,
            memo: `Lay liability: ${betLabel} (${layOdds.toFixed(2)})`,
          },
        }),
        // Credit Betfair Available (liability reserved)
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: betfairAccounts.availableAccount.id,
            debit: 0,
            credit: layLiability,
            memo: `Lay exposure: ${betLabel}`,
          },
        }),
      ])

      return { ...entry, JournalLine: lines }
    })

    return {
      journalEntry: mapToJournalEntryWithLines(result),
      backStake,
      layLiability,
      totalExposure,
      wasExisting: false,
    }
  })

/**
 * Record a matched bet settlement where back wins (lay loses)
 *
 * Creates journal entry with 5 lines for cash back bet:
 * Back side (3 lines):
 * - Debit Bookie Cash (full returns)
 * - Credit Pending Back Bets (stake cleared)
 * - Credit Back Bet Wins (profit)
 *
 * Lay side (2 lines):
 * - Debit Lay Bet Payouts (liability paid - expense)
 * - Credit Pending Lay Bets (liability cleared)
 *
 * For bonus back bet, only profit goes to cash (6 lines total).
 *
 * This function is idempotent - returns existing entry if already recorded.
 *
 * @param input - Settlement details with back and lay info
 * @returns Settlement entry with calculation breakdown
 */
export const recordMatchedBetBackWins = createServerFn({ method: 'POST' })
  .inputValidator((input: RecordMatchedBetBackWinsInput) => input)
  .handler(async ({ data }): Promise<RecordMatchedBetBackWinsResult> => {
    const {
      profileId,
      layManagerEntryId,
      backBookieId,
      backStake,
      backOdds,
      isBonusBet,
      layStake,
      layOdds,
      horseName,
      track,
      raceNumber,
      entryDate,
    } = data

    // Validate inputs
    if (backStake <= 0) {
      throw new Error('Back stake must be positive')
    }
    if (backOdds <= 1) {
      throw new Error('Back odds must be greater than 1')
    }
    if (layStake <= 0) {
      throw new Error('Lay stake must be positive')
    }
    if (layOdds <= 1) {
      throw new Error('Lay odds must be greater than 1')
    }

    // Calculate amounts
    const backReturns = backStake * backOdds
    const backProfit = backReturns - backStake
    const layLiabilityPaid = (layOdds - 1) * layStake
    const netProfitLoss = backProfit - layLiabilityPaid

    // Check for existing settlement (idempotency)
    const existingSettlement = await prisma.journalEntry.findFirst({
      where: {
        profileId,
        referenceType: 'LAY_MANAGER',
        referenceId: layManagerEntryId,
        entryType: 'BET_SETTLED',
        isVoid: false,
      },
      include: { JournalLine: true },
    })

    if (existingSettlement) {
      return {
        settlementEntry: mapToJournalEntryWithLines(existingSettlement),
        reversedPendingEntry: null,
        calculation: { backReturns, backProfit, layLiabilityPaid, netProfitLoss },
        wasExisting: true,
      }
    }

    // Get required accounts (includes per-bookie income/expense)
    const bookieAccounts = await provisionBookieAccounts({
      data: { profileId, bookieId: backBookieId },
    })
    const pendingBackAccount = await getPendingBackAccount(profileId)
    const pendingLayAccount = await getPendingLayAccount(profileId)
    const layBetPayoutsAccount = await getSystemAccount(profileId, 'LAY_BET_PAYOUTS')

    // Use per-bookie income account for back wins
    const racingIncomeAccount = bookieAccounts.racingIncomeAccount

    // Find and reverse pending entry
    let reversedEntry: JournalEntryWithLines | null = null
    const pendingEntry = await prisma.journalEntry.findFirst({
      where: {
        profileId,
        referenceType: 'LAY_MANAGER',
        referenceId: layManagerEntryId,
        entryType: 'BET_PLACED',
        isVoid: false,
      },
    })

    if (pendingEntry) {
      const reversalResult = await reverseJournalEntry({
        data: {
          journalEntryId: pendingEntry.id,
          reason: `Settled: Back Wins - ${horseName}`,
        },
      })
      reversedEntry = reversalResult.original
    }

    // Build description
    const netSign = netProfitLoss >= 0 ? '+' : ''
    const description = `Back Wins: ${horseName} R${raceNumber} @ ${track} (Net: ${netSign}$${netProfitLoss.toFixed(2)})`

    // Create settlement journal entry
    const result = await prisma.$transaction(async (tx) => {
      const entryId = crypto.randomUUID()

      const entry = await tx.journalEntry.create({
        data: {
          id: entryId,
          profileId,
          entryDate: new Date(entryDate || new Date().toISOString().split('T')[0]),
          entryType: 'BET_SETTLED',
          description,
          referenceType: 'LAY_MANAGER',
          referenceId: layManagerEntryId,
          betType: 'LAY_MANAGER',
        },
      })

      let lines

      if (isBonusBet) {
        // Bonus back bet: only profit goes to cash
        // Need to offset pending back with debit/credit to clear it
        lines = await Promise.all([
          // === BACK SIDE (Bonus) ===
          // Debit Bookie Cash (profit only)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: bookieAccounts.cashAccount.id,
              debit: backProfit,
              credit: 0,
              memo: `Bonus back win profit: ${horseName}`,
            },
          }),
          // Credit Racing Income (profit - per bookie)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: racingIncomeAccount.id,
              debit: 0,
              credit: backProfit,
              memo: `Back win: ${horseName}`,
            },
          }),
          // Clear Pending Back (debit and credit to net zero after reversal)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: pendingBackAccount.id,
              debit: backStake,
              credit: 0,
              memo: `Bonus stake offset: ${horseName}`,
            },
          }),
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: pendingBackAccount.id,
              debit: 0,
              credit: backStake,
              memo: `Stake cleared: ${horseName}`,
            },
          }),

          // === LAY SIDE ===
          // Debit Lay Bet Payouts (liability paid - expense)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: layBetPayoutsAccount.id,
              debit: layLiabilityPaid,
              credit: 0,
              memo: `Lay payout: ${horseName}`,
            },
          }),
          // Credit Pending Lay Bets (liability cleared)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: pendingLayAccount.id,
              debit: 0,
              credit: layLiabilityPaid,
              memo: `Lay liability cleared: ${horseName}`,
            },
          }),
        ])
      } else {
        // Cash back bet: full returns to cash
        lines = await Promise.all([
          // === BACK SIDE (Cash) ===
          // Debit Bookie Cash (full returns)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: bookieAccounts.cashAccount.id,
              debit: backReturns,
              credit: 0,
              memo: `Back returns: ${horseName}`,
            },
          }),
          // Credit Pending Back Bets (stake cleared)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: pendingBackAccount.id,
              debit: 0,
              credit: backStake,
              memo: `Back stake cleared: ${horseName}`,
            },
          }),
          // Credit Racing Income (profit - per bookie)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: racingIncomeAccount.id,
              debit: 0,
              credit: backProfit,
              memo: `Back profit: ${horseName}`,
            },
          }),

          // === LAY SIDE ===
          // Debit Lay Bet Payouts (liability paid - expense)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: layBetPayoutsAccount.id,
              debit: layLiabilityPaid,
              credit: 0,
              memo: `Lay payout: ${horseName}`,
            },
          }),
          // Credit Pending Lay Bets (liability cleared)
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: pendingLayAccount.id,
              debit: 0,
              credit: layLiabilityPaid,
              memo: `Lay liability cleared: ${horseName}`,
            },
          }),
        ])
      }

      return { ...entry, JournalLine: lines }
    })

    return {
      settlementEntry: mapToJournalEntryWithLines(result),
      reversedPendingEntry: reversedEntry,
      calculation: { backReturns, backProfit, layLiabilityPaid, netProfitLoss },
      wasExisting: false,
    }
  })

/**
 * Record a matched bet settlement where lay wins (back loses)
 *
 * Creates journal entry with 7 lines:
 * Back side (2 lines):
 * - Debit Back Bet Losses or Qualifying Loss (expense)
 * - Credit Pending Back Bets (stake cleared)
 *
 * Lay side (3 lines):
 * - Debit Betfair Available (liability returned + net profit)
 * - Credit Pending Lay Bets (liability cleared)
 * - Credit Lay Bet Wins (net profit after commission)
 *
 * Commission (2 lines):
 * - Debit Betfair Commission (expense)
 * - Credit Betfair Available (commission taken from account)
 *
 * This function is idempotent - returns existing entry if already recorded.
 *
 * @param input - Settlement details with back and lay info
 * @returns Settlement entry with calculation breakdown
 */
export const recordMatchedBetLayWins = createServerFn({ method: 'POST' })
  .inputValidator((input: RecordMatchedBetLayWinsInput) => input)
  .handler(async ({ data }): Promise<RecordMatchedBetLayWinsResult> => {
    const {
      profileId,
      layManagerEntryId,
      backBookieId,
      backStake,
      isBonusBet,
      layStake,
      layOdds,
      layCommissionPercent,
      horseName,
      track,
      raceNumber,
      entryDate,
    } = data

    // Validate inputs
    if (backStake <= 0) {
      throw new Error('Back stake must be positive')
    }
    if (layStake <= 0) {
      throw new Error('Lay stake must be positive')
    }
    if (layOdds <= 1) {
      throw new Error('Lay odds must be greater than 1')
    }

    // Calculate amounts
    const backLoss = backStake
    const layLiabilityReturned = (layOdds - 1) * layStake
    const layGrossProfit = layStake // Backer's stake you keep
    const commissionRate = layCommissionPercent / 100
    const betfairCommission = layGrossProfit * commissionRate
    const layNetProfit = layGrossProfit - betfairCommission
    const netProfitLoss = layNetProfit - backLoss

    // Check for existing settlement (idempotency)
    const existingSettlement = await prisma.journalEntry.findFirst({
      where: {
        profileId,
        referenceType: 'LAY_MANAGER',
        referenceId: layManagerEntryId,
        entryType: 'BET_SETTLED',
        isVoid: false,
      },
      include: { JournalLine: true },
    })

    if (existingSettlement) {
      return {
        settlementEntry: mapToJournalEntryWithLines(existingSettlement),
        reversedPendingEntry: null,
        calculation: {
          backLoss,
          layLiabilityReturned,
          layGrossProfit,
          betfairCommission,
          layNetProfit,
          netProfitLoss,
        },
        wasExisting: true,
      }
    }

    // Get required accounts
    const betfairAccounts = await provisionBetfairAccounts({
      data: { profileId },
    })
    const bookieAccounts = await provisionBookieAccounts({
      data: { profileId, bookieId: backBookieId },
    })
    const pendingBackAccount = await getPendingBackAccount(profileId)
    const pendingLayAccount = await getPendingLayAccount(profileId)
    const layBetWinsAccount = await getSystemAccount(profileId, 'LAY_BET_WINS')
    const betfairCommissionAccount = await getSystemAccount(profileId, 'BETFAIR_COMMISSION')

    // Use per-bookie expense account for back loss
    const racingExpenseAccount = bookieAccounts.racingExpenseAccount

    // Find and reverse pending entry
    let reversedEntry: JournalEntryWithLines | null = null
    const pendingEntry = await prisma.journalEntry.findFirst({
      where: {
        profileId,
        referenceType: 'LAY_MANAGER',
        referenceId: layManagerEntryId,
        entryType: 'BET_PLACED',
        isVoid: false,
      },
    })

    if (pendingEntry) {
      const reversalResult = await reverseJournalEntry({
        data: {
          journalEntryId: pendingEntry.id,
          reason: `Settled: Lay Wins - ${horseName}`,
        },
      })
      reversedEntry = reversalResult.original
    }

    // Build description
    const lossType = isBonusBet ? 'QL' : 'Loss'
    const netSign = netProfitLoss >= 0 ? '+' : ''
    const description = `Lay Wins: ${horseName} R${raceNumber} @ ${track} (${lossType}: $${backLoss.toFixed(2)}, Lay Win: $${layNetProfit.toFixed(2)}, Net: ${netSign}$${netProfitLoss.toFixed(2)})`

    // Create settlement journal entry
    // Total to add back to Betfair = liability returned + net profit
    // (Commission is deducted from gross profit, so we use net)
    const betfairDebitAmount = layLiabilityReturned + layNetProfit

    const result = await prisma.$transaction(async (tx) => {
      const entryId = crypto.randomUUID()

      const entry = await tx.journalEntry.create({
        data: {
          id: entryId,
          profileId,
          entryDate: new Date(entryDate || new Date().toISOString().split('T')[0]),
          entryType: 'BET_SETTLED',
          description,
          referenceType: 'LAY_MANAGER',
          referenceId: layManagerEntryId,
          betType: 'LAY_MANAGER',
        },
      })

      const lines = await Promise.all([
        // === BACK SIDE ===
        // Debit Racing Expense (back loss - per bookie)
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: racingExpenseAccount.id,
            debit: backLoss,
            credit: 0,
            memo: `${isBonusBet ? 'Qualifying loss' : 'Back loss'}: ${horseName}`,
          },
        }),
        // Credit Pending Back Bets (stake cleared)
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: pendingBackAccount.id,
            debit: 0,
            credit: backStake,
            memo: `Back stake cleared: ${horseName}`,
          },
        }),

        // === LAY SIDE ===
        // Debit Betfair Available (liability returned + net profit)
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: betfairAccounts.availableAccount.id,
            debit: betfairDebitAmount,
            credit: 0,
            memo: `Lay win + liability return: ${horseName}`,
          },
        }),
        // Credit Pending Lay Bets (liability cleared)
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: pendingLayAccount.id,
            debit: 0,
            credit: layLiabilityReturned,
            memo: `Lay liability cleared: ${horseName}`,
          },
        }),
        // Credit Lay Bet Wins (net profit after commission)
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: layBetWinsAccount.id,
            debit: 0,
            credit: layNetProfit,
            memo: `Lay profit (after ${layCommissionPercent}% commission): ${horseName}`,
          },
        }),

        // === COMMISSION ===
        // Debit Betfair Commission (expense)
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: betfairCommissionAccount.id,
            debit: betfairCommission,
            credit: 0,
            memo: `Betfair ${layCommissionPercent}% commission: ${horseName}`,
          },
        }),
        // Credit Betfair Available (commission taken from winnings)
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: betfairAccounts.availableAccount.id,
            debit: 0,
            credit: betfairCommission,
            memo: `Commission deducted: ${horseName}`,
          },
        }),
      ])

      return { ...entry, JournalLine: lines }
    })

    return {
      settlementEntry: mapToJournalEntryWithLines(result),
      reversedPendingEntry: reversedEntry,
      calculation: {
        backLoss,
        layLiabilityReturned,
        layGrossProfit,
        betfairCommission,
        layNetProfit,
        netProfitLoss,
      },
      wasExisting: false,
    }
  })
