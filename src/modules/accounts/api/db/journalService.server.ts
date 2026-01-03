/**
 * Journal Service - Server Functions
 *
 * Provides double-entry accounting journal entry creation with atomic transactions.
 * All entries must be balanced (total debits = total credits).
 */

import { createServerFn } from '@tanstack/react-start'
import type {
  JournalEntryType,
  BetType,
  Prisma,
  AccountSubType,
} from '@prisma/client'
import type {
  CreateJournalEntryInput,
  JournalEntryWithLines,
  JournalBalanceResult,
  JournalLineInput,
  ReverseJournalEntryInput,
  ReversalResult,
  CreateAdjustmentInput,
  CreateTransferInput,
  BatchJournalEntryInput,
  BatchCreateResult,
  RecordDepositMatchInput,
  DepositMatchResult,
  RecordBonusCreditInput,
  RecordBonusExpiryInput,
  RecordDepositMatchBonusCreditInput,
  RecordDepositMatchBonusCreditResult,
  VoidBonusCreditInput,
} from '../../types/journal'
import {
  validateJournalEntryComplete,
} from '../../utils/journalValidation.server'
import { provisionBookieAccounts } from './accountProvisioner.server'
import { JournalBalanceError } from '../../types/journal'

// Dynamic import helper - prevents prisma from being bundled for client
async function getPrisma() {
  const { default: prisma } = await import('@/lib/prisma.server')
  return prisma
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate that journal entry is balanced (debits = credits)
 * Uses tolerance for floating point comparison
 *
 * @throws JournalBalanceError if entry is unbalanced
 */
export function validateJournalBalance(
  lines: Array<{ debit: number; credit: number }>
): JournalBalanceResult {
  const totalDebits = lines.reduce((sum, line) => sum + line.debit, 0)
  const totalCredits = lines.reduce((sum, line) => sum + line.credit, 0)

  // Use tolerance for floating point comparison (0.001 = 0.1 cents)
  if (Math.abs(totalDebits - totalCredits) > 0.001) {
    throw new JournalBalanceError(totalDebits, totalCredits)
  }

  return { totalDebits, totalCredits }
}

/**
 * Validate that each line has either debit OR credit, not both
 * (zero for the other side is allowed)
 */
function validateLineAmounts(lines: JournalLineInput[]): void {
  for (const line of lines) {
    if (line.debit < 0 || line.credit < 0) {
      throw new Error('Journal line amounts cannot be negative')
    }
    if (line.debit > 0 && line.credit > 0) {
      throw new Error(
        'Journal line cannot have both debit and credit - use separate lines'
      )
    }
    if (line.debit === 0 && line.credit === 0) {
      throw new Error('Journal line must have either a debit or credit amount')
    }
  }
}

/**
 * Validate that all account IDs exist for the given profile
 */
async function validateAccountsExist(
  profileId: string,
  accountIds: string[]
): Promise<void> {
  const prisma = await getPrisma()
  const uniqueAccountIds = [...new Set(accountIds)]

  const accounts = await prisma.account.findMany({
    where: {
      id: { in: uniqueAccountIds },
      profileId,
    },
    select: { id: true },
  })

  const foundIds = new Set(accounts.map((a) => a.id))
  const missingIds = uniqueAccountIds.filter((id) => !foundIds.has(id))

  if (missingIds.length > 0) {
    throw new Error(`Account(s) not found: ${missingIds.join(', ')}`)
  }
}

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Create a balanced journal entry with multiple lines
 *
 * @param input - Journal entry data including lines
 * @returns Created journal entry with all lines
 * @throws JournalBalanceError if debits !== credits
 * @throws Error if accounts not found or invalid amounts
 */
export const createJournalEntry = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateJournalEntryInput) => input)
  .handler(async ({ data }): Promise<JournalEntryWithLines> => {
    const prisma = await getPrisma()
    // Validate line amounts (no negatives, not both debit and credit)
    validateLineAmounts(data.lines)

    // Validate balance (debits = credits)
    validateJournalBalance(data.lines)

    // Validate all accounts exist
    const accountIds = data.lines.map((line) => line.accountId)
    await validateAccountsExist(data.profileId, accountIds)

    // Create atomically in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate UUID for journal entry
      const entryId = crypto.randomUUID()

      // Create the journal entry
      const entry = await tx.journalEntry.create({
        data: {
          id: entryId,
          profileId: data.profileId,
          entryDate: new Date(data.entryDate),
          entryType: data.entryType,
          description: data.description,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          betType: data.betType,
        },
      })

      // Create all journal lines
      const lines = await Promise.all(
        data.lines.map((line) =>
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

      return { ...entry, lines }
    })

    // Return with numeric amounts (Prisma Decimal -> number)
    return mapToJournalEntryWithLines({ ...result, JournalLine: result.lines })
  })

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Helper to map Prisma result to JournalEntryWithLines
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
      credit:
        typeof line.credit === 'number' ? line.credit : Number(line.credit),
      memo: line.memo,
    })),
  }
}

// ============================================================================
// Reversal Functions
// ============================================================================

/**
 * Reverse a journal entry by creating a new entry with swapped debits/credits
 * Original entry is marked as void, maintaining audit trail
 *
 * @param input - Journal entry ID and optional reason
 * @returns Both the voided original and new reversal entry
 * @throws Error if entry not found or already voided
 */
export const reverseJournalEntry = createServerFn({ method: 'POST' })
  .inputValidator((input: ReverseJournalEntryInput) => input)
  .handler(async ({ data }): Promise<ReversalResult> => {
    const prisma = await getPrisma()
    const { journalEntryId, reason } = data

    // Get original entry with lines
    const original = await prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: { JournalLine: true },
    })

    if (!original) {
      throw new Error(`Journal entry ${journalEntryId} not found`)
    }

    if (original.isVoid) {
      throw new Error(`Journal entry ${journalEntryId} is already voided`)
    }

    // Create reversal atomically
    const result = await prisma.$transaction(async (tx) => {
      // Mark original as voided
      const voidedOriginal = await tx.journalEntry.update({
        where: { id: journalEntryId },
        data: {
          isVoid: true,
          voidReason: reason || 'Reversed',
          voidedAt: new Date(),
        },
        include: { JournalLine: true },
      })

      // Generate UUID for reversal entry
      const reversalId = crypto.randomUUID()

      // Create reversal entry
      const reversalEntry = await tx.journalEntry.create({
        data: {
          id: reversalId,
          profileId: original.profileId,
          entryDate: new Date(), // Reversal dated today
          entryType: original.entryType,
          description: `Reversal of: ${original.description || original.id}`,
          referenceType: 'REVERSAL',
          referenceId: original.id,
          betType: original.betType,
        },
      })

      // Create reversed lines (swap debits/credits)
      const reversalLines = await Promise.all(
        original.JournalLine.map((line) =>
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: reversalEntry.id,
              accountId: line.accountId,
              debit: Number(line.credit), // Swap: original credit becomes debit
              credit: Number(line.debit), // Swap: original debit becomes credit
              memo: line.memo ? `Reversal: ${line.memo}` : 'Reversal',
            },
          })
        )
      )

      return {
        voidedOriginal,
        reversalEntry: { ...reversalEntry, JournalLine: reversalLines },
      }
    })

    // Map to return types
    return {
      original: mapToJournalEntryWithLines(result.voidedOriginal),
      reversal: mapToJournalEntryWithLines(result.reversalEntry),
    }
  })

// ============================================================================
// System Account Helpers
// ============================================================================

/**
 * Find system account by subType for a profile
 */
async function getSystemAccount(
  profileId: string,
  subType: AccountSubType
): Promise<{ id: string; code: string; name: string }> {
  const prisma = await getPrisma()
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

// ============================================================================
// Adjustment Functions
// ============================================================================

/**
 * Create a manual adjustment entry
 *
 * Positive amount: Debit target account, Credit Manual Adjustments (increases balance)
 * Negative amount: Debit Manual Adjustments, Credit target account (decreases balance)
 *
 * @param input - Adjustment details
 * @returns Created journal entry with lines
 */
export const createAdjustment = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateAdjustmentInput) => input)
  .handler(async ({ data }): Promise<JournalEntryWithLines> => {
    const prisma = await getPrisma()
    const { profileId, accountId, amount, reason, entryDate } = data

    // Validate amount
    if (amount === 0) {
      throw new Error('Adjustment amount cannot be zero')
    }

    // Validate reason
    if (!reason || reason.trim() === '') {
      throw new Error('Adjustment reason is required')
    }

    // Get target account
    const targetAccount = await prisma.account.findUnique({
      where: { id: accountId },
    })

    if (!targetAccount) {
      throw new Error(`Account ${accountId} not found`)
    }

    if (targetAccount.profileId !== profileId) {
      throw new Error('Account does not belong to this profile')
    }

    // Get Manual Adjustments equity account
    const adjustmentAccount = await getSystemAccount(profileId, 'ADJUSTMENT')

    // Build journal lines based on amount sign
    const absAmount = Math.abs(amount)
    const lines: JournalLineInput[] = []

    if (amount > 0) {
      // Positive: increase target account balance
      // Debit target (assets increase with debit)
      // Credit adjustments (equity)
      lines.push(
        { accountId: targetAccount.id, debit: absAmount, credit: 0, memo: reason },
        { accountId: adjustmentAccount.id, debit: 0, credit: absAmount, memo: reason }
      )
    } else {
      // Negative: decrease target account balance
      // Debit adjustments (equity)
      // Credit target (assets decrease with credit)
      lines.push(
        { accountId: adjustmentAccount.id, debit: absAmount, credit: 0, memo: reason },
        { accountId: targetAccount.id, debit: 0, credit: absAmount, memo: reason }
      )
    }

    // Create the journal entry atomically
    const result = await prisma.$transaction(async (tx) => {
      const entryId = crypto.randomUUID()

      const entry = await tx.journalEntry.create({
        data: {
          id: entryId,
          profileId,
          entryDate: new Date(entryDate || new Date().toISOString().split('T')[0]),
          entryType: 'ADJUSTMENT',
          description: reason,
          referenceType: 'MANUAL_ADJUSTMENT',
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

    return mapToJournalEntryWithLines(result)
  })

// ============================================================================
// Transfer Functions
// ============================================================================

/**
 * Create a transfer entry between two accounts
 *
 * Creates a balanced journal entry:
 * - Debit to-account (increases balance for assets)
 * - Credit from-account (decreases balance for assets)
 *
 * @param input - Transfer details
 * @returns Created journal entry with lines
 * @throws Error if validation fails
 */
export const createTransfer = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateTransferInput) => input)
  .handler(async ({ data }): Promise<JournalEntryWithLines> => {
    const prisma = await getPrisma()
    const { profileId, fromAccountId, toAccountId, amount, description, entryDate } = data

    // Validate amount is positive
    if (amount <= 0) {
      throw new Error('Transfer amount must be positive')
    }

    // Validate description
    if (!description || description.trim() === '') {
      throw new Error('Transfer description is required')
    }

    // Validate accounts are different
    if (fromAccountId === toAccountId) {
      throw new Error('Cannot transfer to the same account')
    }

    // Validate both accounts exist and belong to profile
    const [fromAccount, toAccount] = await Promise.all([
      prisma.account.findUnique({
        where: { id: fromAccountId },
        select: { id: true, profileId: true, name: true },
      }),
      prisma.account.findUnique({
        where: { id: toAccountId },
        select: { id: true, profileId: true, name: true },
      }),
    ])

    if (!fromAccount) {
      throw new Error(`Source account ${fromAccountId} not found`)
    }
    if (!toAccount) {
      throw new Error(`Destination account ${toAccountId} not found`)
    }
    if (fromAccount.profileId !== profileId) {
      throw new Error('Source account does not belong to this profile')
    }
    if (toAccount.profileId !== profileId) {
      throw new Error('Destination account does not belong to this profile')
    }

    // Create journal lines: Credit from, Debit to
    const lines: JournalLineInput[] = [
      { accountId: fromAccountId, debit: 0, credit: amount, memo: `Transfer to ${toAccount.name}` },
      { accountId: toAccountId, debit: amount, credit: 0, memo: `Transfer from ${fromAccount.name}` },
    ]

    // Create the journal entry atomically
    const result = await prisma.$transaction(async (tx) => {
      const entryId = crypto.randomUUID()

      const entry = await tx.journalEntry.create({
        data: {
          id: entryId,
          profileId,
          entryDate: new Date(entryDate || new Date().toISOString().split('T')[0]),
          entryType: 'TRANSFER',
          description,
          referenceType: 'ACCOUNT_TRANSFER',
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

    return mapToJournalEntryWithLines(result)
  })

// ============================================================================
// Batch Functions
// ============================================================================

/**
 * Create multiple journal entries in a single transaction
 *
 * All entries are validated before any are created (fail-fast).
 * Uses a single database transaction for atomicity (all-or-nothing).
 *
 * @param input - Batch of journal entries to create
 * @returns BatchCreateResult with created entries or validation errors
 */
export const createBatchJournalEntries = createServerFn({ method: 'POST' })
  .inputValidator((input: BatchJournalEntryInput) => input)
  .handler(async ({ data }): Promise<BatchCreateResult> => {
    const prisma = await getPrisma()
    const { profileId, entries } = data

    // Edge case: empty array
    if (!entries || entries.length === 0) {
      return {
        success: true,
        created: [],
      }
    }

    // Phase 1: Pre-validate all entries
    const validationResults = await Promise.all(
      entries.map(async (entry, index) => {
        // Ensure profileId matches
        const entryWithProfile: CreateJournalEntryInput = {
          ...entry,
          profileId,
        }
        const result = await validateJournalEntryComplete(entryWithProfile)
        return { index, result }
      })
    )

    // Collect all validation errors
    const entriesWithErrors = validationResults
      .filter(({ result }) => !result.isValid)
      .map(({ index, result }) => ({
        index,
        errors: result.errors,
      }))

    // If any entries have errors, return early (fail-fast)
    if (entriesWithErrors.length > 0) {
      return {
        success: false,
        created: [],
        errors: entriesWithErrors,
      }
    }

    // Phase 2: Create all entries in a single transaction
    const createdEntries = await prisma.$transaction(
      async (tx) => {
        const results: JournalEntryWithLines[] = []

        for (const entryInput of entries) {
          const entryId = crypto.randomUUID()

          // Create the journal entry
          const entry = await tx.journalEntry.create({
            data: {
              id: entryId,
              profileId,
              entryDate: new Date(entryInput.entryDate),
              entryType: entryInput.entryType,
              description: entryInput.description,
              referenceType: entryInput.referenceType,
              referenceId: entryInput.referenceId,
              betType: entryInput.betType,
            },
          })

          // Create journal lines
          const lines = await Promise.all(
            entryInput.lines.map((line) =>
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

          results.push(mapToJournalEntryWithLines({ ...entry, JournalLine: lines }))
        }

        return results
      },
      {
        timeout: 30000, // 30 second timeout for large batches
      }
    )

    return {
      success: true,
      created: createdEntries,
    }
  })

// ============================================================================
// Deposit Match Functions
// ============================================================================

/**
 * Record a deposit match transaction (deposit + optional bonus credit)
 *
 * Creates two journal entries:
 * 1. Deposit: Debit Bookie Cash, Credit Bank Account
 * 2. Bonus (if bonusAmount > 0): Debit Bookie Bonus, Credit Bonus Income
 *
 * Both entries share a reference ID to link them together.
 *
 * @param input - Deposit match details
 * @returns Both entries and the shared reference ID
 */
export const recordDepositMatch = createServerFn({ method: 'POST' })
  .inputValidator((input: RecordDepositMatchInput) => input)
  .handler(async ({ data }): Promise<DepositMatchResult> => {
    const prisma = await getPrisma()
    const {
      profileId,
      bookieId,
      depositAmount,
      bonusAmount,
      description,
      entryDate,
    } = data

    // Validate amounts
    if (depositAmount <= 0) {
      throw new Error('Deposit amount must be positive')
    }

    if (bonusAmount < 0) {
      throw new Error('Bonus amount cannot be negative')
    }

    // Get bookie details
    const bookie = await prisma.bookie.findUnique({
      where: { id: bookieId },
    })

    if (!bookie) {
      throw new Error(`Bookie ${bookieId} not found`)
    }

    // Ensure bookie accounts exist (provisions if needed)
    const bookieAccounts = await provisionBookieAccounts({
      data: { profileId, bookieId },
    })

    // Get bank account
    const bankAccount = await prisma.account.findFirst({
      where: {
        profileId,
        subType: 'BANK',
      },
    })

    if (!bankAccount) {
      throw new Error('Bank account not found. Please set up a bank account first.')
    }

    // Get bonus income system account
    const bonusIncomeAccount = await getSystemAccount(profileId, 'BONUS_INCOME')

    // Generate shared reference ID to link deposit and bonus entries
    const sharedReferenceId = `DEPOSIT_MATCH_${crypto.randomUUID()}`
    const effectiveDate = entryDate || new Date().toISOString().split('T')[0]
    const desc = description || `Deposit match at ${bookie.name}`

    // Create both entries in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create DEPOSIT entry
      // Debit Bookie Cash (asset increases), Credit Bank (asset decreases)
      const depositEntryId = crypto.randomUUID()

      const depositEntryData = await tx.journalEntry.create({
        data: {
          id: depositEntryId,
          profileId,
          entryDate: new Date(effectiveDate),
          entryType: 'DEPOSIT',
          description: `${desc} - Deposit`,
          referenceType: 'DEPOSIT_MATCH',
          referenceId: sharedReferenceId,
        },
      })

      const depositLines = await Promise.all([
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: depositEntryData.id,
            accountId: bookieAccounts.cashAccount.id,
            debit: depositAmount,
            credit: 0,
            memo: `Deposit to ${bookie.name}`,
          },
        }),
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: depositEntryData.id,
            accountId: bankAccount.id,
            debit: 0,
            credit: depositAmount,
            memo: `Deposit to ${bookie.name}`,
          },
        }),
      ])

      const depositEntry = mapToJournalEntryWithLines({
        ...depositEntryData,
        JournalLine: depositLines,
      })

      // 2. Create BONUS entry (if bonus amount > 0)
      let bonusEntry: JournalEntryWithLines | null = null

      if (bonusAmount > 0) {
        const bonusEntryId = crypto.randomUUID()

        const bonusEntryData = await tx.journalEntry.create({
          data: {
            id: bonusEntryId,
            profileId,
            entryDate: new Date(effectiveDate),
            entryType: 'BONUS_CREDITED',
            description: `${desc} - Bonus Credit`,
            referenceType: 'DEPOSIT_MATCH',
            referenceId: sharedReferenceId,
          },
        })

        const bonusLines = await Promise.all([
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: bonusEntryData.id,
              accountId: bookieAccounts.bonusAccount.id,
              debit: bonusAmount,
              credit: 0,
              memo: `Bonus credit from ${bookie.name}`,
            },
          }),
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: bonusEntryData.id,
              accountId: bonusIncomeAccount.id,
              debit: 0,
              credit: bonusAmount,
              memo: `Bonus credit from ${bookie.name}`,
            },
          }),
        ])

        bonusEntry = mapToJournalEntryWithLines({
          ...bonusEntryData,
          JournalLine: bonusLines,
        })
      }

      return { depositEntry, bonusEntry, sharedReferenceId }
    })

    return {
      depositEntry: result.depositEntry,
      bonusEntry: result.bonusEntry,
      referenceId: result.sharedReferenceId,
    }
  })

// ============================================================================
// Bonus Credit Functions
// ============================================================================

/**
 * Record a standalone bonus credit (not tied to deposit)
 *
 * Creates a single journal entry:
 * - Debit Bookie Bonus (asset increases)
 * - Credit Bonus Income (income increases)
 *
 * Use this for: sign-up free bets, promo rewards, refund offers, loyalty bonuses
 *
 * @param input - Bonus credit details
 * @returns Created journal entry
 */
export const recordBonusCredit = createServerFn({ method: 'POST' })
  .inputValidator((input: RecordBonusCreditInput) => input)
  .handler(async ({ data }): Promise<JournalEntryWithLines> => {
    const prisma = await getPrisma()
    const {
      profileId,
      bookieId,
      amount,
      reason,
      bonusId,
      entryDate,
    } = data

    // Validate amount
    if (amount <= 0) {
      throw new Error('Bonus amount must be positive')
    }

    // Validate reason
    if (!reason || reason.trim() === '') {
      throw new Error('Bonus reason is required')
    }

    // Get bookie details
    const bookie = await prisma.bookie.findUnique({
      where: { id: bookieId },
    })

    if (!bookie) {
      throw new Error(`Bookie ${bookieId} not found`)
    }

    // Verify bonus record exists if provided
    if (bonusId) {
      const bonus = await prisma.bonus.findUnique({
        where: { id: bonusId },
      })

      if (!bonus) {
        throw new Error(`Bonus record ${bonusId} not found`)
      }

      if (bonus.profileId !== profileId) {
        throw new Error('Bonus record belongs to different profile')
      }
    }

    // Ensure bookie accounts exist (provisions if needed)
    const bookieAccounts = await provisionBookieAccounts({
      data: { profileId, bookieId },
    })

    // Get bonus income system account
    const bonusIncomeAccount = await getSystemAccount(profileId, 'BONUS_INCOME')

    const effectiveDate = entryDate || new Date().toISOString().split('T')[0]

    // Create journal entry in transaction
    const result = await prisma.$transaction(async (tx) => {
      const entryId = crypto.randomUUID()

      const entry = await tx.journalEntry.create({
        data: {
          id: entryId,
          profileId,
          entryDate: new Date(effectiveDate),
          entryType: 'BONUS_CREDITED',
          description: `${bookie.name}: ${reason}`,
          referenceType: bonusId ? 'BONUS' : 'STANDALONE_BONUS',
          referenceId: bonusId || null,
        },
      })

      const lines = await Promise.all([
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: bookieAccounts.bonusAccount.id,
            debit: amount,
            credit: 0,
            memo: reason,
          },
        }),
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: bonusIncomeAccount.id,
            debit: 0,
            credit: amount,
            memo: reason,
          },
        }),
      ])

      return { ...entry, JournalLine: lines }
    })

    return mapToJournalEntryWithLines(result)
  })

// ============================================================================
// Bonus Expiry Functions
// ============================================================================

/**
 * Helper to get account balance from journal entries
 * For asset accounts, balance = total debits - total credits
 */
async function getAccountBalance(profileId: string, accountId: string): Promise<number> {
  const prisma = await getPrisma()
  const result = await prisma.journalLine.aggregate({
    where: {
      accountId,
      JournalEntry: {
        profileId,
        isVoid: false,
      },
    },
    _sum: {
      debit: true,
      credit: true,
    },
  })

  const totalDebit = Number(result._sum.debit || 0)
  const totalCredit = Number(result._sum.credit || 0)

  // For asset accounts, balance = debits - credits
  return totalDebit - totalCredit
}

/**
 * Record a bonus expiry (unused bonus bet expires)
 *
 * Creates a single journal entry:
 * - Debit Bonus Expired (expense increases)
 * - Credit Bookie Bonus (asset decreases)
 *
 * Validates that bonus balance is sufficient before expiring.
 *
 * @param input - Bonus expiry details
 * @returns Created journal entry
 */
export const recordBonusExpiry = createServerFn({ method: 'POST' })
  .inputValidator((input: RecordBonusExpiryInput) => input)
  .handler(async ({ data }): Promise<JournalEntryWithLines> => {
    const prisma = await getPrisma()
    const {
      profileId,
      bookieId,
      amount,
      reason,
      bonusId,
      entryDate,
    } = data

    // Validate amount
    if (amount <= 0) {
      throw new Error('Expiry amount must be positive')
    }

    // Validate reason
    if (!reason || reason.trim() === '') {
      throw new Error('Expiry reason is required')
    }

    // Get bookie details
    const bookie = await prisma.bookie.findUnique({
      where: { id: bookieId },
    })

    if (!bookie) {
      throw new Error(`Bookie ${bookieId} not found`)
    }

    // Verify bonus record exists if provided
    if (bonusId) {
      const bonus = await prisma.bonus.findUnique({
        where: { id: bonusId },
      })

      if (!bonus) {
        throw new Error(`Bonus record ${bonusId} not found`)
      }

      if (bonus.profileId !== profileId) {
        throw new Error('Bonus record belongs to different profile')
      }
    }

    // Ensure bookie accounts exist (provisions if needed)
    const bookieAccounts = await provisionBookieAccounts({
      data: { profileId, bookieId },
    })

    // Validate bonus balance is sufficient
    const bonusBalance = await getAccountBalance(profileId, bookieAccounts.bonusAccount.id)

    if (bonusBalance < amount) {
      throw new Error(
        `Insufficient bonus balance. Available: $${bonusBalance.toFixed(2)}, ` +
        `Requested expiry: $${amount.toFixed(2)}`
      )
    }

    // Get bonus expired expense account
    const bonusExpiredAccount = await getSystemAccount(profileId, 'BONUS_EXPIRED')

    const effectiveDate = entryDate || new Date().toISOString().split('T')[0]

    // Create journal entry and update Bonus record in transaction
    const result = await prisma.$transaction(async (tx) => {
      const entryId = crypto.randomUUID()

      const entry = await tx.journalEntry.create({
        data: {
          id: entryId,
          profileId,
          entryDate: new Date(effectiveDate),
          entryType: 'BONUS_WAGERED', // Using existing type for bonus removal
          description: `${bookie.name}: ${reason}`,
          referenceType: bonusId ? 'BONUS' : 'BONUS_EXPIRY',
          referenceId: bonusId || null,
        },
      })

      const lines = await Promise.all([
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: bonusExpiredAccount.id,
            debit: amount,
            credit: 0,
            memo: `Expired: ${reason}`,
          },
        }),
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: bookieAccounts.bonusAccount.id,
            debit: 0,
            credit: amount,
            memo: `Expired: ${reason}`,
          },
        }),
      ])

      // Update Bonus record status if bonusId provided
      if (bonusId) {
        await tx.bonus.update({
          where: { id: bonusId },
          data: {
            status: 'EXPIRED',
          },
        })
      }

      return { ...entry, JournalLine: lines }
    })

    return mapToJournalEntryWithLines(result)
  })

// ============================================================================
// Balance Adjustment by Bookie Name (UI-friendly wrapper)
// ============================================================================

/**
 * Input for adjusting balance by bookie name
 * This is a UI-friendly wrapper that translates bookieName + newBalance
 * into the accountId + amount format needed by createAdjustment
 */
export interface AdjustBalanceByBookieInput {
  profileId: string
  bookieName: string
  newBalance: number
  reason: string
  entryDate?: string
}

/**
 * Result of balance adjustment
 */
export interface AdjustBalanceResult {
  journalEntry: JournalEntryWithLines
  previousBalance: number
  newBalance: number
  adjustmentAmount: number
}

/**
 * Adjust a bookie's balance to match a user-entered actual balance
 *
 * This function:
 * 1. Looks up the bookie's cash account by bookieName
 * 2. Gets the current calculated balance from journal entries
 * 3. Calculates the difference (adjustment amount)
 * 4. Creates an ADJUSTMENT journal entry
 *
 * @param input - Adjustment details with bookieName and target newBalance
 * @returns The journal entry and balance change details
 */
export const adjustBalanceByBookie = createServerFn({ method: 'POST' })
  .inputValidator((input: AdjustBalanceByBookieInput) => input)
  .handler(async ({ data }): Promise<AdjustBalanceResult> => {
    const prisma = await getPrisma()
    let { profileId, bookieName, newBalance, reason, entryDate } = data

    // Resolve default profile if not provided
    if (!profileId) {
      profileId = await getDefaultProfileId()
    }

    // Validate reason
    if (!reason || reason.trim().length < 5) {
      throw new Error('Adjustment reason is required (minimum 5 characters)')
    }

    // Find the bookie's cash account (case-insensitive search)
    const cashAccount = await prisma.account.findFirst({
      where: {
        profileId,
        bookieName: { equals: bookieName, mode: 'insensitive' },
        subType: { in: ['BOOKIE_CASH', 'BETFAIR_AVAILABLE'] },
        isActive: true,
      },
      select: { id: true, name: true, subType: true },
    })

    if (!cashAccount) {
      throw new Error(`Cash account for bookie "${bookieName}" not found`)
    }

    // Get current balance from journal entries (AccountBalanceView logic)
    const balanceResult = await prisma.$queryRaw<{ balance: number }[]>`
      SELECT COALESCE(SUM("debit") - SUM("credit"), 0)::numeric AS "balance"
      FROM "JournalLine" jl
      JOIN "JournalEntry" je ON je."id" = jl."journalEntryId"
      WHERE jl."accountId" = ${cashAccount.id}
        AND je."isVoid" = false
    `

    const currentBalance = Number(balanceResult[0]?.balance ?? 0)
    const adjustmentAmount = newBalance - currentBalance

    // If no adjustment needed, return early
    if (Math.abs(adjustmentAmount) < 0.01) {
      throw new Error('No adjustment needed - balance already matches')
    }

    // Get ADJUSTMENT system account
    const adjustmentAccount = await prisma.account.findFirst({
      where: {
        profileId,
        subType: 'ADJUSTMENT',
        isSystem: true,
      },
      select: { id: true },
    })

    if (!adjustmentAccount) {
      throw new Error('ADJUSTMENT system account not found. Run account seeder first.')
    }

    // Build journal lines
    const absAmount = Math.abs(adjustmentAmount)
    const lines: JournalLineInput[] = []

    if (adjustmentAmount > 0) {
      // Positive: increase bookie cash balance
      // Debit cash account (asset increases)
      // Credit adjustment account (equity)
      lines.push(
        { accountId: cashAccount.id, debit: absAmount, credit: 0, memo: reason },
        { accountId: adjustmentAccount.id, debit: 0, credit: absAmount, memo: reason }
      )
    } else {
      // Negative: decrease bookie cash balance
      // Debit adjustment account (equity)
      // Credit cash account (asset decreases)
      lines.push(
        { accountId: adjustmentAccount.id, debit: absAmount, credit: 0, memo: reason },
        { accountId: cashAccount.id, debit: 0, credit: absAmount, memo: reason }
      )
    }

    // Create the journal entry
    const result = await prisma.$transaction(async (tx) => {
      const entryId = crypto.randomUUID()

      const entry = await tx.journalEntry.create({
        data: {
          id: entryId,
          profileId,
          entryDate: new Date(entryDate || new Date().toISOString().split('T')[0]),
          entryType: 'ADJUSTMENT',
          description: `${bookieName}: ${reason}`,
          referenceType: 'MANUAL_ADJUSTMENT',
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
      previousBalance: currentBalance,
      newBalance,
      adjustmentAmount,
    }
  })

// ============================================================================
// Per-Bookie Deposit Match Bonus Credit Functions
// ============================================================================

/**
 * Get default profile ID (creates one if needed)
 * Similar helper to ledgerDb.server.ts for consistency
 */
async function getDefaultProfileId(): Promise<string> {
  const prisma = await getPrisma()
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
 * Record a deposit match bonus credit to per-bookie income account
 *
 * Creates a journal entry:
 * - Debit BOOKIE_BONUS:{bookieName} (asset increases)
 * - Credit BONUS_DEPOSIT_MATCH_RACING_INCOME:{bookieName} (income earned)
 *
 * This differs from recordBonusCredit which uses the global BONUS_INCOME account.
 * Using per-bookie income accounts enables:
 * 1. Per-bookie P&L tracking (which bookies provide most bonus value)
 * 2. Integration with AccountBalanceView for net position
 *
 * @param input - Bonus credit details
 * @returns Created journal entry
 */
export const recordDepositMatchBonusCredit = createServerFn({ method: 'POST' })
  .inputValidator((input: RecordDepositMatchBonusCreditInput) => input)
  .handler(async ({ data }): Promise<RecordDepositMatchBonusCreditResult> => {
    const prisma = await getPrisma()
    let { profileId, bookieName, amount, notes, bonusCreditId, entryDate } = data

    // Resolve default profile if not provided
    if (!profileId) {
      profileId = await getDefaultProfileId()
    }

    // Validate amount
    if (amount <= 0) {
      throw new Error('Bonus amount must be positive')
    }

    // Check for idempotency if bonusCreditId provided
    if (bonusCreditId) {
      const existing = await prisma.journalEntry.findFirst({
        where: {
          profileId,
          referenceType: 'DEPOSIT_MATCH_BONUS',
          referenceId: bonusCreditId,
          isVoid: false,
        },
        include: { JournalLine: true },
      })

      if (existing) {
        return {
          journalEntry: mapToJournalEntryWithLines(existing),
          bookieName,
          amount,
          wasExisting: true,
        }
      }
    }

    // Find bookie by name
    const bookie = await prisma.bookie.findFirst({
      where: {
        OR: [
          { name: bookieName },
          { normalizedName: bookieName.toLowerCase().replace(/\s+/g, '_') },
        ],
      },
    })

    if (!bookie) {
      throw new Error(`Bookie "${bookieName}" not found`)
    }

    // Ensure bookie accounts exist (provisions all 5 accounts including bonus deposit match income)
    const bookieAccounts = await provisionBookieAccounts({
      data: { profileId, bookieId: bookie.id },
    })

    const effectiveDate = entryDate || new Date().toISOString().split('T')[0]
    const description = notes ? `${bookie.name}: ${notes}` : `${bookie.name}: Deposit match bonus`

    // Create journal entry in transaction
    const result = await prisma.$transaction(async (tx) => {
      const entryId = crypto.randomUUID()

      const entry = await tx.journalEntry.create({
        data: {
          id: entryId,
          profileId,
          entryDate: new Date(effectiveDate),
          entryType: 'BONUS_CREDITED',
          description,
          referenceType: 'DEPOSIT_MATCH_BONUS',
          referenceId: bonusCreditId || null,
        },
      })

      // Journal lines:
      // Debit BOOKIE_BONUS (asset increases)
      // Credit BONUS_DEPOSIT_MATCH_RACING_INCOME (income earned from this bookie)
      const lines = await Promise.all([
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: bookieAccounts.bonusAccount.id,
            debit: amount,
            credit: 0,
            memo: notes || 'Deposit match bonus',
          },
        }),
        tx.journalLine.create({
          data: {
            id: crypto.randomUUID(),
            journalEntryId: entry.id,
            accountId: bookieAccounts.bonusDepositMatchIncomeAccount.id,
            debit: 0,
            credit: amount,
            memo: notes || 'Deposit match bonus income',
          },
        }),
      ])

      return { ...entry, JournalLine: lines }
    })

    return {
      journalEntry: mapToJournalEntryWithLines(result),
      bookieName: bookie.name,
      amount,
      wasExisting: false,
    }
  })

/**
 * Void a bonus credit journal entry
 *
 * Marks the journal entry as void (doesn't delete for audit trail).
 * The voided entry is no longer included in balance calculations.
 *
 * @param input - Journal entry ID to void
 * @returns Voided journal entry
 */
export const voidBonusCredit = createServerFn({ method: 'POST' })
  .inputValidator((input: VoidBonusCreditInput) => input)
  .handler(async ({ data }): Promise<JournalEntryWithLines> => {
    const prisma = await getPrisma()
    const { journalEntryId, reason } = data

    // Get the entry
    const entry = await prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: { JournalLine: true },
    })

    if (!entry) {
      throw new Error(`Journal entry ${journalEntryId} not found`)
    }

    if (entry.isVoid) {
      throw new Error(`Journal entry ${journalEntryId} is already voided`)
    }

    // Void the entry
    const voidedEntry = await prisma.journalEntry.update({
      where: { id: journalEntryId },
      data: {
        isVoid: true,
        voidReason: reason || 'Bonus credit removed',
        voidedAt: new Date(),
      },
      include: { JournalLine: true },
    })

    return mapToJournalEntryWithLines(voidedEntry)
  })
