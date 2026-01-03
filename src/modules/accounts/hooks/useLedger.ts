/**
 * Account Ledger Hook
 *
 * Provides ledger entries, account balances, and summary data from the database.
 * Supports filtering by bookie, date range, and account type.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  LedgerEntry,
  AccountBalance,
  LedgerSummary,
  LedgerFilters,
  AccountFilter,
} from '../types/ledger'
import {
  getLedgerEntries,
  getLedgerEntriesByBookie,
  getAccountBalances,
  getAccountBalance,
  getLedgerSummary,
  setBalanceOverride as setBalanceOverrideServer,
  clearBalanceOverride as clearBalanceOverrideServer,
  recalculateBalance as recalculateBalanceServer,
  createLedgerEntry as createLedgerEntryServer,
} from '../api/db/ledgerDb.server'
import {
  adjustBalanceByBookie,
  type AdjustBalanceResult,
} from '../api/db/journalService.server'

// ============================================================================
// Types
// ============================================================================

export interface UseLedgerOptions {
  /** Filter by bookie name */
  bookieName?: string
  /** Filter by date range */
  dateRange?: { start: string; end: string }
  /** Filter by account type */
  accountFilter?: AccountFilter
  /** Auto-refresh interval in ms (0 to disable) */
  refreshInterval?: number
}

export interface UseLedgerReturn {
  // Data
  entries: LedgerEntry[]
  balances: AccountBalance[]
  summary: LedgerSummary

  // Selected account
  selectedAccount: AccountBalance | null
  selectedEntries: LedgerEntry[]

  // Computed
  totalBalance: number
  totalPL: number
  bookieCount: number
  exchangeCount: number

  // State
  isLoading: boolean
  error: string | null

  // Actions
  refresh: () => Promise<void>
  selectAccount: (bookieName: string | null) => void
  adjustBalance: (bookieName: string, newBalance: number, reason: string) => Promise<AdjustBalanceResult>
  setOverride: (bookieName: string, value: number, reason: string) => Promise<void>
  clearOverride: (bookieName: string) => Promise<void>
  recalculateBalance: (bookieName: string) => Promise<void>
}

// Default empty summary
const defaultSummary: LedgerSummary = {
  totalDeposits: 0,
  totalWithdrawals: 0,
  totalWins: 0,
  totalLosses: 0,
  totalBonuses: 0,
  totalCommissions: 0,
  netPL: 0,
  currentBalance: 0,
  discrepancy: 0,
}

// ============================================================================
// Hook
// ============================================================================

export function useLedger(options: UseLedgerOptions = {}): UseLedgerReturn {
  const { bookieName, dateRange, accountFilter = 'all', refreshInterval = 0 } = options

  // Data state
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [balances, setBalances] = useState<AccountBalance[]>([])
  const [summary, setSummary] = useState<LedgerSummary>(defaultSummary)

  // Selected account state
  const [selectedBookieName, setSelectedBookieName] = useState<string | null>(null)
  const [selectedEntries, setSelectedEntries] = useState<LedgerEntry[]>([])

  // Loading and error state
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Build filters from options
   */
  const filters: LedgerFilters = useMemo(() => {
    const f: LedgerFilters = {}

    if (bookieName) {
      f.bookieName = bookieName
    }

    if (dateRange) {
      f.dateRange = dateRange
    }

    if (accountFilter === 'bookies') {
      f.isExchange = false
    } else if (accountFilter === 'exchange') {
      f.isExchange = true
    }

    return f
  }, [bookieName, dateRange, accountFilter])

  /**
   * Fetch all data from server
   */
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch entries, balances, and summary in parallel
      const [entriesResult, balancesResult, summaryResult] = await Promise.all([
        getLedgerEntries({ data: { filters } }),
        getAccountBalances({
          data: { isExchange: filters.isExchange },
        }),
        getLedgerSummary({
          data: { bookieName: filters.bookieName, dateRange: filters.dateRange },
        }),
      ])

      setEntries(entriesResult)
      setBalances(balancesResult)
      setSummary(summaryResult)
    } catch (err) {
      console.error('useLedger fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load ledger data')
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  /**
   * Fetch entries for selected account
   */
  const fetchSelectedEntries = useCallback(async () => {
    if (!selectedBookieName) {
      setSelectedEntries([])
      return
    }

    try {
      const result = await getLedgerEntriesByBookie({
        data: { bookieName: selectedBookieName, limit: 50 },
      })
      setSelectedEntries(result)
    } catch (err) {
      console.error('useLedger selected entries error:', err)
    }
  }, [selectedBookieName])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Fetch selected entries when selection changes
  useEffect(() => {
    fetchSelectedEntries()
  }, [fetchSelectedEntries])

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return

    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval, fetchData])

  /**
   * Get selected account balance
   */
  const selectedAccount = useMemo((): AccountBalance | null => {
    if (!selectedBookieName) return null
    return balances.find((b) => b.bookieName === selectedBookieName) || null
  }, [selectedBookieName, balances])

  /**
   * Compute totals
   */
  const totals = useMemo(() => {
    const filteredBalances =
      accountFilter === 'all'
        ? balances
        : balances.filter((b) =>
            accountFilter === 'exchange' ? b.isExchange : !b.isExchange
          )

    return {
      totalBalance: filteredBalances.reduce((sum, b) => {
        const balance = (b.isOverridden && typeof b.overrideValue === 'number') ? b.overrideValue : b.currentBalance
        return sum + balance
      }, 0),
      totalPL: filteredBalances.reduce((sum, b) => sum + b.totalPL, 0),
      bookieCount: balances.filter((b) => !b.isExchange).length,
      exchangeCount: balances.filter((b) => b.isExchange).length,
    }
  }, [balances, accountFilter])

  /**
   * Select an account to view details
   */
  const selectAccount = useCallback((name: string | null) => {
    setSelectedBookieName(name)
  }, [])

  /**
   * Adjust balance manually using journal system
   * Creates a proper double-entry ADJUSTMENT journal entry
   */
  const adjustBalance = useCallback(
    async (name: string, newBalance: number, reason: string) => {
      try {
        const result = await adjustBalanceByBookie({
          data: {
            profileId: '', // Server will use default profile
            bookieName: name,
            newBalance,
            reason,
          },
        })
        // Refresh data after adjustment
        await fetchData()
        if (selectedBookieName === name) {
          await fetchSelectedEntries()
        }
        return result
      } catch (err) {
        console.error('adjustBalance error:', err)
        throw err
      }
    },
    [fetchData, fetchSelectedEntries, selectedBookieName]
  )

  /**
   * Set manual balance override
   */
  const setOverride = useCallback(
    async (name: string, value: number, reason: string) => {
      try {
        await setBalanceOverrideServer({
          data: { bookieName: name, overrideValue: value, reason },
        })
        await fetchData()
      } catch (err) {
        console.error('setOverride error:', err)
        throw err
      }
    },
    [fetchData]
  )

  /**
   * Clear manual balance override
   */
  const clearOverride = useCallback(
    async (name: string) => {
      try {
        await clearBalanceOverrideServer({
          data: { bookieName: name },
        })
        await fetchData()
      } catch (err) {
        console.error('clearOverride error:', err)
        throw err
      }
    },
    [fetchData]
  )

  /**
   * Recalculate balance from entries
   */
  const recalculateBalanceFn = useCallback(
    async (name: string) => {
      try {
        await recalculateBalanceServer({
          data: { bookieName: name },
        })
        await fetchData()
        if (selectedBookieName === name) {
          await fetchSelectedEntries()
        }
      } catch (err) {
        console.error('recalculateBalance error:', err)
        throw err
      }
    },
    [fetchData, fetchSelectedEntries, selectedBookieName]
  )

  return {
    // Data
    entries,
    balances,
    summary,

    // Selected account
    selectedAccount,
    selectedEntries,

    // Computed
    ...totals,

    // State
    isLoading,
    error,

    // Actions
    refresh: fetchData,
    selectAccount,
    adjustBalance,
    setOverride,
    clearOverride,
    recalculateBalance: recalculateBalanceFn,
  }
}

// ============================================================================
// Export createLedgerEntry for direct usage
// ============================================================================

export { createLedgerEntryServer as createLedgerEntry }
