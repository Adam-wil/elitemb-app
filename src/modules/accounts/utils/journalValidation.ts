/**
 * Journal Entry Validation
 *
 * Validation functions for double-entry accounting journal entries.
 * Returns structured validation results instead of throwing errors.
 */

import prisma from '@/lib/prisma'
import type {
  JournalLineInput,
  CreateJournalEntryInput,
  JournalValidationResult,
  JournalValidationError,
} from '../types/journal'

// ============================================================================
// Account Validation (Task 2)
// ============================================================================

/**
 * Validate that all accounts exist and belong to the profile
 */
export async function validateAccountsExist(
  profileId: string,
  accountIds: string[]
): Promise<JournalValidationError[]> {
  const errors: JournalValidationError[] = []
  const uniqueIds = [...new Set(accountIds)]

  const accounts = await prisma.account.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, profileId: true },
  })

  const foundIds = new Set(accounts.map((a) => a.id))

  // Check for missing accounts
  for (const id of uniqueIds) {
    if (!foundIds.has(id)) {
      errors.push({
        code: 'ACCOUNT_NOT_FOUND',
        message: `Account ${id} not found`,
        field: 'accountId',
        details: { accountId: id },
      })
    }
  }

  // Check for profile mismatch
  for (const account of accounts) {
    if (account.profileId !== profileId) {
      errors.push({
        code: 'ACCOUNT_PROFILE_MISMATCH',
        message: `Account ${account.id} belongs to different profile`,
        field: 'accountId',
        details: { accountId: account.id },
      })
    }
  }

  return errors
}

// ============================================================================
// Line Item Validation (Task 3)
// ============================================================================

/**
 * Validate individual journal lines
 * Checks for non-negative amounts and exactly one of debit or credit
 */
export function validateJournalLines(
  lines: JournalLineInput[]
): JournalValidationError[] {
  const errors: JournalValidationError[] = []

  lines.forEach((line, index) => {
    // Check non-negative amounts
    if (line.debit < 0) {
      errors.push({
        code: 'NEGATIVE_AMOUNT',
        message: `Line ${index + 1}: debit cannot be negative`,
        field: 'debit',
        lineIndex: index,
      })
    }
    if (line.credit < 0) {
      errors.push({
        code: 'NEGATIVE_AMOUNT',
        message: `Line ${index + 1}: credit cannot be negative`,
        field: 'credit',
        lineIndex: index,
      })
    }

    // Check exactly one of debit or credit (XOR)
    const hasDebit = line.debit > 0
    const hasCredit = line.credit > 0

    if (hasDebit && hasCredit) {
      errors.push({
        code: 'BOTH_DEBIT_AND_CREDIT',
        message: `Line ${index + 1}: cannot have both debit and credit`,
        lineIndex: index,
      })
    }
    if (!hasDebit && !hasCredit) {
      errors.push({
        code: 'NEITHER_DEBIT_NOR_CREDIT',
        message: `Line ${index + 1}: must have either debit or credit`,
        lineIndex: index,
      })
    }
  })

  return errors
}

// ============================================================================
// Balance Validation (Task 4)
// ============================================================================

/**
 * Validate that debits equal credits
 * Uses tolerance for floating point comparison (0.001)
 */
export function validateBalance(
  lines: JournalLineInput[]
): JournalValidationError[] {
  const totalDebits = lines.reduce((sum, line) => sum + line.debit, 0)
  const totalCredits = lines.reduce((sum, line) => sum + line.credit, 0)

  if (Math.abs(totalDebits - totalCredits) > 0.001) {
    return [
      {
        code: 'UNBALANCED_ENTRY',
        message: `Entry is unbalanced: debits=${totalDebits.toFixed(2)}, credits=${totalCredits.toFixed(2)}`,
        details: {
          totalDebits,
          totalCredits,
          difference: totalDebits - totalCredits,
        },
      },
    ]
  }

  return []
}

// ============================================================================
// Entry-Level Validation (Task 5)
// ============================================================================

/**
 * Validate entry-level fields (entryDate, minimum lines)
 */
export function validateEntryFields(
  input: CreateJournalEntryInput
): JournalValidationError[] {
  const errors: JournalValidationError[] = []

  // Check entryDate
  if (!input.entryDate) {
    errors.push({
      code: 'MISSING_ENTRY_DATE',
      message: 'Entry date is required',
      field: 'entryDate',
    })
  } else {
    const date = new Date(input.entryDate)
    if (isNaN(date.getTime())) {
      errors.push({
        code: 'INVALID_ENTRY_DATE',
        message: 'Entry date is invalid',
        field: 'entryDate',
      })
    }
  }

  // Check minimum lines (double-entry requires at least 2)
  if (!input.lines || input.lines.length < 2) {
    errors.push({
      code: 'INSUFFICIENT_LINES',
      message: 'Journal entry must have at least 2 lines',
      field: 'lines',
    })
  }

  return errors
}

// ============================================================================
// Composite Validation (Task 6)
// ============================================================================

/**
 * Complete validation of journal entry
 * Runs all validators and collects all errors before returning
 */
export async function validateJournalEntryComplete(
  input: CreateJournalEntryInput
): Promise<JournalValidationResult> {
  const errors: JournalValidationError[] = []

  // Entry-level validation
  errors.push(...validateEntryFields(input))

  // Only continue if we have lines
  if (input.lines && input.lines.length > 0) {
    // Line validation
    errors.push(...validateJournalLines(input.lines))

    // Balance validation
    errors.push(...validateBalance(input.lines))

    // Account existence (async)
    const accountIds = input.lines.map((l) => l.accountId)
    const accountErrors = await validateAccountsExist(
      input.profileId,
      accountIds
    )
    errors.push(...accountErrors)
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
