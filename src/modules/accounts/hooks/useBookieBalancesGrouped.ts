/**
 * useBookieBalancesGrouped Hook
 *
 * Fetches bookie balances grouped by bookieName with cash/bonus split.
 * Uses AccountBalanceView to calculate balances from journal entries.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getBookieBalancesGrouped } from '../api/db/accountBalanceView.server'
import type { BookieAccountData } from '../types/ledger'
import { LARGE_VARIANCE_THRESHOLD } from '../types/ledger'

// ============================================================================
// Types
// ============================================================================

export interface UseBookieBalancesGroupedOptions {
  /** Optional profile ID (uses default if not provided) */
  profileId?: string
  /** Filter by account type */
  filter?: 'all' | 'bookies' | 'exchange' | 'attention'
  /** Auto-refresh interval in ms (0 to disable) */
  refreshInterval?: number
  /** Whether to enable fetching */
  enabled?: boolean
}

export interface UseBookieBalancesGroupedReturn {
  /** All bookie account data */
  accounts: BookieAccountData[]
  /** Filtered accounts based on filter option */
  filteredAccounts: BookieAccountData[]
  /** Count of bookie accounts */
  bookieCount: number
  /** Count of exchange accounts */
  exchangeCount: number
  /** Count of accounts with any variance (for attention filter) */
  attentionCount: number
  /** Count of accounts with large variance ($500+) for badge display */
  largeVarianceCount: number
  /** Total balance across all bookie accounts */
  bookieBalance: number
  /** Total balance across all exchange accounts */
  exchangeBalance: number
  /** Total P&L summed from all accounts */
  totalPL: number
  /** Loading state */
  isLoading: boolean
  /** Error message if failed */
  error: string | null
  /** Refetch data */
  refresh: () => Promise<void>
}

// ============================================================================
// Hook
// ============================================================================

export function useBookieBalancesGrouped(
  options: UseBookieBalancesGroupedOptions = {}
): UseBookieBalancesGroupedReturn {
  const { profileId, filter = 'all', refreshInterval = 0, enabled = true } = options

  const [accounts, setAccounts] = useState<BookieAccountData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch grouped bookie balances from server
   */
  const fetchData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getBookieBalancesGrouped({
        data: { profileId },
      })
      console.log('useBookieBalancesGrouped result:', result)
      setAccounts(result)
    } catch (err) {
      console.error('useBookieBalancesGrouped fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load bookie balances')
    } finally {
      setIsLoading(false)
    }
  }, [profileId, enabled])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval <= 0 || !enabled) return

    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval, enabled, fetchData])

  // Filter accounts based on filter option
  const filteredAccounts = useMemo(() => {
    switch (filter) {
      case 'bookies':
        return accounts.filter((a) => !a.isExchange)
      case 'exchange':
        return accounts.filter((a) => a.isExchange)
      case 'attention':
        // Reconcile tab shows ALL accounts so users can reconcile any of them
        // The difference from 'all' is the UI mode shown when clicking
        return accounts
      default:
        return accounts
    }
  }, [accounts, filter])

  // Count bookies, exchanges, variance accounts, and calculate balances
  const counts = useMemo(() => {
    const bookieAccounts = accounts.filter((a) => !a.isExchange)
    const exchangeAccounts = accounts.filter((a) => a.isExchange)

    const bookieCount = bookieAccounts.length
    const exchangeCount = exchangeAccounts.length

    // Sum balances
    const bookieBalance = bookieAccounts.reduce((sum, a) => sum + a.totalBalance, 0)
    const exchangeBalance = exchangeAccounts.reduce((sum, a) => sum + a.totalBalance, 0)

    // Sum P&L from all accounts (so it matches individual cards)
    const totalPL = accounts.reduce((sum, a) => sum + a.totalPL, 0)

    // Reconcile tab shows all accounts, so count matches total
    const attentionCount = accounts.length
    // Count only accounts with LARGE variance ($500+)
    const largeVarianceCount = accounts.filter((a) =>
      a.varianceAmount !== null &&
      a.varianceAmount !== undefined &&
      Math.abs(a.varianceAmount) >= LARGE_VARIANCE_THRESHOLD
    ).length
    return { bookieCount, exchangeCount, attentionCount, largeVarianceCount, bookieBalance, exchangeBalance, totalPL }
  }, [accounts])

  return {
    accounts,
    filteredAccounts,
    ...counts,
    isLoading,
    error,
    refresh: fetchData,
  }
}
