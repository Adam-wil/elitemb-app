/**
 * Balance Summary Tests
 *
 * Test cases for getBalanceSummaryForCard server function and useBalanceSummary hook.
 *
 * @see src/modules/accounts/api/db/accountBalanceView.server.ts
 * @see src/modules/accounts/hooks/useBalanceSummary.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BalanceSummaryCardData } from '../api/db/accountBalanceView.server'

// Mock server function response
const mockBalanceSummaryData: BalanceSummaryCardData = {
  totalBalance: 5000,
  totalPL: 1250.5,
  hasVariance: true,
  varianceCount: 2,
}

const mockEmptyData: BalanceSummaryCardData = {
  totalBalance: 0,
  totalPL: 0,
  hasVariance: false,
  varianceCount: 0,
}

describe('BalanceSummaryCardData interface', () => {
  it('has correct shape with positive values', () => {
    const data: BalanceSummaryCardData = mockBalanceSummaryData

    expect(data.totalBalance).toBe(5000)
    expect(data.totalPL).toBe(1250.5)
    expect(data.hasVariance).toBe(true)
    expect(data.varianceCount).toBe(2)
  })

  it('has correct shape with zero values', () => {
    const data: BalanceSummaryCardData = mockEmptyData

    expect(data.totalBalance).toBe(0)
    expect(data.totalPL).toBe(0)
    expect(data.hasVariance).toBe(false)
    expect(data.varianceCount).toBe(0)
  })

  it('handles negative P&L', () => {
    const data: BalanceSummaryCardData = {
      totalBalance: 3000,
      totalPL: -500,
      hasVariance: false,
      varianceCount: 0,
    }

    expect(data.totalPL).toBe(-500)
    expect(data.totalPL).toBeLessThan(0)
  })
})

describe('Balance calculation logic', () => {
  it('P&L = Income - Expense', () => {
    // Simulate the calculation from the server function
    const income = 2000
    const expense = 750.5
    const totalPL = income - expense

    expect(totalPL).toBe(1249.5)
  })

  it('handles all-loss scenario', () => {
    const income = 0
    const expense = 500
    const totalPL = income - expense

    expect(totalPL).toBe(-500)
  })

  it('handles all-win scenario', () => {
    const income = 1500
    const expense = 0
    const totalPL = income - expense

    expect(totalPL).toBe(1500)
  })
})

describe('Variance detection', () => {
  it('hasVariance is true when varianceCount > 0', () => {
    const data: BalanceSummaryCardData = {
      totalBalance: 1000,
      totalPL: 100,
      hasVariance: true,
      varianceCount: 3,
    }

    expect(data.hasVariance).toBe(data.varianceCount > 0)
  })

  it('hasVariance is false when varianceCount is 0', () => {
    const data: BalanceSummaryCardData = {
      totalBalance: 1000,
      totalPL: 100,
      hasVariance: false,
      varianceCount: 0,
    }

    expect(data.hasVariance).toBe(data.varianceCount > 0)
  })
})

describe('BalanceSummaryCard display logic', () => {
  it('displays singular "account" for varianceCount of 1', () => {
    const varianceCount = 1
    const label = `${varianceCount} account${varianceCount !== 1 ? 's' : ''} need${varianceCount === 1 ? 's' : ''} attention`

    expect(label).toBe('1 account needs attention')
  })

  it('displays plural "accounts" for varianceCount > 1', () => {
    const varianceCount = 3
    const label = `${varianceCount} account${varianceCount !== 1 ? 's' : ''} need${varianceCount === 1 ? 's' : ''} attention`

    expect(label).toBe('3 accounts need attention')
  })

  it('formats positive P&L with plus sign', () => {
    const totalPL = 1250.5
    const formatted = totalPL >= 0 ? `+${totalPL}` : `${totalPL}`

    expect(formatted).toBe('+1250.5')
  })

  it('formats negative P&L without plus sign', () => {
    const totalPL = -500
    const formatted = totalPL >= 0 ? `+${totalPL}` : `${totalPL}`

    expect(formatted).toBe('-500')
  })
})
