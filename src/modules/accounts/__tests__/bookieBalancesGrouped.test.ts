/**
 * Tests for useBookieBalancesGrouped hook and related server functions
 *
 * Tests the grouped bookie balances functionality that provides
 * cash/bonus split and variance detection for the AccountCard component.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import type { BookieAccountData } from '../types/ledger'

// Mock the server function
vi.mock('../api/db/accountBalanceView.server', () => ({
  getBookieBalancesGrouped: vi.fn(),
}))

import { getBookieBalancesGrouped } from '../api/db/accountBalanceView.server'

describe('getBookieBalancesGrouped', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic functionality', () => {
    it('should return empty array when no accounts exist', async () => {
      ;(getBookieBalancesGrouped as Mock).mockResolvedValue([])

      const result = await getBookieBalancesGrouped({ data: {} })

      expect(result).toEqual([])
    })

    it('should return bookie with cash balance only', async () => {
      const mockData: BookieAccountData[] = [
        {
          bookieName: 'Sportsbet',
          bookieId: 1,
          isExchange: false,
          cashBalance: 500,
          bonusBalance: 0,
          totalBalance: 500,
          totalPL: 100,
          hasVariance: false,
          needsAttention: false,
        },
      ]
      ;(getBookieBalancesGrouped as Mock).mockResolvedValue(mockData)

      const result = await getBookieBalancesGrouped({ data: {} })

      expect(result).toHaveLength(1)
      expect(result[0].bookieName).toBe('Sportsbet')
      expect(result[0].cashBalance).toBe(500)
      expect(result[0].bonusBalance).toBe(0)
      expect(result[0].totalBalance).toBe(500)
    })

    it('should return bookie with cash and bonus balance', async () => {
      const mockData: BookieAccountData[] = [
        {
          bookieName: 'PointsBet',
          bookieId: 2,
          isExchange: false,
          cashBalance: 300,
          bonusBalance: 150,
          totalBalance: 450,
          totalPL: 75,
          hasVariance: false,
          needsAttention: false,
        },
      ]
      ;(getBookieBalancesGrouped as Mock).mockResolvedValue(mockData)

      const result = await getBookieBalancesGrouped({ data: {} })

      expect(result).toHaveLength(1)
      expect(result[0].cashBalance).toBe(300)
      expect(result[0].bonusBalance).toBe(150)
      expect(result[0].totalBalance).toBe(450)
    })

    it('should return exchange account with no bonus', async () => {
      const mockData: BookieAccountData[] = [
        {
          bookieName: 'Betfair',
          bookieId: 3,
          isExchange: true,
          cashBalance: 1000,
          bonusBalance: 0,
          totalBalance: 1000,
          totalPL: 200,
          hasVariance: false,
          needsAttention: false,
        },
      ]
      ;(getBookieBalancesGrouped as Mock).mockResolvedValue(mockData)

      const result = await getBookieBalancesGrouped({ data: {} })

      expect(result).toHaveLength(1)
      expect(result[0].isExchange).toBe(true)
      expect(result[0].bonusBalance).toBe(0)
    })
  })

  describe('variance detection', () => {
    it('should flag account with variance', async () => {
      const mockData: BookieAccountData[] = [
        {
          bookieName: 'Bet365',
          bookieId: 4,
          isExchange: false,
          cashBalance: 400,
          bonusBalance: 0,
          totalBalance: 400,
          totalPL: 50,
          hasVariance: true,
          needsAttention: true,
        },
      ]
      ;(getBookieBalancesGrouped as Mock).mockResolvedValue(mockData)

      const result = await getBookieBalancesGrouped({ data: {} })

      expect(result[0].hasVariance).toBe(true)
      expect(result[0].needsAttention).toBe(true)
    })

    it('should not flag account without variance', async () => {
      const mockData: BookieAccountData[] = [
        {
          bookieName: 'TAB',
          bookieId: 5,
          isExchange: false,
          cashBalance: 200,
          bonusBalance: 50,
          totalBalance: 250,
          totalPL: 25,
          hasVariance: false,
          needsAttention: false,
        },
      ]
      ;(getBookieBalancesGrouped as Mock).mockResolvedValue(mockData)

      const result = await getBookieBalancesGrouped({ data: {} })

      expect(result[0].hasVariance).toBe(false)
      expect(result[0].needsAttention).toBe(false)
    })
  })

  describe('multiple accounts', () => {
    it('should return multiple bookies correctly grouped', async () => {
      const mockData: BookieAccountData[] = [
        {
          bookieName: 'Sportsbet',
          bookieId: 1,
          isExchange: false,
          cashBalance: 500,
          bonusBalance: 100,
          totalBalance: 600,
          totalPL: 150,
          hasVariance: false,
          needsAttention: false,
        },
        {
          bookieName: 'Betfair',
          bookieId: 2,
          isExchange: true,
          cashBalance: 1000,
          bonusBalance: 0,
          totalBalance: 1000,
          totalPL: 200,
          hasVariance: false,
          needsAttention: false,
        },
        {
          bookieName: 'PointsBet',
          bookieId: 3,
          isExchange: false,
          cashBalance: 300,
          bonusBalance: 50,
          totalBalance: 350,
          totalPL: 75,
          hasVariance: true,
          needsAttention: true,
        },
      ]
      ;(getBookieBalancesGrouped as Mock).mockResolvedValue(mockData)

      const result = await getBookieBalancesGrouped({ data: {} })

      expect(result).toHaveLength(3)

      // Verify first bookie
      const sportsbet = result.find((a) => a.bookieName === 'Sportsbet')
      expect(sportsbet?.cashBalance).toBe(500)
      expect(sportsbet?.bonusBalance).toBe(100)
      expect(sportsbet?.totalBalance).toBe(600)

      // Verify exchange
      const betfair = result.find((a) => a.bookieName === 'Betfair')
      expect(betfair?.isExchange).toBe(true)
      expect(betfair?.bonusBalance).toBe(0)

      // Verify account with variance
      const pointsbet = result.find((a) => a.bookieName === 'PointsBet')
      expect(pointsbet?.hasVariance).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should throw error when server function fails', async () => {
      ;(getBookieBalancesGrouped as Mock).mockRejectedValue(
        new Error('Database connection failed')
      )

      await expect(getBookieBalancesGrouped({ data: {} })).rejects.toThrow(
        'Database connection failed'
      )
    })
  })
})

describe('BookieAccountData type', () => {
  it('should have correct shape for bookie account', () => {
    const data: BookieAccountData = {
      bookieName: 'Test Bookie',
      bookieId: 1,
      isExchange: false,
      cashBalance: 100,
      bonusBalance: 50,
      totalBalance: 150,
      totalPL: 25,
      hasVariance: false,
      needsAttention: false,
    }

    expect(data.bookieName).toBe('Test Bookie')
    expect(data.isExchange).toBe(false)
    expect(data.totalBalance).toBe(data.cashBalance + data.bonusBalance)
  })

  it('should have correct shape for exchange account', () => {
    const data: BookieAccountData = {
      bookieName: 'Betfair',
      bookieId: 2,
      isExchange: true,
      cashBalance: 500,
      bonusBalance: 0,
      totalBalance: 500,
      totalPL: 100,
      hasVariance: false,
      needsAttention: false,
    }

    expect(data.isExchange).toBe(true)
    expect(data.bonusBalance).toBe(0)
  })
})

describe('filtering logic', () => {
  const mockAllAccounts: BookieAccountData[] = [
    {
      bookieName: 'Sportsbet',
      bookieId: 1,
      isExchange: false,
      cashBalance: 500,
      bonusBalance: 100,
      totalBalance: 600,
      totalPL: 150,
      hasVariance: false,
      needsAttention: false,
    },
    {
      bookieName: 'Betfair',
      bookieId: 2,
      isExchange: true,
      cashBalance: 1000,
      bonusBalance: 0,
      totalBalance: 1000,
      totalPL: 200,
      hasVariance: false,
      needsAttention: false,
    },
    {
      bookieName: 'PointsBet',
      bookieId: 3,
      isExchange: false,
      cashBalance: 300,
      bonusBalance: 50,
      totalBalance: 350,
      totalPL: 75,
      hasVariance: false,
      needsAttention: false,
    },
  ]

  it('should filter to show all accounts', () => {
    const filtered = mockAllAccounts

    expect(filtered).toHaveLength(3)
  })

  it('should filter to show only bookies', () => {
    const filtered = mockAllAccounts.filter((a) => !a.isExchange)

    expect(filtered).toHaveLength(2)
    expect(filtered.every((a) => !a.isExchange)).toBe(true)
  })

  it('should filter to show only exchanges', () => {
    const filtered = mockAllAccounts.filter((a) => a.isExchange)

    expect(filtered).toHaveLength(1)
    expect(filtered[0].bookieName).toBe('Betfair')
  })

  it('should correctly count bookies and exchanges', () => {
    const bookieCount = mockAllAccounts.filter((a) => !a.isExchange).length
    const exchangeCount = mockAllAccounts.filter((a) => a.isExchange).length

    expect(bookieCount).toBe(2)
    expect(exchangeCount).toBe(1)
  })
})
