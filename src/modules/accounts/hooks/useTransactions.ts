/**
 * Transactions Hook
 *
 * Fetches and caches bank transactions from Basiq API.
 * Applies bookie detection and filtering.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { NormalizedTransaction, TransactionCache } from '../types'
import {
  saveTransactions,
  getTransactionCache,
  clearTransactionCache,
  isTransactionCacheStale,
} from '../utils/accountsStorage'
import {
  processTransactions,
  filterBookieTransactions,
  filterExchangeTransactions,
  filterRegularBookieTransactions,
} from '../utils/bookieDetection'
import { fetchAllTransactionsServer } from '../api/basiq'

// ============================================================================
// Types
// ============================================================================

interface DateRange {
  from: string // YYYY-MM-DD
  to: string // YYYY-MM-DD
}

interface UseTransactionsOptions {
  userId: string | null
  dateRange: DateRange
  autoFetch?: boolean
  cacheMaxAgeMinutes?: number
}

interface UseTransactionsReturn {
  // All transactions (bookie-related only)
  transactions: NormalizedTransaction[]

  // Filtered views
  bookieTransactions: NormalizedTransaction[] // Regular bookies only
  exchangeTransactions: NormalizedTransaction[] // Betfair/Smarkets only
  allBookieTransactions: NormalizedTransaction[] // Both

  // State
  isLoading: boolean
  error: string | null
  lastFetchedAt: string | null

  // Actions
  fetchTransactions: () => Promise<void>
  refreshTransactions: () => Promise<void>
  clearCache: () => void

  // Stats
  totalCount: number
  bookieCount: number
  exchangeCount: number
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get date N days ago in YYYY-MM-DD format
 */
function getDateDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Default date range: last 30 days
 */
export function getDefaultDateRange(): DateRange {
  return {
    from: getDateDaysAgo(30),
    to: getToday(),
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useTransactions(options: UseTransactionsOptions): UseTransactionsReturn {
  const { userId, dateRange, autoFetch = true, cacheMaxAgeMinutes = 60 } = options

  const [transactions, setTransactions] = useState<NormalizedTransaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null)

  // Load cached transactions on mount
  useEffect(() => {
    const cache = getTransactionCache()
    if (cache) {
      setTransactions(cache.transactions)
      setLastFetchedAt(cache.lastFetchedAt)
    }
  }, [])

  /**
   * Fetch transactions from Basiq API
   */
  const fetchTransactions = useCallback(async (): Promise<void> => {
    if (!userId) {
      setError('No user ID. Please connect your bank first.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch all transactions for date range
      const result = await fetchAllTransactionsServer({
        data: {
          userId,
          fromDate: dateRange.from,
          toDate: dateRange.to,
        },
      })

      // Process and normalize transactions (applies bookie detection)
      const normalized = processTransactions(result.transactions)

      // Filter to only bookie-related transactions
      const bookieRelated = filterBookieTransactions(normalized)

      // Update state
      setTransactions(bookieRelated)
      setLastFetchedAt(new Date().toISOString())

      // Cache transactions
      saveTransactions(bookieRelated, dateRange)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch transactions'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [userId, dateRange])

  /**
   * Force refresh (bypass cache)
   */
  const refreshTransactions = useCallback(async (): Promise<void> => {
    clearTransactionCache()
    await fetchTransactions()
  }, [fetchTransactions])

  /**
   * Clear local cache
   */
  const clearCache = useCallback((): void => {
    clearTransactionCache()
    setTransactions([])
    setLastFetchedAt(null)
  }, [])

  // Auto-fetch on mount or when date range changes (if cache is stale)
  useEffect(() => {
    if (autoFetch && userId) {
      const cacheStale = isTransactionCacheStale(cacheMaxAgeMinutes)
      if (cacheStale) {
        fetchTransactions()
      }
    }
  }, [autoFetch, userId, cacheMaxAgeMinutes, fetchTransactions])

  // Filtered views (memoized)
  const bookieTransactions = useMemo(
    () => filterRegularBookieTransactions(transactions),
    [transactions]
  )

  const exchangeTransactions = useMemo(
    () => filterExchangeTransactions(transactions),
    [transactions]
  )

  const allBookieTransactions = useMemo(
    () => filterBookieTransactions(transactions),
    [transactions]
  )

  return {
    transactions,
    bookieTransactions,
    exchangeTransactions,
    allBookieTransactions,
    isLoading,
    error,
    lastFetchedAt,
    fetchTransactions,
    refreshTransactions,
    clearCache,
    totalCount: transactions.length,
    bookieCount: bookieTransactions.length,
    exchangeCount: exchangeTransactions.length,
  }
}
