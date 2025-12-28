/**
 * Bookie P&L Hook (Database-backed)
 *
 * Reads P&L data from the AccountBalance and AccountLedger database tables.
 * This replaces the transaction-based calculation with persisted database values.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { BookiePLRow } from '../types'
import type { AccountBalance, LedgerEntry } from '../types/ledger'
import {
  getAccountBalances,
  getLedgerSummary,
  setBalanceOverride as setBalanceOverrideServer,
  clearBalanceOverride as clearBalanceOverrideServer,
} from '../api/db/ledgerDb.server'

// ============================================================================
// Types
// ============================================================================

interface UseBookiePLReturn {
  // P&L rows per bookie
  plRows: BookiePLRow[]

  // Totals
  totalBalance: number
  totalBonusBalance: number
  totalProfit: number

  // State
  isLoading: boolean
  error: string | null

  // Override management
  setOverride: (bookieId: string, value: number, reason?: string) => Promise<void>
  clearOverride: (bookieId: string) => Promise<void>

  // Actions
  refresh: () => Promise<void>

  // Stats
  profitableCount: number
  lossCount: number
}

// ============================================================================
// Hook
// ============================================================================

export function useBookiePL(): UseBookiePLReturn {
  const [balances, setBalances] = useState<AccountBalance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch balances from database
   */
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getAccountBalances({ data: {} })
      setBalances(result)
    } catch (err) {
      console.error('useBookiePL fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load P&L data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  /**
   * Convert AccountBalance to BookiePLRow
   */
  const plRows = useMemo((): BookiePLRow[] => {
    return balances.map((balance): BookiePLRow => {
      const currentBalance = balance.isOverridden && balance.overrideValue !== null
        ? balance.overrideValue
        : balance.currentBalance

      // For now, we don't have separate deposit/withdrawal counts from the balance table
      // These could be calculated from ledger entries if needed
      return {
        bookieId: balance.bookieName, // Using bookieName as ID for now
        bookieName: balance.bookieName,
        balance: balance.currentBalance,
        manualOverride: balance.isOverridden ? balance.overrideValue : null,
        bonusBalance: 0, // Will be populated from ledger entries with BONUS_CREDIT type
        depositCount: 0, // Could query from ledger
        depositAmount: 0, // Could query from ledger
        withdrawalCount: 0, // Could query from ledger
        withdrawalAmount: 0, // Could query from ledger
        netCash: balance.currentBalance,
        netBonus: 0,
        totalProfit: balance.totalPL,
        isProfitable: balance.totalPL > 0,
      }
    }).sort((a, b) => a.bookieName.localeCompare(b.bookieName))
  }, [balances])

  /**
   * Calculate totals
   */
  const totals = useMemo(() => {
    return plRows.reduce(
      (acc, row) => ({
        totalBalance: acc.totalBalance + (row.manualOverride ?? row.balance),
        totalBonusBalance: acc.totalBonusBalance + row.bonusBalance,
        totalProfit: acc.totalProfit + row.totalProfit,
        profitableCount: acc.profitableCount + (row.isProfitable ? 1 : 0),
        lossCount: acc.lossCount + (!row.isProfitable ? 1 : 0),
      }),
      {
        totalBalance: 0,
        totalBonusBalance: 0,
        totalProfit: 0,
        profitableCount: 0,
        lossCount: 0,
      }
    )
  }, [plRows])

  /**
   * Set manual override for a bookie
   */
  const setOverride = useCallback(
    async (bookieId: string, value: number, reason?: string) => {
      try {
        await setBalanceOverrideServer({
          data: {
            bookieName: bookieId, // bookieId is actually the bookieName in our case
            overrideValue: value,
            reason: reason || 'Manual adjustment',
          },
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
   * Clear override for a bookie
   */
  const clearOverride = useCallback(
    async (bookieId: string) => {
      try {
        await clearBalanceOverrideServer({
          data: { bookieName: bookieId },
        })
        await fetchData()
      } catch (err) {
        console.error('clearOverride error:', err)
        throw err
      }
    },
    [fetchData]
  )

  return {
    plRows,
    ...totals,
    isLoading,
    error,
    setOverride,
    clearOverride,
    refresh: fetchData,
  }
}
