/**
 * Journal Service Tests
 *
 * Test cases for createJournalEntry server function.
 * Requires: vitest or jest setup with database test utilities
 *
 * @see src/modules/accounts/api/db/journalService.server.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createJournalEntry,
  validateJournalBalance,
  reverseJournalEntry,
  createAdjustment,
} from '../api/db/journalService.server'
import { JournalBalanceError } from '../types/journal'

// Test data - would need real profile/account IDs from test database
const testProfileId = 'test-profile-id'
const debitAccountId = 'test-debit-account-id'
const creditAccountId = 'test-credit-account-id'
const bookieCashAccountId = 'test-bookie-cash-account-id'
const adjustmentAccountId = 'test-adjustment-account-id'

describe('validateJournalBalance', () => {
  it('returns totals for balanced entries', () => {
    const lines = [
      { debit: 100, credit: 0 },
      { debit: 0, credit: 100 },
    ]
    const result = validateJournalBalance(lines)
    expect(result.totalDebits).toBe(100)
    expect(result.totalCredits).toBe(100)
  })

  it('throws JournalBalanceError for unbalanced entries', () => {
    const lines = [
      { debit: 100, credit: 0 },
      { debit: 0, credit: 50 },
    ]
    expect(() => validateJournalBalance(lines)).toThrow(JournalBalanceError)
  })

  it('handles floating point precision', () => {
    const lines = [
      { debit: 33.33, credit: 0 },
      { debit: 33.33, credit: 0 },
      { debit: 33.34, credit: 0 },
      { debit: 0, credit: 100 },
    ]
    const result = validateJournalBalance(lines)
    expect(result.totalDebits).toBeCloseTo(100, 2)
    expect(result.totalCredits).toBe(100)
  })
})

describe('createJournalEntry', () => {
  // Note: These tests require database setup
  // Run with: npx vitest --run src/modules/accounts/__tests__/journalService.test.ts

  it.skip('creates balanced journal entry with lines', async () => {
    const result = await createJournalEntry({
      data: {
        profileId: testProfileId,
        entryDate: '2025-01-01',
        entryType: 'ADJUSTMENT',
        description: 'Test entry',
        lines: [
          { accountId: debitAccountId, debit: 100, credit: 0 },
          { accountId: creditAccountId, debit: 0, credit: 100 },
        ],
      },
    })

    expect(result.lines).toHaveLength(2)
    expect(result.entryType).toBe('ADJUSTMENT')
    expect(result.isVoid).toBe(false)
  })

  it.skip('throws error for unbalanced entry', async () => {
    await expect(
      createJournalEntry({
        data: {
          profileId: testProfileId,
          entryDate: '2025-01-01',
          entryType: 'ADJUSTMENT',
          lines: [
            { accountId: debitAccountId, debit: 100, credit: 0 },
            { accountId: creditAccountId, debit: 0, credit: 50 }, // Unbalanced!
          ],
        },
      })
    ).rejects.toThrow('unbalanced')
  })

  it.skip('throws error for invalid account', async () => {
    await expect(
      createJournalEntry({
        data: {
          profileId: testProfileId,
          entryDate: '2025-01-01',
          entryType: 'ADJUSTMENT',
          lines: [
            { accountId: 'invalid-account-id', debit: 100, credit: 0 },
            { accountId: creditAccountId, debit: 0, credit: 100 },
          ],
        },
      })
    ).rejects.toThrow('not found')
  })

  it.skip('throws error for negative amounts', async () => {
    await expect(
      createJournalEntry({
        data: {
          profileId: testProfileId,
          entryDate: '2025-01-01',
          entryType: 'ADJUSTMENT',
          lines: [
            { accountId: debitAccountId, debit: -100, credit: 0 },
            { accountId: creditAccountId, debit: 0, credit: -100 },
          ],
        },
      })
    ).rejects.toThrow('negative')
  })

  it.skip('throws error for line with both debit and credit', async () => {
    await expect(
      createJournalEntry({
        data: {
          profileId: testProfileId,
          entryDate: '2025-01-01',
          entryType: 'ADJUSTMENT',
          lines: [
            { accountId: debitAccountId, debit: 100, credit: 100 }, // Both!
          ],
        },
      })
    ).rejects.toThrow('both debit and credit')
  })

  it.skip('rolls back on failure (atomicity)', async () => {
    // Create entry with valid first line but invalid second account
    // Should rollback the entire transaction, leaving no orphaned records
    const invalidAccountId = 'non-existent-account'

    await expect(
      createJournalEntry({
        data: {
          profileId: testProfileId,
          entryDate: '2025-01-01',
          entryType: 'ADJUSTMENT',
          lines: [
            { accountId: debitAccountId, debit: 100, credit: 0 },
            { accountId: invalidAccountId, debit: 0, credit: 100 },
          ],
        },
      })
    ).rejects.toThrow()

    // Verify no orphaned JournalEntry was created
    // (would need prisma client access to verify)
  })

  it.skip('creates entry with reference tracking', async () => {
    const result = await createJournalEntry({
      data: {
        profileId: testProfileId,
        entryDate: '2025-01-01',
        entryType: 'BET_SETTLED',
        description: 'Racing bet settlement',
        referenceType: 'RACING_TRACKER',
        referenceId: 'tracker-entry-123',
        betType: 'RACING',
        lines: [
          { accountId: debitAccountId, debit: 150, credit: 0, memo: 'Win payout' },
          { accountId: creditAccountId, debit: 0, credit: 150, memo: 'Bookie balance decrease' },
        ],
      },
    })

    expect(result.referenceType).toBe('RACING_TRACKER')
    expect(result.referenceId).toBe('tracker-entry-123')
    expect(result.betType).toBe('RACING')
    expect(result.lines[0].memo).toBe('Win payout')
  })
})

describe('reverseJournalEntry', () => {
  // Note: These tests require database setup with existing entries

  it.skip('creates reversal entry with swapped amounts', async () => {
    // Create original entry
    const original = await createJournalEntry({
      data: {
        profileId: testProfileId,
        entryDate: '2025-01-01',
        entryType: 'BET_SETTLED',
        lines: [
          { accountId: debitAccountId, debit: 100, credit: 0 },
          { accountId: creditAccountId, debit: 0, credit: 100 },
        ],
      },
    })

    // Reverse it
    const result = await reverseJournalEntry({
      data: { journalEntryId: original.id, reason: 'Incorrect entry' },
    })

    // Check original is voided
    expect(result.original.isVoid).toBe(true)

    // Check reversal has swapped amounts
    const debitLine = result.reversal.lines.find(
      (l) => l.accountId === debitAccountId
    )
    expect(debitLine?.credit).toBe(100) // Was debit, now credit
    expect(debitLine?.debit).toBe(0)
  })

  it.skip('throws error for already voided entry', async () => {
    const original = await createJournalEntry({
      data: {
        profileId: testProfileId,
        entryDate: '2025-01-01',
        entryType: 'ADJUSTMENT',
        lines: [
          { accountId: debitAccountId, debit: 100, credit: 0 },
          { accountId: creditAccountId, debit: 0, credit: 100 },
        ],
      },
    })

    // First reversal
    await reverseJournalEntry({ data: { journalEntryId: original.id } })

    // Try to reverse again - should fail
    await expect(
      reverseJournalEntry({ data: { journalEntryId: original.id } })
    ).rejects.toThrow('already voided')
  })

  it.skip('throws error for non-existent entry', async () => {
    await expect(
      reverseJournalEntry({ data: { journalEntryId: 'fake-id' } })
    ).rejects.toThrow('not found')
  })

  it.skip('links reversal to original via referenceId', async () => {
    const original = await createJournalEntry({
      data: {
        profileId: testProfileId,
        entryDate: '2025-01-01',
        entryType: 'ADJUSTMENT',
        lines: [
          { accountId: debitAccountId, debit: 100, credit: 0 },
          { accountId: creditAccountId, debit: 0, credit: 100 },
        ],
      },
    })

    const result = await reverseJournalEntry({
      data: { journalEntryId: original.id },
    })

    expect(result.reversal.referenceType).toBe('REVERSAL')
    expect(result.reversal.referenceId).toBe(original.id)
  })

  it.skip('net effect on accounts is zero after reversal', async () => {
    // Create and reverse an entry
    // The sum of all debits/credits for each account should be zero
    const original = await createJournalEntry({
      data: {
        profileId: testProfileId,
        entryDate: '2025-01-01',
        entryType: 'ADJUSTMENT',
        lines: [
          { accountId: debitAccountId, debit: 100, credit: 0 },
          { accountId: creditAccountId, debit: 0, credit: 100 },
        ],
      },
    })

    const result = await reverseJournalEntry({
      data: { journalEntryId: original.id },
    })

    // For each account, sum of (debit - credit) from both entries should be 0
    const originalDebitLine = result.original.lines.find(
      (l) => l.accountId === debitAccountId
    )
    const reversalDebitLine = result.reversal.lines.find(
      (l) => l.accountId === debitAccountId
    )

    const netDebit =
      (originalDebitLine!.debit - originalDebitLine!.credit) +
      (reversalDebitLine!.debit - reversalDebitLine!.credit)

    expect(netDebit).toBe(0)
  })
})

describe('createAdjustment', () => {
  // Note: These tests require database setup with system accounts seeded

  it.skip('creates positive adjustment entry (debit asset, credit equity)', async () => {
    const result = await createAdjustment({
      data: {
        profileId: testProfileId,
        accountId: bookieCashAccountId,
        amount: 50,
        reason: 'Opening balance',
      },
    })

    expect(result.entryType).toBe('ADJUSTMENT')
    expect(result.description).toBe('Opening balance')
    expect(result.referenceType).toBe('MANUAL_ADJUSTMENT')

    const targetLine = result.lines.find(
      (l) => l.accountId === bookieCashAccountId
    )
    expect(targetLine?.debit).toBe(50)
    expect(targetLine?.credit).toBe(0)

    const adjustmentLine = result.lines.find(
      (l) => l.accountId === adjustmentAccountId
    )
    expect(adjustmentLine?.debit).toBe(0)
    expect(adjustmentLine?.credit).toBe(50)
  })

  it.skip('creates negative adjustment entry (debit equity, credit asset)', async () => {
    const result = await createAdjustment({
      data: {
        profileId: testProfileId,
        accountId: bookieCashAccountId,
        amount: -25,
        reason: 'Remove duplicate',
      },
    })

    const targetLine = result.lines.find(
      (l) => l.accountId === bookieCashAccountId
    )
    expect(targetLine?.debit).toBe(0)
    expect(targetLine?.credit).toBe(25)

    const adjustmentLine = result.lines.find(
      (l) => l.accountId === adjustmentAccountId
    )
    expect(adjustmentLine?.debit).toBe(25)
    expect(adjustmentLine?.credit).toBe(0)
  })

  it.skip('throws error for zero amount', async () => {
    await expect(
      createAdjustment({
        data: {
          profileId: testProfileId,
          accountId: bookieCashAccountId,
          amount: 0,
          reason: 'Test',
        },
      })
    ).rejects.toThrow('cannot be zero')
  })

  it.skip('throws error for missing reason', async () => {
    await expect(
      createAdjustment({
        data: {
          profileId: testProfileId,
          accountId: bookieCashAccountId,
          amount: 50,
          reason: '',
        },
      })
    ).rejects.toThrow('reason is required')
  })

  it.skip('throws error for account not found', async () => {
    await expect(
      createAdjustment({
        data: {
          profileId: testProfileId,
          accountId: 'non-existent',
          amount: 50,
          reason: 'Test',
        },
      })
    ).rejects.toThrow('not found')
  })

  it.skip('throws error if system adjustment account not seeded', async () => {
    // Test with a profile that hasn't had system accounts seeded
    await expect(
      createAdjustment({
        data: {
          profileId: 'profile-without-system-accounts',
          accountId: bookieCashAccountId,
          amount: 50,
          reason: 'Test',
        },
      })
    ).rejects.toThrow('System account')
  })
})
