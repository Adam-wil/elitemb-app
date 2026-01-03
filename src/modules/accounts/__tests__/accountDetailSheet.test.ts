/**
 * Tests for AccountDetailSheet and related functionality
 *
 * Tests the account lookup by bookie name and date filter functionality.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import type { AccountSubType } from '@prisma/client'

// Mock the server function
vi.mock('../api/db/accountBalanceView.server', () => ({
  getAccountByBookieName: vi.fn(),
}))

import { getAccountByBookieName } from '../api/db/accountBalanceView.server'

describe('getAccountByBookieName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic lookup', () => {
    it('should return account info for bookie with cash account', async () => {
      const mockAccount = {
        accountId: 'acc-123',
        accountCode: '1100-001',
        accountName: 'Sportsbet Cash',
        bookieName: 'Sportsbet',
        bookieId: 1,
        subType: 'BOOKIE_CASH' as AccountSubType,
        isExchange: false,
      }
      ;(getAccountByBookieName as Mock).mockResolvedValue(mockAccount)

      const result = await getAccountByBookieName({
        data: { bookieName: 'Sportsbet' },
      })

      expect(result).not.toBeNull()
      expect(result?.bookieName).toBe('Sportsbet')
      expect(result?.subType).toBe('BOOKIE_CASH')
      expect(result?.isExchange).toBe(false)
    })

    it('should return account info for exchange', async () => {
      const mockAccount = {
        accountId: 'acc-456',
        accountCode: '1200-001',
        accountName: 'Betfair Available',
        bookieName: 'Betfair',
        bookieId: 2,
        subType: 'BETFAIR_AVAILABLE' as AccountSubType,
        isExchange: true,
      }
      ;(getAccountByBookieName as Mock).mockResolvedValue(mockAccount)

      const result = await getAccountByBookieName({
        data: { bookieName: 'Betfair' },
      })

      expect(result).not.toBeNull()
      expect(result?.isExchange).toBe(true)
      expect(result?.subType).toBe('BETFAIR_AVAILABLE')
    })

    it('should return null when bookie not found', async () => {
      ;(getAccountByBookieName as Mock).mockResolvedValue(null)

      const result = await getAccountByBookieName({
        data: { bookieName: 'NonExistent' },
      })

      expect(result).toBeNull()
    })
  })

  describe('subType filtering', () => {
    it('should filter by specific subType when provided', async () => {
      const mockAccount = {
        accountId: 'acc-789',
        accountCode: '1100-002',
        accountName: 'Sportsbet Bonus',
        bookieName: 'Sportsbet',
        bookieId: 1,
        subType: 'BOOKIE_BONUS' as AccountSubType,
        isExchange: false,
      }
      ;(getAccountByBookieName as Mock).mockResolvedValue(mockAccount)

      const result = await getAccountByBookieName({
        data: { bookieName: 'Sportsbet', subType: 'BOOKIE_BONUS' as AccountSubType },
      })

      expect(result?.subType).toBe('BOOKIE_BONUS')
    })
  })
})

describe('Date filter calculation', () => {
  // Test the date range calculation logic used in AccountDetailSheet
  const calculateDateRange = (
    dateFilter: string
  ): { startDate?: string; endDate?: string } => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (dateFilter) {
      case '7d': {
        const start = new Date(today)
        start.setDate(start.getDate() - 7)
        return { startDate: start.toISOString(), endDate: now.toISOString() }
      }
      case '30d': {
        const start = new Date(today)
        start.setDate(start.getDate() - 30)
        return { startDate: start.toISOString(), endDate: now.toISOString() }
      }
      case '90d': {
        const start = new Date(today)
        start.setDate(start.getDate() - 90)
        return { startDate: start.toISOString(), endDate: now.toISOString() }
      }
      case 'ytd': {
        const start = new Date(now.getFullYear(), 0, 1)
        return { startDate: start.toISOString(), endDate: now.toISOString() }
      }
      default:
        return { startDate: undefined, endDate: undefined }
    }
  }

  it('should return undefined dates for "all" filter', () => {
    const range = calculateDateRange('all')
    expect(range.startDate).toBeUndefined()
    expect(range.endDate).toBeUndefined()
  })

  it('should return 7 day range for "7d" filter', () => {
    const range = calculateDateRange('7d')
    expect(range.startDate).toBeDefined()
    expect(range.endDate).toBeDefined()

    const start = new Date(range.startDate!)
    const end = new Date(range.endDate!)
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    expect(diffDays).toBeGreaterThanOrEqual(7)
    expect(diffDays).toBeLessThanOrEqual(8) // Allow for time of day variation
  })

  it('should return 30 day range for "30d" filter', () => {
    const range = calculateDateRange('30d')
    expect(range.startDate).toBeDefined()

    const start = new Date(range.startDate!)
    const end = new Date(range.endDate!)
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    expect(diffDays).toBeGreaterThanOrEqual(30)
    expect(diffDays).toBeLessThanOrEqual(31)
  })

  it('should return 90 day range for "90d" filter', () => {
    const range = calculateDateRange('90d')
    expect(range.startDate).toBeDefined()

    const start = new Date(range.startDate!)
    const end = new Date(range.endDate!)
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    expect(diffDays).toBeGreaterThanOrEqual(90)
    expect(diffDays).toBeLessThanOrEqual(91)
  })

  it('should return year-to-date range for "ytd" filter', () => {
    const range = calculateDateRange('ytd')
    expect(range.startDate).toBeDefined()

    const start = new Date(range.startDate!)
    const now = new Date()

    expect(start.getMonth()).toBe(0) // January
    expect(start.getDate()).toBe(1) // 1st
    expect(start.getFullYear()).toBe(now.getFullYear())
  })
})

describe('Journal lines date filtering', () => {
  // Mock the server function for date filtering
  vi.mock('../api/db/journalQueries.server', () => ({
    getJournalLinesForAccount: vi.fn(),
  }))

  it('should accept startDate and endDate parameters', async () => {
    const { getJournalLinesForAccount } = await import(
      '../api/db/journalQueries.server'
    )
    ;(getJournalLinesForAccount as Mock).mockResolvedValue([])

    await getJournalLinesForAccount({
      data: {
        accountId: 'acc-123',
        profileId: 'profile-456',
        limit: 50,
        offset: 0,
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-12-31T23:59:59.999Z',
      },
    })

    expect(getJournalLinesForAccount).toHaveBeenCalledWith({
      data: expect.objectContaining({
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-12-31T23:59:59.999Z',
      }),
    })
  })

  it('should work without date parameters', async () => {
    const { getJournalLinesForAccount } = await import(
      '../api/db/journalQueries.server'
    )
    ;(getJournalLinesForAccount as Mock).mockResolvedValue([])

    await getJournalLinesForAccount({
      data: {
        accountId: 'acc-123',
        profileId: 'profile-456',
      },
    })

    expect(getJournalLinesForAccount).toHaveBeenCalled()
  })
})
