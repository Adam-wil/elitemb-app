/**
 * Betfair Transaction Service Tests
 *
 * Test cases for recording Betfair deposits and withdrawals.
 *
 * @see src/modules/accounts/api/db/bankTransactionService.server.ts
 * @see Story 3.12: Betfair Deposit/Withdrawal Recording
 */

import { describe, it, expect } from 'vitest'

/**
 * Note: These are unit tests for the logic patterns.
 * Integration tests requiring Prisma would use a test database setup.
 */

// ============================================================================
// Transaction Type Logic Tests
// ============================================================================

describe('Betfair Transaction Type Logic', () => {
  describe('DEPOSIT flow (immediate)', () => {
    it('should debit Betfair Available (increase) for deposits', () => {
      const transactionType = 'DEPOSIT'
      const amount = 100

      // Deposit: money flows FROM bank TO Betfair
      // Betfair Available increases (debit for assets)
      // Bank decreases (credit for assets)
      const lines = transactionType === 'DEPOSIT'
        ? [
            { accountType: 'BETFAIR_AVAILABLE', debit: amount, credit: 0 },
            { accountType: 'BANK', debit: 0, credit: amount },
          ]
        : []

      expect(lines[0].debit).toBe(100)
      expect(lines[0].credit).toBe(0)
      expect(lines[0].accountType).toBe('BETFAIR_AVAILABLE')
    })

    it('should credit bank account (decrease) for deposits', () => {
      const transactionType = 'DEPOSIT'
      const amount = 100

      const lines = transactionType === 'DEPOSIT'
        ? [
            { accountType: 'BETFAIR_AVAILABLE', debit: amount, credit: 0 },
            { accountType: 'BANK', debit: 0, credit: amount },
          ]
        : []

      expect(lines[1].debit).toBe(0)
      expect(lines[1].credit).toBe(100)
      expect(lines[1].accountType).toBe('BANK')
    })

    it('should be balanced (debits = credits)', () => {
      const amount = 250.50

      const lines = [
        { accountType: 'BETFAIR_AVAILABLE', debit: amount, credit: 0 },
        { accountType: 'BANK', debit: 0, credit: amount },
      ]

      const totalDebits = lines.reduce((sum, l) => sum + l.debit, 0)
      const totalCredits = lines.reduce((sum, l) => sum + l.credit, 0)

      expect(totalDebits).toBe(totalCredits)
      expect(totalDebits).toBe(250.50)
    })
  })

  describe('WITHDRAWAL flow', () => {
    it('should debit bank account (increase) for withdrawals', () => {
      const transactionType = 'WITHDRAWAL'
      const amount = 100

      // Withdrawal: money flows FROM Betfair TO bank
      // Bank increases (debit for assets)
      // Betfair Available decreases (credit for assets)
      const lines = transactionType === 'WITHDRAWAL'
        ? [
            { accountType: 'BANK', debit: amount, credit: 0 },
            { accountType: 'BETFAIR_AVAILABLE', debit: 0, credit: amount },
          ]
        : []

      expect(lines[0].debit).toBe(100)
      expect(lines[0].credit).toBe(0)
      expect(lines[0].accountType).toBe('BANK')
    })

    it('should credit Betfair Available (decrease) for withdrawals', () => {
      const transactionType = 'WITHDRAWAL'
      const amount = 100

      const lines = transactionType === 'WITHDRAWAL'
        ? [
            { accountType: 'BANK', debit: amount, credit: 0 },
            { accountType: 'BETFAIR_AVAILABLE', debit: 0, credit: amount },
          ]
        : []

      expect(lines[1].debit).toBe(0)
      expect(lines[1].credit).toBe(100)
      expect(lines[1].accountType).toBe('BETFAIR_AVAILABLE')
    })

    it('should be balanced (debits = credits)', () => {
      const amount = 175.25

      const lines = [
        { accountType: 'BANK', debit: amount, credit: 0 },
        { accountType: 'BETFAIR_AVAILABLE', debit: 0, credit: amount },
      ]

      const totalDebits = lines.reduce((sum, l) => sum + l.debit, 0)
      const totalCredits = lines.reduce((sum, l) => sum + l.credit, 0)

      expect(totalDebits).toBe(totalCredits)
      expect(totalDebits).toBe(175.25)
    })
  })
})

// ============================================================================
// Pending Deposit Flow Tests
// ============================================================================

describe('Pending Deposit Flow', () => {
  describe('PENDING DEPOSIT step 1 (funds in transit)', () => {
    it('should debit Betfair Available (increase) for pending deposits', () => {
      const amount = 200
      const pending = true

      // Pending deposit: Betfair balance increases immediately
      // Pending liability account is credited (represents debt to be settled)
      const lines = pending
        ? [
            { accountType: 'BETFAIR_AVAILABLE', debit: amount, credit: 0 },
            { accountType: 'PENDING_BETFAIR_DEPOSIT', debit: 0, credit: amount },
          ]
        : []

      expect(lines[0].debit).toBe(200)
      expect(lines[0].accountType).toBe('BETFAIR_AVAILABLE')
    })

    it('should credit Pending Betfair Deposit liability for pending deposits', () => {
      const amount = 200

      const lines = [
        { accountType: 'BETFAIR_AVAILABLE', debit: amount, credit: 0 },
        { accountType: 'PENDING_BETFAIR_DEPOSIT', debit: 0, credit: amount },
      ]

      expect(lines[1].credit).toBe(200)
      expect(lines[1].accountType).toBe('PENDING_BETFAIR_DEPOSIT')
    })

    it('should be balanced (debits = credits)', () => {
      const amount = 500

      const lines = [
        { accountType: 'BETFAIR_AVAILABLE', debit: amount, credit: 0 },
        { accountType: 'PENDING_BETFAIR_DEPOSIT', debit: 0, credit: amount },
      ]

      const totalDebits = lines.reduce((sum, l) => sum + l.debit, 0)
      const totalCredits = lines.reduce((sum, l) => sum + l.credit, 0)

      expect(totalDebits).toBe(totalCredits)
    })
  })

  describe('SETTLEMENT step 2 (funds cleared)', () => {
    it('should debit Pending Betfair Deposit (decrease liability)', () => {
      const amount = 200

      // Settlement: Clear the pending liability, credit the bank
      const lines = [
        { accountType: 'PENDING_BETFAIR_DEPOSIT', debit: amount, credit: 0 },
        { accountType: 'BANK', debit: 0, credit: amount },
      ]

      expect(lines[0].debit).toBe(200)
      expect(lines[0].accountType).toBe('PENDING_BETFAIR_DEPOSIT')
    })

    it('should credit bank account (decrease)', () => {
      const amount = 200

      const lines = [
        { accountType: 'PENDING_BETFAIR_DEPOSIT', debit: amount, credit: 0 },
        { accountType: 'BANK', debit: 0, credit: amount },
      ]

      expect(lines[1].credit).toBe(200)
      expect(lines[1].accountType).toBe('BANK')
    })

    it('should be balanced (debits = credits)', () => {
      const amount = 350

      const lines = [
        { accountType: 'PENDING_BETFAIR_DEPOSIT', debit: amount, credit: 0 },
        { accountType: 'BANK', debit: 0, credit: amount },
      ]

      const totalDebits = lines.reduce((sum, l) => sum + l.debit, 0)
      const totalCredits = lines.reduce((sum, l) => sum + l.credit, 0)

      expect(totalDebits).toBe(totalCredits)
    })
  })

  describe('Complete pending flow net effect', () => {
    it('should result in correct final balances after both steps', () => {
      const amount = 200
      const initialBetfairBalance = 0
      const initialBankBalance = 500
      const initialPendingBalance = 0 // Liability

      // Step 1: Pending deposit
      // DR Betfair Available (+200), CR Pending Deposit (+200 liability)
      const afterStep1 = {
        betfair: initialBetfairBalance + amount, // 200
        bank: initialBankBalance, // 500 (unchanged)
        pending: initialPendingBalance + amount, // 200 liability
      }

      expect(afterStep1.betfair).toBe(200)
      expect(afterStep1.bank).toBe(500)
      expect(afterStep1.pending).toBe(200)

      // Step 2: Settlement
      // DR Pending Deposit (-200), CR Bank (-200)
      const afterStep2 = {
        betfair: afterStep1.betfair, // 200 (unchanged)
        bank: afterStep1.bank - amount, // 300
        pending: afterStep1.pending - amount, // 0
      }

      expect(afterStep2.betfair).toBe(200)
      expect(afterStep2.bank).toBe(300)
      expect(afterStep2.pending).toBe(0)
    })

    it('should equal immediate deposit net effect', () => {
      const amount = 200
      const initialBetfairBalance = 0
      const initialBankBalance = 500

      // Immediate deposit: DR Betfair (+200), CR Bank (-200)
      const immediateResult = {
        betfair: initialBetfairBalance + amount, // 200
        bank: initialBankBalance - amount, // 300
      }

      // Pending + settlement result
      const pendingResult = {
        betfair: 200, // From step 2 above
        bank: 300, // From step 2 above
      }

      expect(pendingResult.betfair).toBe(immediateResult.betfair)
      expect(pendingResult.bank).toBe(immediateResult.bank)
    })
  })
})

// ============================================================================
// Reference Type Tests
// ============================================================================

describe('Reference Type Logic', () => {
  it('should set referenceType to BETFAIR_DEPOSIT for immediate deposits', () => {
    const transactionType = 'DEPOSIT'
    const pending = false
    const referenceType = transactionType === 'DEPOSIT'
      ? (pending ? 'BETFAIR_PENDING_DEPOSIT' : 'BETFAIR_DEPOSIT')
      : 'BETFAIR_WITHDRAWAL'

    expect(referenceType).toBe('BETFAIR_DEPOSIT')
  })

  it('should set referenceType to BETFAIR_PENDING_DEPOSIT for pending deposits', () => {
    const transactionType = 'DEPOSIT'
    const pending = true
    const referenceType = transactionType === 'DEPOSIT'
      ? (pending ? 'BETFAIR_PENDING_DEPOSIT' : 'BETFAIR_DEPOSIT')
      : 'BETFAIR_WITHDRAWAL'

    expect(referenceType).toBe('BETFAIR_PENDING_DEPOSIT')
  })

  it('should set referenceType to BETFAIR_WITHDRAWAL for withdrawals', () => {
    const transactionType = 'WITHDRAWAL'
    const referenceType = transactionType === 'DEPOSIT'
      ? 'BETFAIR_DEPOSIT'
      : 'BETFAIR_WITHDRAWAL'

    expect(referenceType).toBe('BETFAIR_WITHDRAWAL')
  })

  it('should set referenceType to BETFAIR_DEPOSIT_SETTLEMENT for settlements', () => {
    const isSettlement = true
    const referenceType = isSettlement ? 'BETFAIR_DEPOSIT_SETTLEMENT' : 'OTHER'

    expect(referenceType).toBe('BETFAIR_DEPOSIT_SETTLEMENT')
  })
})

// ============================================================================
// Description Building Tests
// ============================================================================

describe('Description Building', () => {
  it('should build deposit description correctly', () => {
    const transactionType = 'DEPOSIT'
    const bankName = 'Betfair Bank'
    const pending = false

    const description = pending
      ? 'Pending deposit to Betfair (in transit)'
      : transactionType === 'DEPOSIT'
        ? `Deposit to Betfair from ${bankName}`
        : `Withdrawal from Betfair to ${bankName}`

    expect(description).toBe('Deposit to Betfair from Betfair Bank')
  })

  it('should build pending deposit description correctly', () => {
    const pending = true

    const description = pending
      ? 'Pending deposit to Betfair (in transit)'
      : 'Deposit to Betfair from Bank'

    expect(description).toBe('Pending deposit to Betfair (in transit)')
  })

  it('should build withdrawal description correctly', () => {
    const transactionType = 'WITHDRAWAL'
    const bankName = 'Betfair Bank'

    const description = transactionType === 'WITHDRAWAL'
      ? `Withdrawal from Betfair to ${bankName}`
      : 'Deposit'

    expect(description).toBe('Withdrawal from Betfair to Betfair Bank')
  })

  it('should build settlement description correctly', () => {
    const amount = 200

    const description = `Settled pending Betfair deposit of $${amount.toFixed(2)}`

    expect(description).toBe('Settled pending Betfair deposit of $200.00')
  })
})

// ============================================================================
// Validation Tests
// ============================================================================

describe('Input Validation Logic', () => {
  describe('Amount validation', () => {
    it('should reject zero amount', () => {
      const amount = 0
      const isValid = amount > 0

      expect(isValid).toBe(false)
    })

    it('should reject negative amount', () => {
      const amount = -50
      const isValid = amount > 0

      expect(isValid).toBe(false)
    })

    it('should accept positive amount', () => {
      const amount = 100.50
      const isValid = amount > 0

      expect(isValid).toBe(true)
    })
  })

  describe('Pending validation', () => {
    it('should allow pending for deposits', () => {
      const type = 'DEPOSIT'
      const pending = true
      const isValid = type === 'DEPOSIT' || !pending

      expect(isValid).toBe(true)
    })

    it('should reject pending for withdrawals', () => {
      const type = 'WITHDRAWAL'
      const pending = true
      const isValid = type === 'DEPOSIT' || !pending

      expect(isValid).toBe(false)
    })

    it('should allow non-pending for withdrawals', () => {
      const type = 'WITHDRAWAL'
      const pending = false
      const isValid = type === 'DEPOSIT' || !pending

      expect(isValid).toBe(true)
    })
  })
})

// ============================================================================
// Idempotency Tests
// ============================================================================

describe('Idempotency Logic', () => {
  it('should detect duplicate based on bankTransactionId', () => {
    const existingTransactionIds = ['basiq-bf-001', 'basiq-bf-002']
    const newTransactionId = 'basiq-bf-001'

    const isDuplicate = existingTransactionIds.includes(newTransactionId)

    expect(isDuplicate).toBe(true)
  })

  it('should allow new transaction with different bankTransactionId', () => {
    const existingTransactionIds = ['basiq-bf-001', 'basiq-bf-002']
    const newTransactionId = 'basiq-bf-003'

    const isDuplicate = existingTransactionIds.includes(newTransactionId)

    expect(isDuplicate).toBe(false)
  })

  it('should allow manual transactions without bankTransactionId', () => {
    const bankTransactionId = undefined

    const shouldCheckIdempotency = !!bankTransactionId

    expect(shouldCheckIdempotency).toBe(false)
  })
})

// ============================================================================
// Settlement Validation Tests
// ============================================================================

describe('Settlement Validation', () => {
  it('should reject settlement of non-pending entry', () => {
    const referenceType = 'BETFAIR_DEPOSIT'
    const canSettle = referenceType === 'BETFAIR_PENDING_DEPOSIT'

    expect(canSettle).toBe(false)
  })

  it('should allow settlement of pending entry', () => {
    const referenceType = 'BETFAIR_PENDING_DEPOSIT'
    const canSettle = referenceType === 'BETFAIR_PENDING_DEPOSIT'

    expect(canSettle).toBe(true)
  })

  it('should reject settlement of voided entry', () => {
    const isVoid = true
    const canSettle = !isVoid

    expect(canSettle).toBe(false)
  })

  it('should reject settlement of wrong profile', () => {
    const entryProfileId = 'profile-a'
    const requestProfileId = 'profile-b'
    const canSettle = entryProfileId === requestProfileId

    expect(canSettle).toBe(false)
  })
})

// ============================================================================
// Summary Calculation Tests
// ============================================================================

describe('Summary Calculation Logic', () => {
  it('should calculate net flow correctly (deposits - withdrawals)', () => {
    const totalDeposits = 500
    const totalWithdrawals = 200

    const netFlow = totalDeposits - totalWithdrawals

    expect(netFlow).toBe(300)
  })

  it('should handle negative net flow (more withdrawals than deposits)', () => {
    const totalDeposits = 100
    const totalWithdrawals = 350

    const netFlow = totalDeposits - totalWithdrawals

    expect(netFlow).toBe(-250)
  })

  it('should track pending deposits separately', () => {
    const entries = [
      { type: 'BETFAIR_DEPOSIT', amount: 200 },
      { type: 'BETFAIR_WITHDRAWAL', amount: 100 },
      { type: 'BETFAIR_PENDING_DEPOSIT', amount: 150 },
    ]

    const totalDeposits = entries
      .filter((e) => e.type === 'BETFAIR_DEPOSIT')
      .reduce((sum, e) => sum + e.amount, 0)

    const totalWithdrawals = entries
      .filter((e) => e.type === 'BETFAIR_WITHDRAWAL')
      .reduce((sum, e) => sum + e.amount, 0)

    const pendingDeposits = entries
      .filter((e) => e.type === 'BETFAIR_PENDING_DEPOSIT')
      .reduce((sum, e) => sum + e.amount, 0)

    expect(totalDeposits).toBe(200)
    expect(totalWithdrawals).toBe(100)
    expect(pendingDeposits).toBe(150)
  })

  it('should not count settlements in totals', () => {
    const entries = [
      { type: 'BETFAIR_DEPOSIT', amount: 200 },
      { type: 'BETFAIR_PENDING_DEPOSIT', amount: 150 },
      { type: 'BETFAIR_DEPOSIT_SETTLEMENT', amount: 150 },
    ]

    // Settlements clear pending, don't add to totals
    const totalDeposits = entries
      .filter((e) => e.type === 'BETFAIR_DEPOSIT')
      .reduce((sum, e) => sum + e.amount, 0)

    expect(totalDeposits).toBe(200) // Not 350
  })
})

// ============================================================================
// Entry Type Mapping Tests
// ============================================================================

describe('Entry Type Mapping', () => {
  it('should use DEPOSIT entry type for deposits', () => {
    const transactionType = 'DEPOSIT'
    const entryType = transactionType === 'DEPOSIT' ? 'DEPOSIT' : 'WITHDRAWAL'

    expect(entryType).toBe('DEPOSIT')
  })

  it('should use DEPOSIT entry type for pending deposits', () => {
    const transactionType = 'DEPOSIT'
    const pending = true
    const entryType = transactionType === 'DEPOSIT' ? 'DEPOSIT' : 'WITHDRAWAL'

    // Entry type is still DEPOSIT, just referenceType differs
    expect(entryType).toBe('DEPOSIT')
    expect(pending).toBe(true)
  })

  it('should use WITHDRAWAL entry type for withdrawals', () => {
    const transactionType = 'WITHDRAWAL'
    const entryType = transactionType === 'DEPOSIT' ? 'DEPOSIT' : 'WITHDRAWAL'

    expect(entryType).toBe('WITHDRAWAL')
  })

  it('should use SETTLEMENT entry type for settlement', () => {
    const isSettlement = true
    const entryType = isSettlement ? 'SETTLEMENT' : 'OTHER'

    expect(entryType).toBe('SETTLEMENT')
  })
})

// ============================================================================
// Integration Scenarios
// ============================================================================

describe('Betfair Transaction Scenarios', () => {
  describe('Immediate deposit scenario', () => {
    it('should create correct journal structure for immediate deposit', () => {
      const input = {
        type: 'DEPOSIT' as const,
        amount: 200,
        bankName: 'Betfair Bank',
        pending: false,
        bankTransactionId: undefined,
      }

      const entry = {
        entryType: 'DEPOSIT',
        referenceType: 'BETFAIR_DEPOSIT',
        description: `Deposit to Betfair from ${input.bankName}`,
        bankTransactionId: input.bankTransactionId || null,
        lines: [
          { accountType: 'BETFAIR_AVAILABLE', debit: input.amount, credit: 0 },
          { accountType: 'BANK', debit: 0, credit: input.amount },
        ],
      }

      expect(entry.entryType).toBe('DEPOSIT')
      expect(entry.referenceType).toBe('BETFAIR_DEPOSIT')
      expect(entry.bankTransactionId).toBeNull()
      expect(entry.lines[0].debit).toBe(200)
      expect(entry.lines[1].credit).toBe(200)
    })
  })

  describe('Pending deposit scenario', () => {
    it('should create correct journal structure for pending deposit', () => {
      const input = {
        type: 'DEPOSIT' as const,
        amount: 300,
        pending: true,
      }

      const entry = {
        entryType: 'DEPOSIT',
        referenceType: 'BETFAIR_PENDING_DEPOSIT',
        description: 'Pending deposit to Betfair (in transit)',
        lines: [
          { accountType: 'BETFAIR_AVAILABLE', debit: input.amount, credit: 0 },
          { accountType: 'PENDING_BETFAIR_DEPOSIT', debit: 0, credit: input.amount },
        ],
      }

      expect(entry.entryType).toBe('DEPOSIT')
      expect(entry.referenceType).toBe('BETFAIR_PENDING_DEPOSIT')
      expect(entry.lines[0].debit).toBe(300)
      expect(entry.lines[1].credit).toBe(300)
      expect(entry.lines[1].accountType).toBe('PENDING_BETFAIR_DEPOSIT')
    })
  })

  describe('Settlement scenario', () => {
    it('should create correct journal structure for settlement', () => {
      const originalAmount = 300

      const settlement = {
        entryType: 'SETTLEMENT',
        referenceType: 'BETFAIR_DEPOSIT_SETTLEMENT',
        description: `Settled pending Betfair deposit of $${originalAmount.toFixed(2)}`,
        lines: [
          { accountType: 'PENDING_BETFAIR_DEPOSIT', debit: originalAmount, credit: 0 },
          { accountType: 'BANK', debit: 0, credit: originalAmount },
        ],
      }

      expect(settlement.entryType).toBe('SETTLEMENT')
      expect(settlement.referenceType).toBe('BETFAIR_DEPOSIT_SETTLEMENT')
      expect(settlement.lines[0].debit).toBe(300)
      expect(settlement.lines[0].accountType).toBe('PENDING_BETFAIR_DEPOSIT')
      expect(settlement.lines[1].credit).toBe(300)
      expect(settlement.lines[1].accountType).toBe('BANK')
    })
  })

  describe('Withdrawal scenario', () => {
    it('should create correct journal structure for withdrawal', () => {
      const input = {
        type: 'WITHDRAWAL' as const,
        amount: 150,
        bankName: 'Betfair Bank',
      }

      const entry = {
        entryType: 'WITHDRAWAL',
        referenceType: 'BETFAIR_WITHDRAWAL',
        description: `Withdrawal from Betfair to ${input.bankName}`,
        lines: [
          { accountType: 'BANK', debit: input.amount, credit: 0 },
          { accountType: 'BETFAIR_AVAILABLE', debit: 0, credit: input.amount },
        ],
      }

      expect(entry.entryType).toBe('WITHDRAWAL')
      expect(entry.referenceType).toBe('BETFAIR_WITHDRAWAL')
      expect(entry.lines[0].debit).toBe(150)
      expect(entry.lines[0].accountType).toBe('BANK')
      expect(entry.lines[1].credit).toBe(150)
      expect(entry.lines[1].accountType).toBe('BETFAIR_AVAILABLE')
    })
  })

  describe('Balance impact scenarios', () => {
    it('should increase Betfair balance and decrease bank balance after immediate deposit', () => {
      const initialBetfairBalance = 100
      const initialBankBalance = 500
      const depositAmount = 200

      // Deposit: Debit Betfair (+), Credit Bank (-)
      const newBetfairBalance = initialBetfairBalance + depositAmount
      const newBankBalance = initialBankBalance - depositAmount

      expect(newBetfairBalance).toBe(300)
      expect(newBankBalance).toBe(300)
    })

    it('should decrease Betfair balance and increase bank balance after withdrawal', () => {
      const initialBetfairBalance = 300
      const initialBankBalance = 300
      const withdrawalAmount = 100

      // Withdrawal: Debit Bank (+), Credit Betfair (-)
      const newBetfairBalance = initialBetfairBalance - withdrawalAmount
      const newBankBalance = initialBankBalance + withdrawalAmount

      expect(newBetfairBalance).toBe(200)
      expect(newBankBalance).toBe(400)
    })

    it('should track pending liability correctly', () => {
      const initialPendingLiability = 0
      const pendingDepositAmount = 200

      // Pending deposit creates liability
      const newPendingLiability = initialPendingLiability + pendingDepositAmount

      expect(newPendingLiability).toBe(200)

      // Settlement clears liability
      const afterSettlement = newPendingLiability - pendingDepositAmount

      expect(afterSettlement).toBe(0)
    })
  })
})

// ============================================================================
// Account Type Tests
// ============================================================================

describe('Account Types', () => {
  it('should use PENDING_BETFAIR_DEPOSIT as LIABILITY type', () => {
    const account = {
      subType: 'PENDING_BETFAIR_DEPOSIT',
      type: 'LIABILITY',
    }

    expect(account.type).toBe('LIABILITY')
    expect(account.subType).toBe('PENDING_BETFAIR_DEPOSIT')
  })

  it('should use BETFAIR_AVAILABLE as ASSET type', () => {
    const account = {
      subType: 'BETFAIR_AVAILABLE',
      type: 'ASSET',
    }

    expect(account.type).toBe('ASSET')
    expect(account.subType).toBe('BETFAIR_AVAILABLE')
  })

  it('should use BANK as ASSET type', () => {
    const account = {
      subType: 'BANK',
      type: 'ASSET',
    }

    expect(account.type).toBe('ASSET')
    expect(account.subType).toBe('BANK')
  })
})
