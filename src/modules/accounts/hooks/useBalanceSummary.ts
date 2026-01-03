/**
 * useBalanceSummary Hook
 *
 * Fetches aggregated balance summary for the BalanceSummaryCard component.
 * Uses AccountBalanceView to calculate totals from journal entries.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getBalanceSummaryForCard,
  type BalanceSummaryCardData,
} from '../api/db/accountBalanceView.server'

// ============================================================================
// Types
// ============================================================================

export interface UseBalanceSummaryOptions {
  /** Optional profile ID (uses default if not provided) */
  profileId?: string
  /** Auto-refresh interval in ms (0 to disable) */
  refreshInterval?: number
  /** Whether to enable fetching */
  enabled?: boolean
}

export interface UseBalanceSummaryReturn {
  /** Balance summary data */
  data: BalanceSummaryCardData | null
  /** Total balance from operational accounts */
  totalBalance: number
  /** Total P&L from income/expense accounts */
  totalPL: number
  /** Whether any account has variance */
  hasVariance: boolean
  /** Count of accounts with variance */
  varianceCount: number
  /** Loading state */
  isLoading: boolean
  /** Error message if failed */
  error: string | null
  /** Refetch data */
  refresh: () => Promise<void>
}

// ============================================================================
// Default Values
// ============================================================================

const defaultData: BalanceSummaryCardData = {
  totalBalance: 0,
  totalPL: 0,
  hasVariance: false,
  varianceCount: 0,
}

// ============================================================================
// Hook
// ============================================================================

export function useBalanceSummary(
  options: UseBalanceSummaryOptions = {}
): UseBalanceSummaryReturn {
  const { profileId, refreshInterval = 0, enabled = true } = options

  const [data, setData] = useState<BalanceSummaryCardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch balance summary from server
   */
  const fetchData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getBalanceSummaryForCard({
        data: { profileId },
      })
      setData(result)
    } catch (err) {
      console.error('useBalanceSummary fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load balance summary')
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

  // Destructure data with defaults
  const { totalBalance, totalPL, hasVariance, varianceCount } = data ?? defaultData

  return {
    data,
    totalBalance,
    totalPL,
    hasVariance,
    varianceCount,
    isLoading,
    error,
    refresh: fetchData,
  }
}
