/**
 * Racing Journal Hooks Tests
 *
 * Test cases for recordRacingBetPlaced and recordRacingWin server functions.
 * Requires: vitest setup with database test utilities
 *
 * @see src/modules/the-furlong/api/db/racingJournalHooks.server.ts
 */

import { describe, it, expect } from 'vitest'
import { recordRacingBetPlaced, recordRacingWin, recordRacingLoss, recordRacingVoid, recordRacingDeadHeat } from '../racingJournalHooks.server'

// Test data - would need real profile/account IDs from test database
const testProfileId = 'test-profile-id'
const testBookieId = 1
const testTrackerEntryId = 'test-tracker-entry-id'

describe('recordRacingBetPlaced', () => {
  // Note: These tests require database setup with:
  // - System accounts seeded (PENDING_BACK)
  // - Bookie provisioner available
  // Run with: npx vitest --run src/modules/the-furlong/api/db/__tests__/racingJournalHooks.test.ts

  it.skip('creates journal entry for cash bet placement', async () => {
    const result = await recordRacingBetPlaced({
      data: {
        profileId: testProfileId,
        trackerEntryId: testTrackerEntryId,
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        horseName: 'Test Horse',
        track: 'Randwick',
        raceNumber: 5,
      },
    })

    expect(result.journalEntry.entryType).toBe('BET_PLACED')
    expect(result.journalEntry.referenceType).toBe('RACING_TRACKER')
    expect(result.journalEntry.referenceId).toBe(testTrackerEntryId)
    expect(result.journalEntry.betType).toBe('RACING')
    expect(result.journalEntry.lines).toHaveLength(2)
    expect(result.wasExisting).toBe(false)
  })

  it.skip('creates correct journal lines for cash bet', async () => {
    const result = await recordRacingBetPlaced({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-entry-cash',
        bookieId: testBookieId,
        stake: 25,
        isBonusBet: false,
        horseName: 'Cash Horse',
        track: 'Flemington',
        raceNumber: 3,
      },
    })

    // Should have two lines: Debit Pending Back, Credit Bookie Cash
    const debitLine = result.journalEntry.lines.find((l) => l.debit > 0)
    const creditLine = result.journalEntry.lines.find((l) => l.credit > 0)

    expect(debitLine?.debit).toBe(25)
    expect(debitLine?.memo).toContain('Pending')
    expect(creditLine?.credit).toBe(25)
    expect(creditLine?.memo).toContain('Bet placed')
  })

  it.skip('uses bonus account for bonus bet placement', async () => {
    const result = await recordRacingBetPlaced({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-entry-bonus',
        bookieId: testBookieId,
        stake: 25,
        isBonusBet: true, // Bonus bet
        horseName: 'Bonus Horse',
        track: 'Flemington',
        raceNumber: 3,
      },
    })

    // Verify journal entry created
    expect(result.journalEntry.entryType).toBe('BET_PLACED')
    expect(result.journalEntry.lines).toHaveLength(2)

    // Credit line should be from bonus account, not cash account
    // (Would need to verify accountId matches bonus account)
    const creditLine = result.journalEntry.lines.find((l) => l.credit > 0)
    expect(creditLine?.memo).toContain('Bet placed')
  })

  it.skip('returns existing entry for duplicate request (idempotency)', async () => {
    const testInput = {
      profileId: testProfileId,
      trackerEntryId: 'test-entry-idempotent',
      bookieId: testBookieId,
      stake: 10,
      isBonusBet: false,
      horseName: 'Idempotent Horse',
      track: 'Randwick',
      raceNumber: 1,
    }

    // First call
    const first = await recordRacingBetPlaced({ data: testInput })
    expect(first.wasExisting).toBe(false)

    // Second call with same trackerEntryId
    const second = await recordRacingBetPlaced({ data: testInput })
    expect(second.wasExisting).toBe(true)
    expect(second.journalEntry.id).toBe(first.journalEntry.id)
  })

  it.skip('provisions bookie accounts if not exists', async () => {
    // Use a bookie that has never been used before
    const newBookieId = 999

    const result = await recordRacingBetPlaced({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-entry-new-bookie',
        bookieId: newBookieId,
        stake: 10,
        isBonusBet: false,
        horseName: 'New Bookie Horse',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    // If it didn't throw, bookie accounts were provisioned
    expect(result.journalEntry).toBeDefined()
  })

  it.skip('throws error if system accounts not seeded', async () => {
    // Test with a profile that hasn't had system accounts seeded
    await expect(
      recordRacingBetPlaced({
        data: {
          profileId: 'profile-without-system-accounts',
          trackerEntryId: 'test-entry',
          bookieId: testBookieId,
          stake: 10,
          isBonusBet: false,
          horseName: 'Test Horse',
          track: 'Test Track',
          raceNumber: 1,
        },
      })
    ).rejects.toThrow('system account not found')
  })

  it.skip('throws error for non-positive stake', async () => {
    await expect(
      recordRacingBetPlaced({
        data: {
          profileId: testProfileId,
          trackerEntryId: 'test-entry-zero',
          bookieId: testBookieId,
          stake: 0,
          isBonusBet: false,
          horseName: 'Test Horse',
          track: 'Test Track',
          raceNumber: 1,
        },
      })
    ).rejects.toThrow('Stake must be positive')

    await expect(
      recordRacingBetPlaced({
        data: {
          profileId: testProfileId,
          trackerEntryId: 'test-entry-negative',
          bookieId: testBookieId,
          stake: -10,
          isBonusBet: false,
          horseName: 'Test Horse',
          track: 'Test Track',
          raceNumber: 1,
        },
      })
    ).rejects.toThrow('Stake must be positive')
  })

  it.skip('formats description correctly', async () => {
    const result = await recordRacingBetPlaced({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-entry-desc',
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        horseName: 'Thunder Bolt',
        track: 'Randwick',
        raceNumber: 7,
      },
    })

    expect(result.journalEntry.description).toBe(
      'Bet placed: Thunder Bolt R7 @ Randwick'
    )
  })

  it.skip('uses provided entryDate', async () => {
    const customDate = '2025-06-15'

    const result = await recordRacingBetPlaced({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-entry-date',
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        horseName: 'Test Horse',
        track: 'Test Track',
        raceNumber: 1,
        entryDate: customDate,
      },
    })

    expect(result.journalEntry.entryDate.toISOString().split('T')[0]).toBe(
      customDate
    )
  })

  it.skip('defaults entryDate to today if not provided', async () => {
    const today = new Date().toISOString().split('T')[0]

    const result = await recordRacingBetPlaced({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-entry-default-date',
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        horseName: 'Test Horse',
        track: 'Test Track',
        raceNumber: 1,
        // No entryDate provided
      },
    })

    expect(result.journalEntry.entryDate.toISOString().split('T')[0]).toBe(today)
  })
})

describe('recordRacingWin', () => {
  // Note: These tests require database setup with:
  // - System accounts seeded (PENDING_BACK, BACK_BET_WINS, QUALIFYING_LOSS)
  // - Bookie provisioner available
  // Run with: npx vitest --run src/modules/the-furlong/api/db/__tests__/racingJournalHooks.test.ts

  it.skip('creates correct journal for cash bet win', async () => {
    const result = await recordRacingWin({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-win-cash',
        bookieId: testBookieId,
        stake: 10,
        odds: 3.5,
        isBonusBet: false,
        horseName: 'Winner Horse',
        track: 'Randwick',
        raceNumber: 5,
      },
    })

    expect(result.returns).toBe(35) // 10 * 3.5
    expect(result.profit).toBe(25) // 35 - 10
    expect(result.settlementEntry.entryType).toBe('BET_SETTLED')
    expect(result.settlementEntry.referenceType).toBe('RACING_TRACKER')
    expect(result.settlementEntry.lines).toHaveLength(3)
    expect(result.wasExisting).toBe(false)
  })

  it.skip('creates 3-line entry for cash bet with correct amounts', async () => {
    const result = await recordRacingWin({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-win-amounts',
        bookieId: testBookieId,
        stake: 20,
        odds: 2.5,
        isBonusBet: false,
        horseName: 'Amount Horse',
        track: 'Flemington',
        raceNumber: 3,
      },
    })

    // Returns = 20 * 2.5 = 50, Profit = 50 - 20 = 30
    expect(result.returns).toBe(50)
    expect(result.profit).toBe(30)

    // Verify debit = full returns
    const debitLine = result.settlementEntry.lines.find((l) => l.debit > 0)
    expect(debitLine?.debit).toBe(50) // Full returns
    expect(debitLine?.memo).toContain('Returns')

    // Verify credits sum = returns (stake + profit)
    const credits = result.settlementEntry.lines.filter((l) => l.credit > 0)
    const totalCredits = credits.reduce((sum, l) => sum + l.credit, 0)
    expect(totalCredits).toBe(50)
  })

  it.skip('handles bonus bet win (profit only to cash)', async () => {
    const result = await recordRacingWin({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-win-bonus',
        bookieId: testBookieId,
        stake: 25,
        odds: 2.0,
        isBonusBet: true,
        horseName: 'Bonus Winner',
        track: 'Flemington',
        raceNumber: 3,
      },
    })

    expect(result.returns).toBe(50) // 25 * 2.0
    expect(result.profit).toBe(25) // 50 - 25
    expect(result.settlementEntry.lines).toHaveLength(4) // 4 lines for bonus bet

    // Cash debit should be profit only, not full returns
    const cashDebit = result.settlementEntry.lines.find(
      (l) => l.debit > 0 && l.memo?.includes('profit')
    )
    expect(cashDebit?.debit).toBe(25) // Profit only
  })

  it.skip('returns existing settlement for duplicate request (idempotency)', async () => {
    const testInput = {
      profileId: testProfileId,
      trackerEntryId: 'test-win-idempotent',
      bookieId: testBookieId,
      stake: 10,
      odds: 2.0,
      isBonusBet: false,
      horseName: 'Idempotent Winner',
      track: 'Randwick',
      raceNumber: 1,
    }

    // First call
    const first = await recordRacingWin({ data: testInput })
    expect(first.wasExisting).toBe(false)

    // Second call with same trackerEntryId
    const second = await recordRacingWin({ data: testInput })
    expect(second.wasExisting).toBe(true)
    expect(second.settlementEntry.id).toBe(first.settlementEntry.id)
  })

  it.skip('reverses pending BET_PLACED entry when settling', async () => {
    const trackerEntryId = 'test-win-reversal'

    // First create a pending bet
    await recordRacingBetPlaced({
      data: {
        profileId: testProfileId,
        trackerEntryId,
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        horseName: 'Reversal Horse',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    // Then settle as win
    const result = await recordRacingWin({
      data: {
        profileId: testProfileId,
        trackerEntryId,
        bookieId: testBookieId,
        stake: 10,
        odds: 2.0,
        isBonusBet: false,
        horseName: 'Reversal Horse',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    expect(result.reversedPendingEntry).not.toBeNull()
    expect(result.reversedPendingEntry?.isVoid).toBe(true)
  })

  it.skip('handles win without prior pending entry', async () => {
    // Settle without creating pending first (manual entry scenario)
    const result = await recordRacingWin({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-win-no-pending',
        bookieId: testBookieId,
        stake: 10,
        odds: 2.0,
        isBonusBet: false,
        horseName: 'No Pending Horse',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    expect(result.settlementEntry).toBeDefined()
    expect(result.reversedPendingEntry).toBeNull()
  })

  it.skip('throws error for non-positive stake', async () => {
    await expect(
      recordRacingWin({
        data: {
          profileId: testProfileId,
          trackerEntryId: 'test-win-zero-stake',
          bookieId: testBookieId,
          stake: 0,
          odds: 2.0,
          isBonusBet: false,
          horseName: 'Test Horse',
          track: 'Test Track',
          raceNumber: 1,
        },
      })
    ).rejects.toThrow('Stake must be positive')
  })

  it.skip('throws error for odds <= 1', async () => {
    await expect(
      recordRacingWin({
        data: {
          profileId: testProfileId,
          trackerEntryId: 'test-win-bad-odds',
          bookieId: testBookieId,
          stake: 10,
          odds: 1.0, // Invalid odds
          isBonusBet: false,
          horseName: 'Test Horse',
          track: 'Test Track',
          raceNumber: 1,
        },
      })
    ).rejects.toThrow('Odds must be greater than 1')
  })

  it.skip('formats description correctly with odds', async () => {
    const result = await recordRacingWin({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-win-desc',
        bookieId: testBookieId,
        stake: 10,
        odds: 3.5,
        isBonusBet: false,
        horseName: 'Thunder Bolt',
        track: 'Randwick',
        raceNumber: 7,
      },
    })

    expect(result.settlementEntry.description).toBe(
      'WIN: Thunder Bolt R7 @ Randwick (3.50)'
    )
  })
})

describe('recordRacingLoss', () => {
  // Note: These tests require database setup with:
  // - System accounts seeded (PENDING_BACK, BACK_BET_LOSSES, QUALIFYING_LOSS)
  // Run with: npx vitest --run src/modules/the-furlong/api/db/__tests__/racingJournalHooks.test.ts

  it.skip('creates correct journal for cash bet loss', async () => {
    const result = await recordRacingLoss({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-loss-cash',
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        horseName: 'Loser Horse',
        track: 'Randwick',
        raceNumber: 5,
      },
    })

    expect(result.lossAmount).toBe(10)
    expect(result.expenseType).toBe('BACK_BET_LOSSES')
    expect(result.settlementEntry.entryType).toBe('BET_SETTLED')
    expect(result.settlementEntry.referenceType).toBe('RACING_TRACKER')
    expect(result.settlementEntry.lines).toHaveLength(2)
    expect(result.wasExisting).toBe(false)
  })

  it.skip('creates 2-line entry with correct amounts', async () => {
    const result = await recordRacingLoss({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-loss-amounts',
        bookieId: testBookieId,
        stake: 15,
        isBonusBet: false,
        horseName: 'Amount Horse',
        track: 'Flemington',
        raceNumber: 3,
      },
    })

    // Verify debit = stake (expense)
    const debitLine = result.settlementEntry.lines.find((l) => l.debit > 0)
    expect(debitLine?.debit).toBe(15)
    expect(debitLine?.memo).toContain('Loss')

    // Verify credit = stake (pending cleared)
    const creditLine = result.settlementEntry.lines.find((l) => l.credit > 0)
    expect(creditLine?.credit).toBe(15)
    expect(creditLine?.memo).toContain('lost')
  })

  it.skip('uses Qualifying Loss account for bonus bet loss', async () => {
    const result = await recordRacingLoss({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-loss-bonus',
        bookieId: testBookieId,
        stake: 25,
        isBonusBet: true,
        horseName: 'Bonus Loser',
        track: 'Flemington',
        raceNumber: 3,
      },
    })

    expect(result.expenseType).toBe('QUALIFYING_LOSS')
    expect(result.settlementEntry.description).toContain('Qualifying loss')
    expect(result.settlementEntry.lines).toHaveLength(2)

    // Verify debit memo indicates qualifying loss
    const debitLine = result.settlementEntry.lines.find((l) => l.debit > 0)
    expect(debitLine?.memo).toContain('Qualifying loss')
  })

  it.skip('returns existing settlement for duplicate request (idempotency)', async () => {
    const testInput = {
      profileId: testProfileId,
      trackerEntryId: 'test-loss-idempotent',
      bookieId: testBookieId,
      stake: 10,
      isBonusBet: false,
      horseName: 'Idempotent Loser',
      track: 'Randwick',
      raceNumber: 1,
    }

    // First call
    const first = await recordRacingLoss({ data: testInput })
    expect(first.wasExisting).toBe(false)

    // Second call with same trackerEntryId
    const second = await recordRacingLoss({ data: testInput })
    expect(second.wasExisting).toBe(true)
    expect(second.settlementEntry.id).toBe(first.settlementEntry.id)
  })

  it.skip('reverses pending BET_PLACED entry when settling', async () => {
    const trackerEntryId = 'test-loss-reversal'

    // First create a pending bet
    await recordRacingBetPlaced({
      data: {
        profileId: testProfileId,
        trackerEntryId,
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        horseName: 'Reversal Horse',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    // Then settle as loss
    const result = await recordRacingLoss({
      data: {
        profileId: testProfileId,
        trackerEntryId,
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        horseName: 'Reversal Horse',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    expect(result.reversedPendingEntry).not.toBeNull()
    expect(result.reversedPendingEntry?.isVoid).toBe(true)
  })

  it.skip('handles loss without prior pending entry', async () => {
    // Settle without creating pending first (manual entry scenario)
    const result = await recordRacingLoss({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-loss-no-pending',
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        horseName: 'No Pending Horse',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    expect(result.settlementEntry).toBeDefined()
    expect(result.reversedPendingEntry).toBeNull()
  })

  it.skip('throws error for non-positive stake', async () => {
    await expect(
      recordRacingLoss({
        data: {
          profileId: testProfileId,
          trackerEntryId: 'test-loss-zero-stake',
          bookieId: testBookieId,
          stake: 0,
          isBonusBet: false,
          horseName: 'Test Horse',
          track: 'Test Track',
          raceNumber: 1,
        },
      })
    ).rejects.toThrow('Stake must be positive')
  })

  it.skip('formats description correctly for cash loss', async () => {
    const result = await recordRacingLoss({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-loss-desc',
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        horseName: 'Thunder Bolt',
        track: 'Randwick',
        raceNumber: 7,
      },
    })

    expect(result.settlementEntry.description).toBe(
      'Loss: Thunder Bolt R7 @ Randwick'
    )
  })

  it.skip('formats description correctly for bonus loss', async () => {
    const result = await recordRacingLoss({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-loss-desc-bonus',
        bookieId: testBookieId,
        stake: 25,
        isBonusBet: true,
        horseName: 'Bonus Runner',
        track: 'Flemington',
        raceNumber: 3,
      },
    })

    expect(result.settlementEntry.description).toBe(
      'Qualifying loss: Bonus Runner R3 @ Flemington'
    )
  })
})

describe('recordRacingVoid', () => {
  // Note: These tests require database setup with:
  // - System accounts seeded (PENDING_BACK)
  // - Bookie provisioner available
  // Run with: npx vitest --run src/modules/the-furlong/api/db/__tests__/racingJournalHooks.test.ts

  it.skip('refunds cash bet to Bookie Cash on scratch', async () => {
    const result = await recordRacingVoid({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-scratch-cash',
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        voidType: 'SCRATCHED',
        horseName: 'Scratched Horse',
        track: 'Randwick',
        raceNumber: 5,
      },
    })

    expect(result.refundAmount).toBe(10)
    expect(result.refundAccount).toBe('BOOKIE_CASH')
    expect(result.refundEntry.entryType).toBe('BET_SETTLED')
    expect(result.refundEntry.description).toContain('SCRATCHED')
    expect(result.refundEntry.lines).toHaveLength(2)
    expect(result.wasExisting).toBe(false)

    // Verify debit goes to Bookie Cash
    const debitLine = result.refundEntry.lines.find((l) => l.debit > 0)
    expect(debitLine?.debit).toBe(10)
  })

  it.skip('refunds bonus bet to Bookie Bonus on scratch', async () => {
    const result = await recordRacingVoid({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-scratch-bonus',
        bookieId: testBookieId,
        stake: 25,
        isBonusBet: true,
        voidType: 'SCRATCHED',
        horseName: 'Bonus Scratched',
        track: 'Flemington',
        raceNumber: 3,
      },
    })

    expect(result.refundAmount).toBe(25)
    expect(result.refundAccount).toBe('BOOKIE_BONUS')
    expect(result.refundEntry.lines).toHaveLength(2)
    // Bonus should be available to use again
  })

  it.skip('includes custom reason in description', async () => {
    const result = await recordRacingVoid({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-void-custom-reason',
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        voidType: 'REFUND',
        reason: 'Thankyou Neds promotion',
        horseName: 'Promo Horse',
        track: 'Caulfield',
        raceNumber: 7,
      },
    })

    expect(result.refundEntry.description).toContain('Thankyou Neds promotion')
  })

  it.skip('uses default reason when none provided', async () => {
    const result = await recordRacingVoid({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-void-default-reason',
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        voidType: 'SCRATCHED',
        // No reason provided
        horseName: 'No Reason Horse',
        track: 'Moonee Valley',
        raceNumber: 1,
      },
    })

    expect(result.refundEntry.description).toContain('Horse scratched')
  })

  it.skip('uses VOID default reason', async () => {
    const result = await recordRacingVoid({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-void-type',
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        voidType: 'VOID',
        horseName: 'Void Horse',
        track: 'Eagle Farm',
        raceNumber: 2,
      },
    })

    expect(result.refundEntry.description).toContain('Bet voided')
  })

  it.skip('uses REFUND default reason', async () => {
    const result = await recordRacingVoid({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-refund-type',
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        voidType: 'REFUND',
        horseName: 'Refund Horse',
        track: 'Rosehill',
        raceNumber: 4,
      },
    })

    expect(result.refundEntry.description).toContain('Bet refunded')
  })

  it.skip('returns existing settlement for duplicate request (idempotency)', async () => {
    const testInput = {
      profileId: testProfileId,
      trackerEntryId: 'test-void-idempotent',
      bookieId: testBookieId,
      stake: 10,
      isBonusBet: false,
      voidType: 'SCRATCHED' as const,
      horseName: 'Idempotent Scratch',
      track: 'Randwick',
      raceNumber: 1,
    }

    // First call
    const first = await recordRacingVoid({ data: testInput })
    expect(first.wasExisting).toBe(false)

    // Second call with same trackerEntryId
    const second = await recordRacingVoid({ data: testInput })
    expect(second.wasExisting).toBe(true)
    expect(second.refundEntry.id).toBe(first.refundEntry.id)
  })

  it.skip('reverses pending BET_PLACED entry when voiding', async () => {
    const trackerEntryId = 'test-void-reversal'

    // First create a pending bet
    await recordRacingBetPlaced({
      data: {
        profileId: testProfileId,
        trackerEntryId,
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        horseName: 'Reversal Horse',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    // Then void it
    const result = await recordRacingVoid({
      data: {
        profileId: testProfileId,
        trackerEntryId,
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        voidType: 'SCRATCHED',
        horseName: 'Reversal Horse',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    expect(result.reversedPendingEntry).not.toBeNull()
    expect(result.reversedPendingEntry?.isVoid).toBe(true)
  })

  it.skip('handles void without prior pending entry', async () => {
    // Settle without creating pending first (manual entry scenario)
    const result = await recordRacingVoid({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-void-no-pending',
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        voidType: 'SCRATCHED',
        horseName: 'No Pending Horse',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    expect(result.refundEntry).toBeDefined()
    expect(result.reversedPendingEntry).toBeNull()
  })

  it.skip('throws error for non-positive stake', async () => {
    await expect(
      recordRacingVoid({
        data: {
          profileId: testProfileId,
          trackerEntryId: 'test-void-zero-stake',
          bookieId: testBookieId,
          stake: 0,
          isBonusBet: false,
          voidType: 'SCRATCHED',
          horseName: 'Test Horse',
          track: 'Test Track',
          raceNumber: 1,
        },
      })
    ).rejects.toThrow('Stake must be positive')
  })

  it.skip('formats description correctly', async () => {
    const result = await recordRacingVoid({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-void-desc',
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        voidType: 'SCRATCHED',
        horseName: 'Thunder Bolt',
        track: 'Randwick',
        raceNumber: 7,
      },
    })

    expect(result.refundEntry.description).toBe(
      'SCRATCHED: Thunder Bolt R7 @ Randwick - Horse scratched'
    )
  })
})

describe('recordRacingDeadHeat', () => {
  // Note: These tests require database setup with:
  // - System accounts seeded (PENDING_BACK, BACK_BET_WINS, QUALIFYING_LOSS)
  // - Bookie provisioner available
  // Run with: npx vitest --run src/modules/the-furlong/api/db/__tests__/racingJournalHooks.test.ts

  it.skip('creates correct journal for 2-way cash dead heat', async () => {
    // $10 stake, 4.00 odds, 2-way dead heat
    // Effective stake = 10/2 = $5, Returned stake = $5
    // Winning portion = 5 * 4.00 = $20
    // Total returns = 20 + 5 = $25
    // Profit = 25 - 10 = $15
    const result = await recordRacingDeadHeat({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-dh-cash-2way',
        bookieId: testBookieId,
        stake: 10,
        odds: 4.0,
        deadHeatDivisor: 2,
        isBonusBet: false,
        horseName: 'Dead Heat Horse',
        track: 'Randwick',
        raceNumber: 5,
      },
    })

    expect(result.calculation.originalStake).toBe(10)
    expect(result.calculation.effectiveStake).toBe(5)
    expect(result.calculation.returnedStake).toBe(5)
    expect(result.calculation.winningPortion).toBe(20)
    expect(result.calculation.totalReturns).toBe(25)
    expect(result.calculation.profit).toBe(15)
    expect(result.calculation.deadHeatDivisor).toBe(2)
    expect(result.settlementEntry.entryType).toBe('BET_SETTLED')
    expect(result.settlementEntry.referenceType).toBe('RACING_TRACKER')
    expect(result.settlementEntry.lines).toHaveLength(3)
    expect(result.wasExisting).toBe(false)
  })

  it.skip('creates correct journal for 3-way cash dead heat', async () => {
    // $30 stake, 6.00 odds, 3-way dead heat
    // Effective stake = 30/3 = $10, Returned stake = $20
    // Winning portion = 10 * 6.00 = $60
    // Total returns = 60 + 20 = $80
    // Profit = 80 - 30 = $50
    const result = await recordRacingDeadHeat({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-dh-cash-3way',
        bookieId: testBookieId,
        stake: 30,
        odds: 6.0,
        deadHeatDivisor: 3,
        isBonusBet: false,
        horseName: 'Triple Heat Horse',
        track: 'Flemington',
        raceNumber: 3,
      },
    })

    expect(result.calculation.effectiveStake).toBeCloseTo(10, 2)
    expect(result.calculation.returnedStake).toBeCloseTo(20, 2)
    expect(result.calculation.winningPortion).toBeCloseTo(60, 2)
    expect(result.calculation.totalReturns).toBeCloseTo(80, 2)
    expect(result.calculation.profit).toBeCloseTo(50, 2)
  })

  it.skip('handles bonus bet dead heat (profit only, or qualifying loss)', async () => {
    // $25 stake, 2.00 odds, 2-way dead heat
    // Effective stake = 25/2 = $12.50, Returned stake = $12.50
    // Winning portion = 12.50 * 2.00 = $25
    // Total returns = 25 + 12.50 = $37.50
    // Profit = 37.50 - 25 = $12.50
    const result = await recordRacingDeadHeat({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-dh-bonus',
        bookieId: testBookieId,
        stake: 25,
        odds: 2.0,
        deadHeatDivisor: 2,
        isBonusBet: true,
        horseName: 'Bonus Dead Heat',
        track: 'Caulfield',
        raceNumber: 7,
      },
    })

    expect(result.calculation.profit).toBeCloseTo(12.5, 2)
    expect(result.settlementEntry.description).toContain('DH 1/2')
    // Bonus bet with profit should still have 4 lines
    expect(result.settlementEntry.lines).toHaveLength(4)
  })

  it.skip('handles bonus bet dead heat with zero/negative profit', async () => {
    // $20 stake, 1.50 odds, 2-way dead heat
    // Effective stake = 20/2 = $10, Returned stake = $10
    // Winning portion = 10 * 1.50 = $15
    // Total returns = 15 + 10 = $25
    // Profit = 25 - 20 = $5 (still positive)
    // But with lower odds or higher divisor, could be negative

    // Example: $20 stake, 1.20 odds, 2-way dead heat
    // Effective stake = 20/2 = $10, Returned stake = $10
    // Winning portion = 10 * 1.20 = $12
    // Total returns = 12 + 10 = $22
    // Profit = 22 - 20 = $2 (still positive)

    // Extreme: $20 stake, 1.01 odds, 4-way dead heat
    // Effective stake = 20/4 = $5, Returned stake = $15
    // Winning portion = 5 * 1.01 = $5.05
    // Total returns = 5.05 + 15 = $20.05
    // Profit = 20.05 - 20 = $0.05 (barely positive)
    const result = await recordRacingDeadHeat({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-dh-bonus-low-profit',
        bookieId: testBookieId,
        stake: 20,
        odds: 1.01,
        deadHeatDivisor: 4,
        isBonusBet: true,
        horseName: 'Low Odds Dead Heat',
        track: 'Eagle Farm',
        raceNumber: 2,
      },
    })

    expect(result.calculation.profit).toBeCloseTo(0.05, 2)
    expect(result.settlementEntry).toBeDefined()
  })

  it.skip('returns existing settlement for duplicate request (idempotency)', async () => {
    const testInput = {
      profileId: testProfileId,
      trackerEntryId: 'test-dh-idempotent',
      bookieId: testBookieId,
      stake: 10,
      odds: 4.0,
      deadHeatDivisor: 2,
      isBonusBet: false,
      horseName: 'Idempotent Dead Heat',
      track: 'Randwick',
      raceNumber: 1,
    }

    // First call
    const first = await recordRacingDeadHeat({ data: testInput })
    expect(first.wasExisting).toBe(false)

    // Second call with same trackerEntryId
    const second = await recordRacingDeadHeat({ data: testInput })
    expect(second.wasExisting).toBe(true)
    expect(second.settlementEntry.id).toBe(first.settlementEntry.id)
  })

  it.skip('reverses pending BET_PLACED entry when settling', async () => {
    const trackerEntryId = 'test-dh-reversal'

    // First create a pending bet
    await recordRacingBetPlaced({
      data: {
        profileId: testProfileId,
        trackerEntryId,
        bookieId: testBookieId,
        stake: 10,
        isBonusBet: false,
        horseName: 'Reversal Horse',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    // Then settle as dead heat
    const result = await recordRacingDeadHeat({
      data: {
        profileId: testProfileId,
        trackerEntryId,
        bookieId: testBookieId,
        stake: 10,
        odds: 3.0,
        deadHeatDivisor: 2,
        isBonusBet: false,
        horseName: 'Reversal Horse',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    expect(result.reversedPendingEntry).not.toBeNull()
    expect(result.reversedPendingEntry?.isVoid).toBe(true)
  })

  it.skip('handles dead heat without prior pending entry', async () => {
    // Settle without creating pending first (manual entry scenario)
    const result = await recordRacingDeadHeat({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-dh-no-pending',
        bookieId: testBookieId,
        stake: 10,
        odds: 3.0,
        deadHeatDivisor: 2,
        isBonusBet: false,
        horseName: 'No Pending Horse',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    expect(result.settlementEntry).toBeDefined()
    expect(result.reversedPendingEntry).toBeNull()
  })

  it.skip('throws error for non-positive stake', async () => {
    await expect(
      recordRacingDeadHeat({
        data: {
          profileId: testProfileId,
          trackerEntryId: 'test-dh-zero-stake',
          bookieId: testBookieId,
          stake: 0,
          odds: 3.0,
          deadHeatDivisor: 2,
          isBonusBet: false,
          horseName: 'Test Horse',
          track: 'Test Track',
          raceNumber: 1,
        },
      })
    ).rejects.toThrow('Stake must be positive')
  })

  it.skip('throws error for odds <= 1', async () => {
    await expect(
      recordRacingDeadHeat({
        data: {
          profileId: testProfileId,
          trackerEntryId: 'test-dh-bad-odds',
          bookieId: testBookieId,
          stake: 10,
          odds: 1.0,
          deadHeatDivisor: 2,
          isBonusBet: false,
          horseName: 'Test Horse',
          track: 'Test Track',
          raceNumber: 1,
        },
      })
    ).rejects.toThrow('Odds must be greater than 1')
  })

  it.skip('throws error for invalid dead heat divisor', async () => {
    await expect(
      recordRacingDeadHeat({
        data: {
          profileId: testProfileId,
          trackerEntryId: 'test-dh-bad-divisor',
          bookieId: testBookieId,
          stake: 10,
          odds: 3.0,
          deadHeatDivisor: 0,
          isBonusBet: false,
          horseName: 'Test Horse',
          track: 'Test Track',
          raceNumber: 1,
        },
      })
    ).rejects.toThrow('Dead heat divisor must be at least 1')
  })

  it.skip('formats description correctly with DH divisor', async () => {
    const result = await recordRacingDeadHeat({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-dh-desc',
        bookieId: testBookieId,
        stake: 10,
        odds: 3.5,
        deadHeatDivisor: 2,
        isBonusBet: false,
        horseName: 'Thunder Bolt',
        track: 'Randwick',
        raceNumber: 7,
      },
    })

    expect(result.settlementEntry.description).toBe(
      'DH 1/2: Thunder Bolt R7 @ Randwick (3.50)'
    )
  })

  it.skip('formats description correctly for 3-way dead heat', async () => {
    const result = await recordRacingDeadHeat({
      data: {
        profileId: testProfileId,
        trackerEntryId: 'test-dh-desc-3way',
        bookieId: testBookieId,
        stake: 10,
        odds: 6.0,
        deadHeatDivisor: 3,
        isBonusBet: false,
        horseName: 'Triple Heat',
        track: 'Flemington',
        raceNumber: 1,
      },
    })

    expect(result.settlementEntry.description).toBe(
      'DH 1/3: Triple Heat R1 @ Flemington (6.00)'
    )
  })
})
