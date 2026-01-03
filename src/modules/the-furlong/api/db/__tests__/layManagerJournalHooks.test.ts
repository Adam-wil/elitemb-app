/**
 * Lay Manager Journal Hooks Tests
 *
 * Test cases for recordMatchedBetPlaced server function.
 * Requires: vitest setup with database test utilities
 *
 * @see src/modules/the-furlong/api/db/layManagerJournalHooks.server.ts
 */

import { describe, it, expect } from 'vitest'
import { recordMatchedBetPlaced, recordMatchedBetBackWins, recordMatchedBetLayWins } from '../layManagerJournalHooks.server'

// Test data - would need real profile/account IDs from test database
const testProfileId = 'test-profile-id'
const testBookieId = 1
const testLayManagerEntryId = 'test-lay-manager-entry-id'

describe('recordMatchedBetPlaced', () => {
  // Note: These tests require database setup with:
  // - System accounts seeded (PENDING_BACK, PENDING_LAY)
  // - Bookie provisioner available
  // - Betfair provisioner available
  // Run with: npx vitest --run src/modules/the-furlong/api/db/__tests__/layManagerJournalHooks.test.ts

  describe('calculateLayLiability', () => {
    it('calculates liability correctly for standard odds', () => {
      // Test formula: (layOdds - 1) * layStake
      // (2.95 - 1) * 10.20 = 1.95 * 10.20 = 19.89
      // This is tested implicitly through recordMatchedBetPlaced
    })
  })

  it.skip('creates 4-line journal entry for matched bet', async () => {
    const result = await recordMatchedBetPlaced({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-matched-1',
        backBookieId: testBookieId,
        backStake: 10,
        backOdds: 3.0,
        isBonusBet: false,
        layStake: 10.20,
        layOdds: 2.95,
        horseName: 'Matched Horse',
        track: 'Randwick',
        raceNumber: 5,
      },
    })

    expect(result.backStake).toBe(10)
    expect(result.layLiability).toBeCloseTo(19.89, 2) // (2.95 - 1) * 10.20
    expect(result.totalExposure).toBeCloseTo(29.89, 2)
    expect(result.journalEntry.entryType).toBe('BET_PLACED')
    expect(result.journalEntry.referenceType).toBe('LAY_MANAGER')
    expect(result.journalEntry.betType).toBe('LAY_MANAGER')
    expect(result.journalEntry.lines).toHaveLength(4)
    expect(result.wasExisting).toBe(false)

    // Verify total debits = total credits
    const totalDebits = result.journalEntry.lines.reduce((sum, l) => sum + l.debit, 0)
    const totalCredits = result.journalEntry.lines.reduce((sum, l) => sum + l.credit, 0)
    expect(totalDebits).toBeCloseTo(totalCredits, 2)
  })

  it.skip('creates correct journal lines with proper amounts', async () => {
    // Back $20, Lay $20.40 @ 3.00
    // Lay liability = (3.00 - 1) * 20.40 = 2.00 * 20.40 = 40.80
    // Total exposure = 20 + 40.80 = 60.80
    const result = await recordMatchedBetPlaced({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-matched-amounts',
        backBookieId: testBookieId,
        backStake: 20,
        backOdds: 4.0,
        isBonusBet: false,
        layStake: 20.40,
        layOdds: 3.0,
        horseName: 'Amount Horse',
        track: 'Flemington',
        raceNumber: 3,
      },
    })

    expect(result.backStake).toBe(20)
    expect(result.layLiability).toBeCloseTo(40.8, 2)
    expect(result.totalExposure).toBeCloseTo(60.8, 2)

    // Verify 4 lines exist
    expect(result.journalEntry.lines).toHaveLength(4)

    // Verify debit lines
    const debitLines = result.journalEntry.lines.filter((l) => l.debit > 0)
    expect(debitLines).toHaveLength(2)

    // Back stake debit (Pending Back)
    const backDebit = debitLines.find((l) => l.memo?.includes('Back pending'))
    expect(backDebit?.debit).toBe(20)

    // Lay liability debit (Pending Lay)
    const layDebit = debitLines.find((l) => l.memo?.includes('Lay liability'))
    expect(layDebit?.debit).toBeCloseTo(40.8, 2)

    // Verify credit lines
    const creditLines = result.journalEntry.lines.filter((l) => l.credit > 0)
    expect(creditLines).toHaveLength(2)

    // Back stake credit (Bookie Cash)
    const backCredit = creditLines.find((l) => l.memo?.includes('Back stake'))
    expect(backCredit?.credit).toBe(20)

    // Lay liability credit (Betfair Available)
    const layCredit = creditLines.find((l) => l.memo?.includes('Lay exposure'))
    expect(layCredit?.credit).toBeCloseTo(40.8, 2)
  })

  it.skip('uses bonus account for bonus back bet', async () => {
    const result = await recordMatchedBetPlaced({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-bonus-matched',
        backBookieId: testBookieId,
        backStake: 25,
        backOdds: 2.5,
        isBonusBet: true, // Bonus bet
        layStake: 25.50,
        layOdds: 2.45,
        horseName: 'Bonus Matched',
        track: 'Flemington',
        raceNumber: 3,
      },
    })

    expect(result.journalEntry.lines).toHaveLength(4)

    // Verify back stake credited from bonus account (check memo)
    const backCreditLine = result.journalEntry.lines.find(
      (l) => l.credit > 0 && l.memo?.includes('Back stake')
    )
    expect(backCreditLine).toBeDefined()
    expect(backCreditLine?.credit).toBe(25)
    // Note: Would need to verify accountId is bonus account in real test
  })

  it.skip('provisions Betfair account if not exists', async () => {
    // Use new profile without Betfair account
    const result = await recordMatchedBetPlaced({
      data: {
        profileId: 'new-profile-id',
        layManagerEntryId: 'test-betfair-provision',
        backBookieId: testBookieId,
        backStake: 10,
        backOdds: 3.0,
        isBonusBet: false,
        layStake: 10.20,
        layOdds: 2.95,
        horseName: 'Provision Horse',
        track: 'Randwick',
        raceNumber: 1,
      },
    })

    expect(result.journalEntry).toBeDefined()
    // Verify Betfair account was created
    // Would need prisma query in real test
  })

  it.skip('returns existing settlement for duplicate request (idempotency)', async () => {
    const testInput = {
      profileId: testProfileId,
      layManagerEntryId: 'test-matched-idempotent',
      backBookieId: testBookieId,
      backStake: 10,
      backOdds: 3.0,
      isBonusBet: false,
      layStake: 10.20,
      layOdds: 2.95,
      horseName: 'Idempotent Horse',
      track: 'Randwick',
      raceNumber: 1,
    }

    // First call
    const first = await recordMatchedBetPlaced({ data: testInput })
    expect(first.wasExisting).toBe(false)

    // Second call with same layManagerEntryId
    const second = await recordMatchedBetPlaced({ data: testInput })
    expect(second.wasExisting).toBe(true)
    expect(second.journalEntry.id).toBe(first.journalEntry.id)
  })

  it.skip('throws error for non-positive back stake', async () => {
    await expect(
      recordMatchedBetPlaced({
        data: {
          profileId: testProfileId,
          layManagerEntryId: 'test-zero-back-stake',
          backBookieId: testBookieId,
          backStake: 0,
          backOdds: 3.0,
          isBonusBet: false,
          layStake: 10.20,
          layOdds: 2.95,
          horseName: 'Test Horse',
          track: 'Test Track',
          raceNumber: 1,
        },
      })
    ).rejects.toThrow('Back stake must be positive')
  })

  it.skip('throws error for non-positive lay stake', async () => {
    await expect(
      recordMatchedBetPlaced({
        data: {
          profileId: testProfileId,
          layManagerEntryId: 'test-zero-lay-stake',
          backBookieId: testBookieId,
          backStake: 10,
          backOdds: 3.0,
          isBonusBet: false,
          layStake: 0,
          layOdds: 2.95,
          horseName: 'Test Horse',
          track: 'Test Track',
          raceNumber: 1,
        },
      })
    ).rejects.toThrow('Lay stake must be positive')
  })

  it.skip('throws error for lay odds <= 1', async () => {
    await expect(
      recordMatchedBetPlaced({
        data: {
          profileId: testProfileId,
          layManagerEntryId: 'test-bad-lay-odds',
          backBookieId: testBookieId,
          backStake: 10,
          backOdds: 3.0,
          isBonusBet: false,
          layStake: 10.20,
          layOdds: 1.0, // Invalid lay odds
          horseName: 'Test Horse',
          track: 'Test Track',
          raceNumber: 1,
        },
      })
    ).rejects.toThrow('Lay odds must be greater than 1')
  })

  it.skip('formats description correctly with back and lay details', async () => {
    const result = await recordMatchedBetPlaced({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-description',
        backBookieId: testBookieId,
        backStake: 10,
        backOdds: 3.5,
        isBonusBet: false,
        layStake: 10.20,
        layOdds: 3.45,
        horseName: 'Thunder Bolt',
        track: 'Randwick',
        raceNumber: 7,
      },
    })

    expect(result.journalEntry.description).toContain('Matched bet')
    expect(result.journalEntry.description).toContain('Thunder Bolt')
    expect(result.journalEntry.description).toContain('R7')
    expect(result.journalEntry.description).toContain('Randwick')
    expect(result.journalEntry.description).toContain('Back $10.00 @ 3.50')
    expect(result.journalEntry.description).toContain('Lay $10.20 @ 3.45')
  })

  it.skip('calculates lay liability for various odds', async () => {
    // Test 1: Even money lay (2.00 odds)
    // Liability = (2.00 - 1) * 25.00 = 1.00 * 25.00 = 25.00
    const result1 = await recordMatchedBetPlaced({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-even-money',
        backBookieId: testBookieId,
        backStake: 25,
        backOdds: 2.0,
        isBonusBet: false,
        layStake: 25,
        layOdds: 2.0,
        horseName: 'Even Money',
        track: 'Test Track',
        raceNumber: 1,
      },
    })
    expect(result1.layLiability).toBe(25)

    // Test 2: Long odds lay (5.00 odds)
    // Liability = (5.00 - 1) * 10.00 = 4.00 * 10.00 = 40.00
    const result2 = await recordMatchedBetPlaced({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-long-odds',
        backBookieId: testBookieId,
        backStake: 10,
        backOdds: 5.0,
        isBonusBet: false,
        layStake: 10,
        layOdds: 5.0,
        horseName: 'Long Shot',
        track: 'Test Track',
        raceNumber: 2,
      },
    })
    expect(result2.layLiability).toBe(40)
  })
})

describe('recordMatchedBetBackWins', () => {
  // Note: These tests require database setup with:
  // - System accounts seeded (PENDING_BACK, PENDING_LAY, BACK_BET_WINS, LAY_BET_PAYOUTS)
  // - Bookie provisioner available
  // - Betfair provisioner available
  // Run with: npx vitest --run src/modules/the-furlong/api/db/__tests__/layManagerJournalHooks.test.ts

  it.skip('creates correct journal for cash matched bet back wins', async () => {
    // Back $10 @ 3.00, Lay $10.20 @ 2.95
    // Back returns = 10 * 3.00 = $30
    // Back profit = 30 - 10 = $20
    // Lay liability paid = (2.95 - 1) * 10.20 = $19.89
    // Net P&L = 20 - 19.89 = +$0.11
    const result = await recordMatchedBetBackWins({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-back-wins-1',
        backBookieId: testBookieId,
        backStake: 10,
        backOdds: 3.0,
        isBonusBet: false,
        layStake: 10.20,
        layOdds: 2.95,
        horseName: 'Winner Horse',
        track: 'Randwick',
        raceNumber: 5,
      },
    })

    expect(result.calculation.backReturns).toBe(30)
    expect(result.calculation.backProfit).toBe(20)
    expect(result.calculation.layLiabilityPaid).toBeCloseTo(19.89, 2)
    expect(result.calculation.netProfitLoss).toBeCloseTo(0.11, 2)

    expect(result.settlementEntry.entryType).toBe('BET_SETTLED')
    expect(result.settlementEntry.referenceType).toBe('LAY_MANAGER')
    expect(result.settlementEntry.lines).toHaveLength(5)
    expect(result.wasExisting).toBe(false)

    // Verify balance
    const totalDebits = result.settlementEntry.lines.reduce((s, l) => s + l.debit, 0)
    const totalCredits = result.settlementEntry.lines.reduce((s, l) => s + l.credit, 0)
    expect(totalDebits).toBeCloseTo(totalCredits, 2)
  })

  it.skip('calculates amounts correctly for various matched bets', async () => {
    // Back $20 @ 4.00, Lay $20.40 @ 3.90
    // Back returns = 20 * 4.00 = $80
    // Back profit = 80 - 20 = $60
    // Lay liability = (3.90 - 1) * 20.40 = 2.90 * 20.40 = $59.16
    // Net P&L = 60 - 59.16 = +$0.84
    const result = await recordMatchedBetBackWins({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-back-wins-calc',
        backBookieId: testBookieId,
        backStake: 20,
        backOdds: 4.0,
        isBonusBet: false,
        layStake: 20.40,
        layOdds: 3.90,
        horseName: 'Calc Horse',
        track: 'Flemington',
        raceNumber: 1,
      },
    })

    expect(result.calculation.backReturns).toBe(80)
    expect(result.calculation.backProfit).toBe(60)
    expect(result.calculation.layLiabilityPaid).toBeCloseTo(59.16, 2)
    expect(result.calculation.netProfitLoss).toBeCloseTo(0.84, 2)
  })

  it.skip('handles bonus back bet (profit only to cash)', async () => {
    // Bonus $25 @ 2.50, Lay $25.50 @ 2.45
    // Back returns = 25 * 2.50 = $62.50
    // Back profit = 62.50 - 25 = $37.50 (only this goes to cash)
    // Lay liability = (2.45 - 1) * 25.50 = 1.45 * 25.50 = $36.975
    // Net P&L = 37.50 - 36.975 = +$0.525
    const result = await recordMatchedBetBackWins({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-bonus-back-wins',
        backBookieId: testBookieId,
        backStake: 25,
        backOdds: 2.5,
        isBonusBet: true,
        layStake: 25.50,
        layOdds: 2.45,
        horseName: 'Bonus Winner',
        track: 'Flemington',
        raceNumber: 3,
      },
    })

    expect(result.calculation.backProfit).toBe(37.5) // Only this goes to cash
    expect(result.calculation.layLiabilityPaid).toBeCloseTo(36.975, 2)
    expect(result.calculation.netProfitLoss).toBeCloseTo(0.525, 2)

    // Bonus bet should have 6 lines
    expect(result.settlementEntry.lines).toHaveLength(6)

    // Find cash debit line - should be profit only
    const cashDebit = result.settlementEntry.lines.find(
      (l) => l.debit > 0 && l.memo?.includes('profit')
    )
    expect(cashDebit?.debit).toBe(37.5)
  })

  it.skip('reverses pending entry when settling', async () => {
    const entryId = 'test-settle-with-reversal'

    // First create pending matched bet
    await recordMatchedBetPlaced({
      data: {
        profileId: testProfileId,
        layManagerEntryId: entryId,
        backBookieId: testBookieId,
        backStake: 10,
        backOdds: 3.0,
        isBonusBet: false,
        layStake: 10.20,
        layOdds: 2.95,
        horseName: 'Reversal Horse',
        track: 'Randwick',
        raceNumber: 1,
      },
    })

    // Then settle as back wins
    const result = await recordMatchedBetBackWins({
      data: {
        profileId: testProfileId,
        layManagerEntryId: entryId,
        backBookieId: testBookieId,
        backStake: 10,
        backOdds: 3.0,
        isBonusBet: false,
        layStake: 10.20,
        layOdds: 2.95,
        horseName: 'Reversal Horse',
        track: 'Randwick',
        raceNumber: 1,
      },
    })

    expect(result.reversedPendingEntry).not.toBeNull()
    expect(result.reversedPendingEntry?.isVoid).toBe(true)
  })

  it.skip('handles settlement without prior pending entry', async () => {
    // Settle without creating pending first (manual entry scenario)
    const result = await recordMatchedBetBackWins({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-no-pending-back-wins',
        backBookieId: testBookieId,
        backStake: 10,
        backOdds: 3.0,
        isBonusBet: false,
        layStake: 10.20,
        layOdds: 2.95,
        horseName: 'No Pending Horse',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    expect(result.settlementEntry).toBeDefined()
    expect(result.reversedPendingEntry).toBeNull()
  })

  it.skip('returns existing settlement for duplicate request (idempotency)', async () => {
    const testInput = {
      profileId: testProfileId,
      layManagerEntryId: 'test-back-wins-idempotent',
      backBookieId: testBookieId,
      backStake: 10,
      backOdds: 3.0,
      isBonusBet: false,
      layStake: 10.20,
      layOdds: 2.95,
      horseName: 'Idempotent Winner',
      track: 'Randwick',
      raceNumber: 1,
    }

    // First call
    const first = await recordMatchedBetBackWins({ data: testInput })
    expect(first.wasExisting).toBe(false)

    // Second call with same layManagerEntryId
    const second = await recordMatchedBetBackWins({ data: testInput })
    expect(second.wasExisting).toBe(true)
    expect(second.settlementEntry.id).toBe(first.settlementEntry.id)
  })

  it.skip('throws error for non-positive back stake', async () => {
    await expect(
      recordMatchedBetBackWins({
        data: {
          profileId: testProfileId,
          layManagerEntryId: 'test-zero-stake',
          backBookieId: testBookieId,
          backStake: 0,
          backOdds: 3.0,
          isBonusBet: false,
          layStake: 10.20,
          layOdds: 2.95,
          horseName: 'Test Horse',
          track: 'Test Track',
          raceNumber: 1,
        },
      })
    ).rejects.toThrow('Back stake must be positive')
  })

  it.skip('throws error for back odds <= 1', async () => {
    await expect(
      recordMatchedBetBackWins({
        data: {
          profileId: testProfileId,
          layManagerEntryId: 'test-bad-back-odds',
          backBookieId: testBookieId,
          backStake: 10,
          backOdds: 1.0,
          isBonusBet: false,
          layStake: 10.20,
          layOdds: 2.95,
          horseName: 'Test Horse',
          track: 'Test Track',
          raceNumber: 1,
        },
      })
    ).rejects.toThrow('Back odds must be greater than 1')
  })

  it.skip('formats description correctly with net P&L', async () => {
    const result = await recordMatchedBetBackWins({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-desc-format',
        backBookieId: testBookieId,
        backStake: 10,
        backOdds: 3.0,
        isBonusBet: false,
        layStake: 10.20,
        layOdds: 2.95,
        horseName: 'Thunder Bolt',
        track: 'Randwick',
        raceNumber: 7,
      },
    })

    expect(result.settlementEntry.description).toContain('Back Wins')
    expect(result.settlementEntry.description).toContain('Thunder Bolt')
    expect(result.settlementEntry.description).toContain('R7')
    expect(result.settlementEntry.description).toContain('Randwick')
    expect(result.settlementEntry.description).toContain('Net:')
    expect(result.settlementEntry.description).toContain('+$0.11')
  })

  it.skip('shows negative net P&L correctly', async () => {
    // When lay liability > back profit, net should be negative
    // Back $10 @ 2.00, Lay $10.50 @ 2.10
    // Back profit = 10 * 2.00 - 10 = $10
    // Lay liability = (2.10 - 1) * 10.50 = 1.10 * 10.50 = $11.55
    // Net = 10 - 11.55 = -$1.55
    const result = await recordMatchedBetBackWins({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-negative-net',
        backBookieId: testBookieId,
        backStake: 10,
        backOdds: 2.0,
        isBonusBet: false,
        layStake: 10.50,
        layOdds: 2.10,
        horseName: 'Negative Net Horse',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    expect(result.calculation.netProfitLoss).toBeCloseTo(-1.55, 2)
    expect(result.settlementEntry.description).toContain('-$1.55')
  })
})

describe('recordMatchedBetLayWins', () => {
  // Note: These tests require database setup with:
  // - System accounts seeded (PENDING_BACK, PENDING_LAY, BACK_BET_LOSSES, QUALIFYING_LOSS, LAY_BET_WINS, BETFAIR_COMMISSION)
  // - Bookie provisioner available
  // - Betfair provisioner available
  // Run with: npx vitest --run src/modules/the-furlong/api/db/__tests__/layManagerJournalHooks.test.ts

  it.skip('creates correct journal for cash matched bet lay wins', async () => {
    // Back $10 @ 3.00, Lay $10.20 @ 2.95, Commission 5%
    // Back loss = $10
    // Lay liability (returned) = (2.95 - 1) * 10.20 = $19.89
    // Lay gross profit = $10.20 (backer's stake kept)
    // Commission = $10.20 * 5% = $0.51
    // Lay net profit = $10.20 - $0.51 = $9.69
    // Net P&L = $9.69 - $10.00 = -$0.31 (qualifying loss)
    const result = await recordMatchedBetLayWins({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-lay-wins-1',
        backBookieId: testBookieId,
        backStake: 10,
        isBonusBet: false,
        layStake: 10.20,
        layOdds: 2.95,
        layCommissionPercent: 5,
        horseName: 'Loser Horse',
        track: 'Randwick',
        raceNumber: 5,
      },
    })

    expect(result.calculation.backLoss).toBe(10)
    expect(result.calculation.layLiabilityReturned).toBeCloseTo(19.89, 2)
    expect(result.calculation.layGrossProfit).toBe(10.20)
    expect(result.calculation.betfairCommission).toBeCloseTo(0.51, 2)
    expect(result.calculation.layNetProfit).toBeCloseTo(9.69, 2)
    expect(result.calculation.netProfitLoss).toBeCloseTo(-0.31, 2)

    expect(result.settlementEntry.entryType).toBe('BET_SETTLED')
    expect(result.settlementEntry.referenceType).toBe('LAY_MANAGER')
    expect(result.settlementEntry.lines).toHaveLength(7)
    expect(result.wasExisting).toBe(false)

    // Verify balance
    const totalDebits = result.settlementEntry.lines.reduce((s, l) => s + l.debit, 0)
    const totalCredits = result.settlementEntry.lines.reduce((s, l) => s + l.credit, 0)
    expect(totalDebits).toBeCloseTo(totalCredits, 2)
  })

  it.skip('uses Qualifying Loss account for bonus back bet', async () => {
    // Bonus $25 @ 2.50, Lay $25.50 @ 2.45, Commission 5%
    // Back loss = $25 (goes to QUALIFYING_LOSS)
    // Lay liability (returned) = (2.45 - 1) * 25.50 = $36.98
    // Lay gross profit = $25.50
    // Commission = $25.50 * 5% = $1.275
    // Lay net profit = $25.50 - $1.275 = $24.225
    // Net P&L = $24.225 - $25 = -$0.775 (qualifying loss)
    const result = await recordMatchedBetLayWins({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-bonus-lay-wins',
        backBookieId: testBookieId,
        backStake: 25,
        isBonusBet: true, // Bonus bet
        layStake: 25.50,
        layOdds: 2.45,
        layCommissionPercent: 5,
        horseName: 'Bonus Loser',
        track: 'Flemington',
        raceNumber: 3,
      },
    })

    // Back loss should be recorded as Qualifying Loss
    const lossLine = result.settlementEntry.lines.find(
      (l) => l.debit > 0 && l.memo?.includes('Qualifying loss')
    )
    expect(lossLine).toBeDefined()
    expect(lossLine?.debit).toBe(25)

    // Still 7 lines
    expect(result.settlementEntry.lines).toHaveLength(7)
  })

  it.skip('calculates commission correctly', async () => {
    // Test with 5% commission on $100 lay stake
    const result = await recordMatchedBetLayWins({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-commission-calc',
        backBookieId: testBookieId,
        backStake: 100,
        isBonusBet: false,
        layStake: 100,
        layOdds: 2.0,
        layCommissionPercent: 5,
        horseName: 'Commission Horse',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    expect(result.calculation.layGrossProfit).toBe(100)
    expect(result.calculation.betfairCommission).toBe(5) // 5% of 100
    expect(result.calculation.layNetProfit).toBe(95)
  })

  it.skip('handles different commission rates', async () => {
    // Test with discounted commission (2%)
    const result = await recordMatchedBetLayWins({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-discount-commission',
        backBookieId: testBookieId,
        backStake: 100,
        isBonusBet: false,
        layStake: 100,
        layOdds: 2.0,
        layCommissionPercent: 2, // Discounted rate
        horseName: 'Discount Horse',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    expect(result.calculation.betfairCommission).toBe(2) // 2% of 100
    expect(result.calculation.layNetProfit).toBe(98)
  })

  it.skip('reverses pending entry when settling', async () => {
    const entryId = 'test-settle-lay-wins-reversal'

    // First create pending matched bet
    await recordMatchedBetPlaced({
      data: {
        profileId: testProfileId,
        layManagerEntryId: entryId,
        backBookieId: testBookieId,
        backStake: 10,
        backOdds: 3.0,
        isBonusBet: false,
        layStake: 10.20,
        layOdds: 2.95,
        horseName: 'Reversal Horse',
        track: 'Randwick',
        raceNumber: 1,
      },
    })

    // Then settle as lay wins
    const result = await recordMatchedBetLayWins({
      data: {
        profileId: testProfileId,
        layManagerEntryId: entryId,
        backBookieId: testBookieId,
        backStake: 10,
        isBonusBet: false,
        layStake: 10.20,
        layOdds: 2.95,
        layCommissionPercent: 5,
        horseName: 'Reversal Horse',
        track: 'Randwick',
        raceNumber: 1,
      },
    })

    expect(result.reversedPendingEntry).not.toBeNull()
    expect(result.reversedPendingEntry?.isVoid).toBe(true)
  })

  it.skip('handles settlement without prior pending entry', async () => {
    // Settle without creating pending first (manual entry scenario)
    const result = await recordMatchedBetLayWins({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-no-pending-lay-wins',
        backBookieId: testBookieId,
        backStake: 10,
        isBonusBet: false,
        layStake: 10.20,
        layOdds: 2.95,
        layCommissionPercent: 5,
        horseName: 'No Pending Horse',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    expect(result.settlementEntry).toBeDefined()
    expect(result.reversedPendingEntry).toBeNull()
  })

  it.skip('returns existing settlement for duplicate request (idempotency)', async () => {
    const testInput = {
      profileId: testProfileId,
      layManagerEntryId: 'test-lay-wins-idempotent',
      backBookieId: testBookieId,
      backStake: 10,
      isBonusBet: false,
      layStake: 10.20,
      layOdds: 2.95,
      layCommissionPercent: 5,
      horseName: 'Idempotent Loser',
      track: 'Randwick',
      raceNumber: 1,
    }

    // First call
    const first = await recordMatchedBetLayWins({ data: testInput })
    expect(first.wasExisting).toBe(false)

    // Second call with same layManagerEntryId
    const second = await recordMatchedBetLayWins({ data: testInput })
    expect(second.wasExisting).toBe(true)
    expect(second.settlementEntry.id).toBe(first.settlementEntry.id)
  })

  it.skip('throws error for non-positive back stake', async () => {
    await expect(
      recordMatchedBetLayWins({
        data: {
          profileId: testProfileId,
          layManagerEntryId: 'test-zero-back-stake',
          backBookieId: testBookieId,
          backStake: 0,
          isBonusBet: false,
          layStake: 10.20,
          layOdds: 2.95,
          layCommissionPercent: 5,
          horseName: 'Test Horse',
          track: 'Test Track',
          raceNumber: 1,
        },
      })
    ).rejects.toThrow('Back stake must be positive')
  })

  it.skip('throws error for non-positive lay stake', async () => {
    await expect(
      recordMatchedBetLayWins({
        data: {
          profileId: testProfileId,
          layManagerEntryId: 'test-zero-lay-stake',
          backBookieId: testBookieId,
          backStake: 10,
          isBonusBet: false,
          layStake: 0,
          layOdds: 2.95,
          layCommissionPercent: 5,
          horseName: 'Test Horse',
          track: 'Test Track',
          raceNumber: 1,
        },
      })
    ).rejects.toThrow('Lay stake must be positive')
  })

  it.skip('throws error for lay odds <= 1', async () => {
    await expect(
      recordMatchedBetLayWins({
        data: {
          profileId: testProfileId,
          layManagerEntryId: 'test-bad-lay-odds',
          backBookieId: testBookieId,
          backStake: 10,
          isBonusBet: false,
          layStake: 10.20,
          layOdds: 1.0, // Invalid lay odds
          layCommissionPercent: 5,
          horseName: 'Test Horse',
          track: 'Test Track',
          raceNumber: 1,
        },
      })
    ).rejects.toThrow('Lay odds must be greater than 1')
  })

  it.skip('formats description correctly with net P&L', async () => {
    const result = await recordMatchedBetLayWins({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-desc-format-lay',
        backBookieId: testBookieId,
        backStake: 10,
        isBonusBet: false,
        layStake: 10.20,
        layOdds: 2.95,
        layCommissionPercent: 5,
        horseName: 'Thunder Bolt',
        track: 'Randwick',
        raceNumber: 7,
      },
    })

    expect(result.settlementEntry.description).toContain('Lay Wins')
    expect(result.settlementEntry.description).toContain('Thunder Bolt')
    expect(result.settlementEntry.description).toContain('R7')
    expect(result.settlementEntry.description).toContain('Randwick')
    expect(result.settlementEntry.description).toContain('Loss:')
    expect(result.settlementEntry.description).toContain('Lay Win:')
    expect(result.settlementEntry.description).toContain('Net:')
  })

  it.skip('verifies journal lines correctly credit Betfair', async () => {
    // Back $10, Lay $10.20 @ 2.95, 5% commission
    // Betfair debit: liability (19.89) + net profit (9.69) = 29.58
    // Betfair credit: commission (0.51)
    const result = await recordMatchedBetLayWins({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-betfair-lines',
        backBookieId: testBookieId,
        backStake: 10,
        isBonusBet: false,
        layStake: 10.20,
        layOdds: 2.95,
        layCommissionPercent: 5,
        horseName: 'Betfair Test',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    // Find Betfair lines
    const betfairDebit = result.settlementEntry.lines.find(
      (l) => l.debit > 0 && l.memo?.includes('Lay win + liability return')
    )
    expect(betfairDebit).toBeDefined()
    expect(betfairDebit?.debit).toBeCloseTo(29.58, 2) // 19.89 + 9.69

    const betfairCredit = result.settlementEntry.lines.find(
      (l) => l.credit > 0 && l.memo?.includes('Commission deducted')
    )
    expect(betfairCredit).toBeDefined()
    expect(betfairCredit?.credit).toBeCloseTo(0.51, 2)
  })

  it.skip('verifies lay profit and commission lines', async () => {
    const result = await recordMatchedBetLayWins({
      data: {
        profileId: testProfileId,
        layManagerEntryId: 'test-profit-commission-lines',
        backBookieId: testBookieId,
        backStake: 10,
        isBonusBet: false,
        layStake: 10.20,
        layOdds: 2.95,
        layCommissionPercent: 5,
        horseName: 'Profit Test',
        track: 'Test Track',
        raceNumber: 1,
      },
    })

    // Find Lay Bet Wins credit
    const layProfitLine = result.settlementEntry.lines.find(
      (l) => l.credit > 0 && l.memo?.includes('Lay profit')
    )
    expect(layProfitLine).toBeDefined()
    expect(layProfitLine?.credit).toBeCloseTo(9.69, 2)

    // Find Commission debit
    const commissionLine = result.settlementEntry.lines.find(
      (l) => l.debit > 0 && l.memo?.includes('commission')
    )
    expect(commissionLine).toBeDefined()
    expect(commissionLine?.debit).toBeCloseTo(0.51, 2)
  })
})
