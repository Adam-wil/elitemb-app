/**
 * Bank Transaction Service - Server Functions
 *
 * TanStack Start server functions for recording bank deposits and withdrawals.
 * Creates balanced journal entries for money flowing between banks and bookies.
 *
 * DO NOT use 'use server' directive - TanStack Start handles this via createServerFn()
 *
 * @see Story 3.11: Bank Transaction Integration
 */

import { createServerFn } from '@tanstack/react-start'
import type { Prisma, JournalEntryType, BetType } from '@prisma/client'

// Dynamic import helper - prevents prisma from being bundled for client
async function getPrisma() {
  const { default: prisma } = await import('@/lib/prisma.server')
  return prisma
}
import {
  provisionBookieAccounts,
  provisionBankAccount,
  provisionBetfairAccounts,
  provisionPendingBetfairDepositAccount,
} from './accountProvisioner.server'
import type {
  RecordBankTransactionInput,
  RecordBankTransactionResult,
  BatchBankTransactionInput,
  BatchBankTransactionResult,
  JournalEntryWithLines,
  RecordBetfairTransactionInput,
  RecordBetfairTransactionResult,
  SettlePendingBetfairDepositInput,
  SettlePendingBetfairDepositResult,
} from '../../types/journal'

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
  bankTransactionId?: string | null
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

// ============================================================================
// Record Bank Transaction
// ============================================================================

/**
 * Record a bank transaction (deposit or withdrawal)
 *
 * DEPOSIT (money flows from bank to bookie):
 *   - Debit Bookie Cash (balance increases)
 *   - Credit Bank Account (balance decreases)
 *
 * WITHDRAWAL (money flows from bookie to bank):
 *   - Debit Bank Account (balance increases)
 *   - Credit Bookie Cash (balance decreases)
 *
 * Features:
 * - Idempotent via bankTransactionId (Basiq transactions won't duplicate)
 * - Auto-provisions bank and bookie accounts if they don't exist
 * - Supports manual entries (no bankTransactionId) or Basiq-linked entries
 *
 * @param input - Bank transaction details
 * @returns Journal entry and created status
 */
export const recordBankTransaction = createServerFn({ method: 'POST' })
  .inputValidator((input: RecordBankTransactionInput) => input)
  .handler(async ({ data }): Promise<RecordBankTransactionResult> => {
    const prisma = await getPrisma()
    const {
      profileId,
      type,
      bookieId,
      amount,
      bankName,
      bankAccountId,
      bankTransactionId,
      notes,
      entryDate,
    } = data

    // Validate amount
    if (amount <= 0) {
      throw new Error('Amount must be positive')
    }

    // Validate bank account identification
    if (!bankName && !bankAccountId) {
      throw new Error('Either bankName or bankAccountId is required')
    }

    // Idempotency check - if bankTransactionId provided, check for existing
    if (bankTransactionId) {
      const existing = await prisma.journalEntry.findFirst({
        where: {
          profileId,
          bankTransactionId,
          isVoid: false,
        },
        include: { JournalLine: true },
      })

      if (existing) {
        return {
          journalEntry: mapToJournalEntryWithLines(existing),
          created: false,
          message: 'Journal entry already exists for this bank transaction',
        }
      }
    }

    // Provision/lookup bookie accounts
    const bookieAccounts = await provisionBookieAccounts({
      data: { profileId, bookieId },
    })

    // Provision/lookup bank account
    let bankAccount
    if (bankAccountId) {
      // Use existing bank account by ID
      bankAccount = await prisma.account.findUnique({
        where: { id: bankAccountId },
      })
      if (!bankAccount) {
        throw new Error(`Bank account not found: ${bankAccountId}`)
      }
      if (bankAccount.profileId !== profileId) {
        throw new Error('Bank account does not belong to this profile')
      }
    } else if (bankName) {
      // Provision or get existing bank account by name
      const bankResult = await provisionBankAccount({
        data: { profileId, bankName },
      })
      bankAccount = bankResult.bankAccount
    }

    if (!bankAccount) {
      throw new Error('Failed to resolve bank account')
    }

    // Get bookie name for description
    const bookie = await prisma.bookie.findUnique({
      where: { id: bookieId },
    })
    const bookieName = bookie?.name || `Bookie ${bookieId}`

    // Determine entry type and description
    const entryType: JournalEntryType = type === 'DEPOSIT' ? 'DEPOSIT' : 'WITHDRAWAL'
    const referenceType = type === 'DEPOSIT' ? 'BANK_DEPOSIT' : 'BANK_WITHDRAWAL'
    const description = type === 'DEPOSIT'
      ? `Deposit to ${bookieName} from ${bankAccount.name}`
      : `Withdrawal from ${bookieName} to ${bankAccount.name}`

    // Build journal lines based on transaction type
    const lines = type === 'DEPOSIT'
      ? [
          // Deposit: Debit Bookie Cash (increase), Credit Bank (decrease)
          { accountId: bookieAccounts.cashAccount.id, debit: amount, credit: 0, memo: notes || `Deposit from ${bankAccount.name}` },
          { accountId: bankAccount.id, debit: 0, credit: amount, memo: notes || `Deposit to ${bookieName}` },
        ]
      : [
          // Withdrawal: Debit Bank (increase), Credit Bookie Cash (decrease)
          { accountId: bankAccount.id, debit: amount, credit: 0, memo: notes || `Withdrawal from ${bookieName}` },
          { accountId: bookieAccounts.cashAccount.id, debit: 0, credit: amount, memo: notes || `Withdrawal to ${bankAccount.name}` },
        ]

    // Create journal entry atomically
    const result = await prisma.$transaction(async (tx) => {
      const entryId = crypto.randomUUID()

      const entry = await tx.journalEntry.create({
        data: {
          id: entryId,
          profileId,
          entryDate: new Date(entryDate || new Date().toISOString().split('T')[0]),
          entryType,
          description,
          referenceType,
          referenceId: bankTransactionId || null,
          bankTransactionId: bankTransactionId || null,
        },
      })

      const journalLines = await Promise.all(
        lines.map((line) =>
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: line.accountId,
              debit: line.debit,
              credit: line.credit,
              memo: line.memo,
            },
          })
        )
      )

      return { ...entry, JournalLine: journalLines }
    })

    return {
      journalEntry: mapToJournalEntryWithLines(result),
      created: true,
      message: `${type} recorded: ${description}`,
    }
  })

// ============================================================================
// Batch Record Bank Transactions
// ============================================================================

/**
 * Record multiple bank transactions in one operation
 *
 * Useful for Basiq batch imports. Each transaction is processed individually
 * with proper error handling - failures don't block other transactions.
 *
 * @param input - Profile ID and array of transactions
 * @returns Summary with counts and individual results
 */
export const recordBankTransactionsBatch = createServerFn({ method: 'POST' })
  .inputValidator((input: BatchBankTransactionInput) => input)
  .handler(async ({ data }): Promise<BatchBankTransactionResult> => {
    const { profileId, transactions } = data

    if (!transactions || transactions.length === 0) {
      return {
        total: 0,
        created: 0,
        skipped: 0,
        failed: 0,
        results: [],
      }
    }

    const results = []

    for (const txn of transactions) {
      try {
        const result = await recordBankTransaction({
          data: { ...txn, profileId },
        })

        results.push({
          success: true,
          journalEntry: result.journalEntry,
          created: result.created,
        })
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          transaction: txn,
        })
      }
    }

    return {
      total: transactions.length,
      created: results.filter((r) => r.success && r.created).length,
      skipped: results.filter((r) => r.success && !r.created).length,
      failed: results.filter((r) => !r.success).length,
      results,
    }
  })

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get bank transactions for a profile
 *
 * Retrieves journal entries with type DEPOSIT or WITHDRAWAL that are
 * marked as bank transactions (referenceType = BANK_DEPOSIT or BANK_WITHDRAWAL).
 *
 * @param input - Filter options
 * @returns Array of journal entries with lines
 */
export const getBankTransactions = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: {
      profileId: string
      bankAccountId?: string
      bookieId?: number
      fromDate?: string
      toDate?: string
      limit?: number
    }) => input
  )
  .handler(async ({ data }): Promise<JournalEntryWithLines[]> => {
    const prisma = await getPrisma()
    const { profileId, bankAccountId, bookieId, fromDate, toDate, limit } = data

    // Build where clause
    const where: Prisma.JournalEntryWhereInput = {
      profileId,
      referenceType: { in: ['BANK_DEPOSIT', 'BANK_WITHDRAWAL'] },
      isVoid: false,
    }

    if (fromDate) {
      where.entryDate = { ...where.entryDate as object, gte: new Date(fromDate) }
    }

    if (toDate) {
      where.entryDate = { ...where.entryDate as object, lte: new Date(toDate) }
    }

    // If filtering by bank account, need to join through journal lines
    if (bankAccountId) {
      where.JournalLine = {
        some: { accountId: bankAccountId },
      }
    }

    // If filtering by bookie, need to find the bookie's cash account
    if (bookieId) {
      const bookieAccount = await prisma.account.findFirst({
        where: {
          profileId,
          bookieId,
          subType: 'BOOKIE_CASH',
        },
      })

      if (bookieAccount) {
        where.JournalLine = {
          some: { accountId: bookieAccount.id },
        }
      }
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        JournalLine: {
          include: { Account: true },
        },
      },
      orderBy: { entryDate: 'desc' },
      take: limit,
    })

    return entries.map(mapToJournalEntryWithLines)
  })

/**
 * Get bank transaction summary for a date range
 *
 * @param input - Profile ID and date range
 * @returns Summary statistics
 */
export const getBankTransactionSummary = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: {
      profileId: string
      fromDate?: string
      toDate?: string
    }) => input
  )
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const { profileId, fromDate, toDate } = data

    const where: Prisma.JournalEntryWhereInput = {
      profileId,
      referenceType: { in: ['BANK_DEPOSIT', 'BANK_WITHDRAWAL'] },
      isVoid: false,
    }

    if (fromDate) {
      where.entryDate = { ...where.entryDate as object, gte: new Date(fromDate) }
    }

    if (toDate) {
      where.entryDate = { ...where.entryDate as object, lte: new Date(toDate) }
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        JournalLine: true,
      },
    })

    // Calculate totals
    let totalDeposits = 0
    let totalWithdrawals = 0
    let depositCount = 0
    let withdrawalCount = 0

    for (const entry of entries) {
      if (entry.referenceType === 'BANK_DEPOSIT') {
        depositCount++
        // Find the bookie cash line (debit side of deposit)
        const cashLine = entry.JournalLine.find((l) => Number(l.debit) > 0)
        if (cashLine) {
          totalDeposits += Number(cashLine.debit)
        }
      } else if (entry.referenceType === 'BANK_WITHDRAWAL') {
        withdrawalCount++
        // Find the bank account line (debit side of withdrawal)
        const bankLine = entry.JournalLine.find((l) => Number(l.debit) > 0)
        if (bankLine) {
          totalWithdrawals += Number(bankLine.debit)
        }
      }
    }

    return {
      depositCount,
      withdrawalCount,
      totalDeposits,
      totalWithdrawals,
      netFlow: totalDeposits - totalWithdrawals,
    }
  })

// ============================================================================
// Betfair Transaction Functions
// ============================================================================

/**
 * Record a Betfair transaction (deposit or withdrawal)
 *
 * DEPOSIT (immediate - money flows from bank to Betfair):
 *   - Debit Betfair Available (balance increases)
 *   - Credit Bank Account (balance decreases)
 *
 * PENDING DEPOSIT (funds in transit):
 *   - Debit Betfair Available (balance increases)
 *   - Credit Pending Betfair Deposit (liability - owed to be settled)
 *
 * WITHDRAWAL (money flows from Betfair to bank):
 *   - Debit Bank Account (balance increases)
 *   - Credit Betfair Available (balance decreases)
 *
 * Features:
 * - Idempotent via bankTransactionId (Basiq transactions won't duplicate)
 * - Auto-provisions Betfair and bank accounts if they don't exist
 * - Supports pending deposits (funds in transit) with later settlement
 *
 * @param input - Betfair transaction details
 * @returns Journal entry and created status
 *
 * @see Story 3.12: Betfair Deposit/Withdrawal Recording
 */
export const recordBetfairTransaction = createServerFn({ method: 'POST' })
  .inputValidator((input: RecordBetfairTransactionInput) => input)
  .handler(async ({ data }): Promise<RecordBetfairTransactionResult> => {
    const prisma = await getPrisma()
    const {
      profileId,
      type,
      amount,
      bankName = 'Betfair Bank',
      bankAccountId,
      bankTransactionId,
      pending = false,
      notes,
      entryDate,
    } = data

    // Validate amount
    if (amount <= 0) {
      throw new Error('Amount must be positive')
    }

    // Pending only applies to deposits
    if (pending && type !== 'DEPOSIT') {
      throw new Error('Only deposits can be marked as pending')
    }

    // Idempotency check - if bankTransactionId provided, check for existing
    if (bankTransactionId) {
      const existing = await prisma.journalEntry.findFirst({
        where: {
          profileId,
          bankTransactionId,
          isVoid: false,
        },
        include: { JournalLine: true },
      })

      if (existing) {
        return {
          journalEntry: mapToJournalEntryWithLines(existing),
          created: false,
          pending: existing.referenceType === 'BETFAIR_PENDING_DEPOSIT',
          message: 'Journal entry already exists for this bank transaction',
        }
      }
    }

    // Provision/lookup Betfair Available account
    const betfairAccounts = await provisionBetfairAccounts({
      data: { profileId },
    })

    let creditAccount
    let referenceType: string
    let description: string

    if (type === 'DEPOSIT') {
      if (pending) {
        // Pending deposit: Credit goes to liability account
        const pendingResult = await provisionPendingBetfairDepositAccount({
          data: { profileId },
        })
        creditAccount = pendingResult.pendingAccount
        referenceType = 'BETFAIR_PENDING_DEPOSIT'
        description = `Pending deposit to Betfair (in transit)`
      } else {
        // Immediate deposit: Credit goes to bank
        if (bankAccountId) {
          creditAccount = await prisma.account.findUnique({
            where: { id: bankAccountId },
          })
          if (!creditAccount) {
            throw new Error(`Bank account not found: ${bankAccountId}`)
          }
          if (creditAccount.profileId !== profileId) {
            throw new Error('Bank account does not belong to this profile')
          }
        } else {
          const bankResult = await provisionBankAccount({
            data: { profileId, bankName },
          })
          creditAccount = bankResult.bankAccount
        }
        referenceType = 'BETFAIR_DEPOSIT'
        description = `Deposit to Betfair from ${creditAccount.name}`
      }
    } else {
      // Withdrawal: Credit Betfair, Debit Bank
      if (bankAccountId) {
        creditAccount = await prisma.account.findUnique({
          where: { id: bankAccountId },
        })
        if (!creditAccount) {
          throw new Error(`Bank account not found: ${bankAccountId}`)
        }
        if (creditAccount.profileId !== profileId) {
          throw new Error('Bank account does not belong to this profile')
        }
      } else {
        const bankResult = await provisionBankAccount({
          data: { profileId, bankName },
        })
        creditAccount = bankResult.bankAccount
      }
      referenceType = 'BETFAIR_WITHDRAWAL'
      description = `Withdrawal from Betfair to ${creditAccount.name}`
    }

    // Determine entry type
    const entryType: JournalEntryType = type === 'DEPOSIT' ? 'DEPOSIT' : 'WITHDRAWAL'

    // Build journal lines based on transaction type
    const lines = type === 'DEPOSIT'
      ? [
          // Deposit (immediate or pending): Debit Betfair Available (increase), Credit Bank/Pending (decrease)
          { accountId: betfairAccounts.availableAccount.id, debit: amount, credit: 0, memo: notes || `Deposit${pending ? ' (pending)' : ''}` },
          { accountId: creditAccount.id, debit: 0, credit: amount, memo: notes || `Deposit to Betfair${pending ? ' (pending)' : ''}` },
        ]
      : [
          // Withdrawal: Debit Bank (increase), Credit Betfair Available (decrease)
          { accountId: creditAccount.id, debit: amount, credit: 0, memo: notes || 'Withdrawal from Betfair' },
          { accountId: betfairAccounts.availableAccount.id, debit: 0, credit: amount, memo: notes || `Withdrawal to ${creditAccount.name}` },
        ]

    // Create journal entry atomically
    const result = await prisma.$transaction(async (tx) => {
      const entryId = crypto.randomUUID()

      const entry = await tx.journalEntry.create({
        data: {
          id: entryId,
          profileId,
          entryDate: new Date(entryDate || new Date().toISOString().split('T')[0]),
          entryType,
          description,
          referenceType,
          referenceId: bankTransactionId || null,
          bankTransactionId: bankTransactionId || null,
        },
      })

      const journalLines = await Promise.all(
        lines.map((line) =>
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: line.accountId,
              debit: line.debit,
              credit: line.credit,
              memo: line.memo,
            },
          })
        )
      )

      return { ...entry, JournalLine: journalLines }
    })

    return {
      journalEntry: mapToJournalEntryWithLines(result),
      created: true,
      pending,
      message: pending
        ? `Pending deposit recorded: ${description}`
        : `${type} recorded: ${description}`,
    }
  })

/**
 * Settle a pending Betfair deposit
 *
 * Called when funds have arrived in Betfair (clearing the pending liability).
 *
 * Creates a settlement entry:
 *   - Debit Pending Betfair Deposit (liability decreases)
 *   - Credit Bank Account (balance decreases)
 *
 * This completes the two-step deposit process:
 * 1. Initial: DR Betfair Available, CR Pending Deposit
 * 2. Settlement: DR Pending Deposit, CR Bank
 *
 * @param input - Settlement details including original pending entry
 * @returns Settlement entry and original entry
 *
 * @see Story 3.12: Betfair Deposit/Withdrawal Recording
 */
export const settlePendingBetfairDeposit = createServerFn({ method: 'POST' })
  .inputValidator((input: SettlePendingBetfairDepositInput) => input)
  .handler(async ({ data }): Promise<SettlePendingBetfairDepositResult> => {
    const prisma = await getPrisma()
    const {
      profileId,
      pendingJournalEntryId,
      bankTransactionId,
      entryDate,
    } = data

    // Find the original pending entry
    const originalEntry = await prisma.journalEntry.findUnique({
      where: { id: pendingJournalEntryId },
      include: { JournalLine: true },
    })

    if (!originalEntry) {
      throw new Error(`Pending journal entry not found: ${pendingJournalEntryId}`)
    }

    if (originalEntry.profileId !== profileId) {
      throw new Error('Journal entry does not belong to this profile')
    }

    if (originalEntry.referenceType !== 'BETFAIR_PENDING_DEPOSIT') {
      throw new Error('Journal entry is not a pending Betfair deposit')
    }

    if (originalEntry.isVoid) {
      throw new Error('Cannot settle a voided entry')
    }

    // Find the pending deposit line (credit side)
    const pendingLine = originalEntry.JournalLine.find((l) => Number(l.credit) > 0)
    if (!pendingLine) {
      throw new Error('Could not find pending deposit line in original entry')
    }

    const amount = Number(pendingLine.credit)

    // Get the pending deposit account
    const pendingAccount = await prisma.account.findUnique({
      where: { id: pendingLine.accountId },
    })

    if (!pendingAccount || pendingAccount.subType !== 'PENDING_BETFAIR_DEPOSIT') {
      throw new Error('Could not find pending Betfair deposit account')
    }

    // Provision/lookup Betfair Bank for the credit side
    const bankResult = await provisionBankAccount({
      data: { profileId, bankName: 'Betfair Bank' },
    })

    // Create settlement entry
    const description = `Settled pending Betfair deposit of $${amount.toFixed(2)}`
    const lines = [
      // Settlement: Debit Pending Deposit (liability decreases), Credit Bank (balance decreases)
      { accountId: pendingAccount.id, debit: amount, credit: 0, memo: 'Settlement - deposit cleared' },
      { accountId: bankResult.bankAccount.id, debit: 0, credit: amount, memo: 'Settlement - deposit to Betfair' },
    ]

    const result = await prisma.$transaction(async (tx) => {
      const entryId = crypto.randomUUID()

      const entry = await tx.journalEntry.create({
        data: {
          id: entryId,
          profileId,
          entryDate: new Date(entryDate || new Date().toISOString().split('T')[0]),
          entryType: 'SETTLEMENT',
          description,
          referenceType: 'BETFAIR_DEPOSIT_SETTLEMENT',
          referenceId: pendingJournalEntryId, // Link to original
          bankTransactionId: bankTransactionId || null,
        },
      })

      const journalLines = await Promise.all(
        lines.map((line) =>
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: entry.id,
              accountId: line.accountId,
              debit: line.debit,
              credit: line.credit,
              memo: line.memo,
            },
          })
        )
      )

      return { ...entry, JournalLine: journalLines }
    })

    return {
      settlementEntry: mapToJournalEntryWithLines(result),
      originalEntry: mapToJournalEntryWithLines(originalEntry),
      message: description,
    }
  })

/**
 * Get pending Betfair deposits for a profile
 *
 * @param input - Profile ID
 * @returns Array of pending deposit journal entries
 */
export const getPendingBetfairDeposits = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId: string }) => d)
  .handler(async ({ data }): Promise<JournalEntryWithLines[]> => {
    const prisma = await getPrisma()
    const { profileId } = data

    const entries = await prisma.journalEntry.findMany({
      where: {
        profileId,
        referenceType: 'BETFAIR_PENDING_DEPOSIT',
        isVoid: false,
      },
      include: { JournalLine: true },
      orderBy: { entryDate: 'desc' },
    })

    return entries.map(mapToJournalEntryWithLines)
  })

/**
 * Get Betfair transaction summary
 *
 * @param input - Profile ID and date range
 * @returns Summary statistics
 */
export const getBetfairTransactionSummary = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: {
      profileId: string
      fromDate?: string
      toDate?: string
    }) => input
  )
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const { profileId, fromDate, toDate } = data

    const where: Prisma.JournalEntryWhereInput = {
      profileId,
      referenceType: {
        in: ['BETFAIR_DEPOSIT', 'BETFAIR_WITHDRAWAL', 'BETFAIR_PENDING_DEPOSIT', 'BETFAIR_DEPOSIT_SETTLEMENT'],
      },
      isVoid: false,
    }

    if (fromDate) {
      where.entryDate = { ...where.entryDate as object, gte: new Date(fromDate) }
    }

    if (toDate) {
      where.entryDate = { ...where.entryDate as object, lte: new Date(toDate) }
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      include: { JournalLine: true },
    })

    // Calculate totals
    let totalDeposits = 0
    let totalWithdrawals = 0
    let pendingDeposits = 0
    let depositCount = 0
    let withdrawalCount = 0
    let pendingCount = 0

    for (const entry of entries) {
      // Find the Betfair Available line to get amount
      const amountLine = entry.JournalLine.find((l) => Number(l.debit) > 0)
      const amount = amountLine ? Number(amountLine.debit) : 0

      if (entry.referenceType === 'BETFAIR_DEPOSIT') {
        depositCount++
        totalDeposits += amount
      } else if (entry.referenceType === 'BETFAIR_WITHDRAWAL') {
        withdrawalCount++
        totalWithdrawals += amount
      } else if (entry.referenceType === 'BETFAIR_PENDING_DEPOSIT') {
        pendingCount++
        pendingDeposits += amount
      }
      // Settlements don't add to totals (they just clear pending)
    }

    return {
      depositCount,
      withdrawalCount,
      pendingCount,
      totalDeposits,
      totalWithdrawals,
      pendingDeposits,
      netFlow: totalDeposits - totalWithdrawals,
    }
  })
