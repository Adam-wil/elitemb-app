/**
 * Bookie P&L Hook (Journal-based)
 *
 * Reads P&L data from the AccountBalanceView which calculates balances
 * from JournalLine entries. Includes:
 * - Racing Income (per-bookie)
 * - Bonus Deposit Match Income (per-bookie sign-up bonuses, reloads)
 * - Racing Expense (per-bookie)
 *
 * P&L = Racing Income + Bonus Deposit Match Income - Racing Expense
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { BookiePLRow } from '../types'
import type { BookieAccountData } from '../types/ledger'
import { getBookieBalancesGrouped } from '../api/db/accountBalanceView.server'
import {
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
  const [accounts, setAccounts] = useState<BookieAccountData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch grouped bookie balances from AccountBalanceView (journal-based)
   */
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getBookieBalancesGrouped({ data: {} })
      setAccounts(result)
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
   * Convert BookieAccountData to BookiePLRow
   *
   * BookieAccountData includes:
   * - cashBalance, bonusBalance, totalBalance (from asset accounts)
   * - totalPL (from income - expense accounts, includes bonus deposit match income)
   */
  const plRows = useMemo((): BookiePLRow[] => {
    return accounts.map((account): BookiePLRow => {
      // P&L already includes bonus deposit match income from getBookieBalancesGrouped
      // Formula: Racing Income + Bonus Deposit Match Income - Racing Expense
      return {
        bookieId: account.bookieName, // Using bookieName as ID for now
        bookieName: account.bookieName,
        balance: account.cashBalance,
        manualOverride: null, // TODO: Integrate with actual balance override system
        bonusBalance: account.bonusBalance,
        depositCount: 0, // Could query from journal entries if needed
        depositAmount: 0, // Could query from journal entries if needed
        withdrawalCount: 0, // Could query from journal entries if needed
        withdrawalAmount: 0, // Could query from journal entries if needed
        netCash: account.cashBalance,
        netBonus: account.bonusBalance,
        totalProfit: account.totalPL, // Includes racing income + bonus deposit match income - expense
        isProfitable: account.totalPL > 0,
      }
    }).sort((a, b) => a.bookieName.localeCompare(b.bookieName))
  }, [accounts])

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
