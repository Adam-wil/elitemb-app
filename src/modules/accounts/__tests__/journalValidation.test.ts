/**
 * Journal Validation Tests
 *
 * Test cases for journal entry validation functions.
 * Requires: vitest or jest setup with database test utilities
 *
 * @see src/modules/accounts/utils/journalValidation.ts
 */

import { describe, it, expect } from 'vitest'
import {
  validateJournalLines,
  validateBalance,
  validateEntryFields,
  validateJournalEntryComplete,
} from '../utils/journalValidation'
import type { JournalLineInput, CreateJournalEntryInput } from '../types/journal'

// Test data - would need real account IDs from test database
const validAccountId1 = 'test-account-1'
const validAccountId2 = 'test-account-2'
const testProfileId = 'test-profile-id'

describe('validateJournalLines', () => {
  it('returns empty array for valid lines', () => {
    const lines: JournalLineInput[] = [
      { accountId: validAccountId1, debit: 100, credit: 0 },
      { accountId: validAccountId2, debit: 0, credit: 100 },
    ]
    const errors = validateJournalLines(lines)
    expect(errors).toHaveLength(0)
  })

  it('returns NEGATIVE_AMOUNT for negative debit', () => {
    const lines: JournalLineInput[] = [
      { accountId: validAccountId1, debit: -100, credit: 0 },
      { accountId: validAccountId2, debit: 0, credit: 100 },
    ]
    const errors = validateJournalLines(lines)
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: 'NEGATIVE_AMOUNT',
        lineIndex: 0,
      })
    )
  })

  it('returns NEGATIVE_AMOUNT for negative credit', () => {
    const lines: JournalLineInput[] = [
      { accountId: validAccountId1, debit: 100, credit: 0 },
      { accountId: validAccountId2, debit: 0, credit: -100 },
    ]
    const errors = validateJournalLines(lines)
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: 'NEGATIVE_AMOUNT',
        lineIndex: 1,
      })
    )
  })

  it('returns BOTH_DEBIT_AND_CREDIT when line has both', () => {
    const lines: JournalLineInput[] = [
      { accountId: validAccountId1, debit: 50, credit: 50 },
    ]
    const errors = validateJournalLines(lines)
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: 'BOTH_DEBIT_AND_CREDIT',
        lineIndex: 0,
      })
    )
  })

  it('returns NEITHER_DEBIT_NOR_CREDIT when line has neither', () => {
    const lines: JournalLineInput[] = [
      { accountId: validAccountId1, debit: 0, credit: 0 },
    ]
    const errors = validateJournalLines(lines)
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: 'NEITHER_DEBIT_NOR_CREDIT',
        lineIndex: 0,
      })
    )
  })

  it('returns multiple errors for multiple invalid lines', () => {
    const lines: JournalLineInput[] = [
      { accountId: validAccountId1, debit: -100, credit: 0 },
      { accountId: validAccountId2, debit: 0, credit: -100 },
    ]
    const errors = validateJournalLines(lines)
    expect(errors.filter((e) => e.code === 'NEGATIVE_AMOUNT')).toHaveLength(2)
  })
})

describe('validateBalance', () => {
  it('returns empty array for balanced entry', () => {
    const lines: JournalLineInput[] = [
      { accountId: validAccountId1, debit: 100, credit: 0 },
      { accountId: validAccountId2, debit: 0, credit: 100 },
    ]
    const errors = validateBalance(lines)
    expect(errors).toHaveLength(0)
  })

  it('returns UNBALANCED_ENTRY for unbalanced entry', () => {
    const lines: JournalLineInput[] = [
      { accountId: validAccountId1, debit: 100, credit: 0 },
      { accountId: validAccountId2, debit: 0, credit: 50 },
    ]
    const errors = validateBalance(lines)
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: 'UNBALANCED_ENTRY',
      })
    )
  })

  it('includes totals in error details', () => {
    const lines: JournalLineInput[] = [
      { accountId: validAccountId1, debit: 100, credit: 0 },
      { accountId: validAccountId2, debit: 0, credit: 50 },
    ]
    const errors = validateBalance(lines)
    expect(errors[0].details).toMatchObject({
      totalDebits: 100,
      totalCredits: 50,
      difference: 50,
    })
  })

  it('handles floating point precision', () => {
    const lines: JournalLineInput[] = [
      { accountId: validAccountId1, debit: 33.33, credit: 0 },
      { accountId: validAccountId1, debit: 33.33, credit: 0 },
      { accountId: validAccountId1, debit: 33.34, credit: 0 },
      { accountId: validAccountId2, debit: 0, credit: 100 },
    ]
    const errors = validateBalance(lines)
    expect(errors).toHaveLength(0)
  })
})

describe('validateEntryFields', () => {
  it('returns empty array for valid entry', () => {
    const input: CreateJournalEntryInput = {
      profileId: testProfileId,
      entryDate: '2025-01-01',
      entryType: 'ADJUSTMENT',
      lines: [
        { accountId: validAccountId1, debit: 100, credit: 0 },
        { accountId: validAccountId2, debit: 0, credit: 100 },
      ],
    }
    const errors = validateEntryFields(input)
    expect(errors).toHaveLength(0)
  })

  it('returns MISSING_ENTRY_DATE for empty date', () => {
    const input: CreateJournalEntryInput = {
      profileId: testProfileId,
      entryDate: '',
      entryType: 'ADJUSTMENT',
      lines: [
        { accountId: validAccountId1, debit: 100, credit: 0 },
        { accountId: validAccountId2, debit: 0, credit: 100 },
      ],
    }
    const errors = validateEntryFields(input)
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: 'MISSING_ENTRY_DATE',
        field: 'entryDate',
      })
    )
  })

  it('returns INVALID_ENTRY_DATE for invalid date', () => {
    const input: CreateJournalEntryInput = {
      profileId: testProfileId,
      entryDate: 'not-a-date',
      entryType: 'ADJUSTMENT',
      lines: [
        { accountId: validAccountId1, debit: 100, credit: 0 },
        { accountId: validAccountId2, debit: 0, credit: 100 },
      ],
    }
    const errors = validateEntryFields(input)
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_ENTRY_DATE',
        field: 'entryDate',
      })
    )
  })

  it('returns INSUFFICIENT_LINES for single line', () => {
    const input: CreateJournalEntryInput = {
      profileId: testProfileId,
      entryDate: '2025-01-01',
      entryType: 'ADJUSTMENT',
      lines: [{ accountId: validAccountId1, debit: 100, credit: 0 }],
    }
    const errors = validateEntryFields(input)
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: 'INSUFFICIENT_LINES',
        field: 'lines',
      })
    )
  })

  it('returns INSUFFICIENT_LINES for empty lines', () => {
    const input: CreateJournalEntryInput = {
      profileId: testProfileId,
      entryDate: '2025-01-01',
      entryType: 'ADJUSTMENT',
      lines: [],
    }
    const errors = validateEntryFields(input)
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: 'INSUFFICIENT_LINES',
      })
    )
  })
})

describe('validateJournalEntryComplete', () => {
  // These tests require database access for account validation
  it.skip('returns valid for balanced entry with existing accounts', async () => {
    const result = await validateJournalEntryComplete({
      profileId: testProfileId,
      entryDate: '2025-01-01',
      entryType: 'ADJUSTMENT',
      lines: [
        { accountId: validAccountId1, debit: 100, credit: 0 },
        { accountId: validAccountId2, debit: 0, credit: 100 },
      ],
    })
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it.skip('returns ACCOUNT_NOT_FOUND for invalid accountId', async () => {
    const result = await validateJournalEntryComplete({
      profileId: testProfileId,
      entryDate: '2025-01-01',
      entryType: 'ADJUSTMENT',
      lines: [
        { accountId: 'non-existent-id', debit: 100, credit: 0 },
        { accountId: validAccountId2, debit: 0, credit: 100 },
      ],
    })
    expect(result.isValid).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'ACCOUNT_NOT_FOUND' })
    )
  })

  it.skip('collects all errors before returning', async () => {
    const result = await validateJournalEntryComplete({
      profileId: testProfileId,
      entryDate: '',
      entryType: 'ADJUSTMENT',
      lines: [
        { accountId: 'invalid-1', debit: -100, credit: 0 },
        { accountId: 'invalid-2', debit: 0, credit: 50 },
      ],
    })
    expect(result.isValid).toBe(false)
    // Should have: MISSING_ENTRY_DATE, NEGATIVE_AMOUNT, UNBALANCED_ENTRY, 2x ACCOUNT_NOT_FOUND
    expect(result.errors.length).toBeGreaterThanOrEqual(4)
  })
})
