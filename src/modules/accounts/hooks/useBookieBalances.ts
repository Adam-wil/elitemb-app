/**
 * Bookie Balances Hook
 *
 * Calculates running balances per bookie from transactions.
 * Combines bank transactions with bonus credits and manual overrides.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { NormalizedTransaction, BookiePLRow, BalanceOverride, BonusCredit } from '../types'
import {
  getBalanceOverrides,
  setBalanceOverride,
  clearBalanceOverride,
  getBalanceOverride,
} from '../utils/accountsStorage'
import { getTransactionStatsByBookie } from '../utils/bookieDetection'
import { getBookieById } from '../utils/bookieList'

// ============================================================================
// Types
// ============================================================================

interface UseBookieBalancesOptions {
  transactions: NormalizedTransaction[]
  bonusCredits: BonusCredit[]
}

interface UseBookieBalancesReturn {
  // P&L rows per bookie
  plRows: BookiePLRow[]

  // Totals
  totalBalance: number
  totalBonusBalance: number
  totalDeposits: number
  totalWithdrawals: number
  totalNetCash: number
  totalNetBonus: number
  totalProfit: number

  // Override management
  setOverride: (bookieId: string, value: number, reason?: string) => void
  clearOverride: (bookieId: string) => void
  getOverride: (bookieId: string) => BalanceOverride | null
  hasOverride: (bookieId: string) => boolean

  // Stats
  profitableCount: number
  lossCount: number
}

// ============================================================================
// Hook
// ============================================================================

export function useBookieBalances(options: UseBookieBalancesOptions): UseBookieBalancesReturn {
  const { transactions, bonusCredits } = options

  const [overrides, setOverrides] = useState<BalanceOverride[]>([])

  // Load overrides on mount
  useEffect(() => {
    setOverrides(getBalanceOverrides())
  }, [])

  /**
   * Calculate P&L rows for each bookie
   */
  const plRows = useMemo((): BookiePLRow[] => {
    // Get transaction stats per bookie
    const txStats = getTransactionStatsByBookie(transactions)

    // Get unique bookie IDs from transactions and bonus credits
    const bookieIds = new Set<string>()
    transactions.forEach(tx => {
      if (tx.bookieId) bookieIds.add(tx.bookieId)
    })
    bonusCredits.forEach(bc => bookieIds.add(bc.bookieId))

    // Build P&L rows
    const rows: BookiePLRow[] = []

    for (const bookieId of bookieIds) {
      const bookie = getBookieById(bookieId)
      const stats = txStats.get(bookieId) || { count: 0, totalIn: 0, totalOut: 0 }
      const override = overrides.find(o => o.bookieId === bookieId)

      // Calculate bonus balance for this bookie
      const bookieBonuses = bonusCredits.filter(bc => bc.bookieId === bookieId)
      const bonusBalance = bookieBonuses.reduce((sum, bc) => sum + bc.amount, 0)

      // Calculate balance from transactions
      // Credits (withdrawals from bookie perspective) = money coming IN to bank = positive
      // Debits (deposits to bookie) = money going OUT from bank = negative
      const calculatedBalance = stats.totalIn - stats.totalOut

      // Net cash = deposits - withdrawals + cash bet P&L (from tracker - future integration)
      // For now, net cash is just the transaction flow
      const netCash = calculatedBalance

      // Net bonus = bonus bet P&L (from tracker - future integration)
      // For now, use bonus balance as placeholder
      const netBonus = bonusBalance

      // Total profit = netCash + netBonus
      const totalProfit = netCash + netBonus

      rows.push({
        bookieId,
        bookieName: bookie?.name || bookieId,
        balance: calculatedBalance,
        manualOverride: override?.overrideValue ?? null,
        bonusBalance,
        depositCount: stats.count, // Will refine with direction filtering
        depositAmount: stats.totalOut, // Money sent TO bookie
        withdrawalCount: stats.count, // Will refine with direction filtering
        withdrawalAmount: stats.totalIn, // Money received FROM bookie
        netCash,
        netBonus,
        totalProfit,
        isProfitable: totalProfit > 0,
      })
    }

    // Sort by bookie name
    return rows.sort((a, b) => a.bookieName.localeCompare(b.bookieName))
  }, [transactions, bonusCredits, overrides])

  /**
   * Calculate totals
   */
  const totals = useMemo(() => {
    return plRows.reduce(
      (acc, row) => ({
        totalBalance: acc.totalBalance + (row.manualOverride ?? row.balance),
        totalBonusBalance: acc.totalBonusBalance + row.bonusBalance,
        totalDeposits: acc.totalDeposits + row.depositAmount,
        totalWithdrawals: acc.totalWithdrawals + row.withdrawalAmount,
        totalNetCash: acc.totalNetCash + row.netCash,
        totalNetBonus: acc.totalNetBonus + row.netBonus,
        totalProfit: acc.totalProfit + row.totalProfit,
        profitableCount: acc.profitableCount + (row.isProfitable ? 1 : 0),
        lossCount: acc.lossCount + (!row.isProfitable ? 1 : 0),
      }),
      {
        totalBalance: 0,
        totalBonusBalance: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalNetCash: 0,
        totalNetBonus: 0,
        totalProfit: 0,
        profitableCount: 0,
        lossCount: 0,
      }
    )
  }, [plRows])

  /**
   * Set manual override for a bookie
   */
  const setOverrideHandler = useCallback((bookieId: string, value: number, reason?: string) => {
    setBalanceOverride(bookieId, value, reason)
    setOverrides(getBalanceOverrides())
  }, [])

  /**
   * Clear override for a bookie
   */
  const clearOverrideHandler = useCallback((bookieId: string) => {
    clearBalanceOverride(bookieId)
    setOverrides(getBalanceOverrides())
  }, [])

  /**
   * Get override for a bookie
   */
  const getOverrideHandler = useCallback((bookieId: string): BalanceOverride | null => {
    return getBalanceOverride(bookieId)
  }, [])

  /**
   * Check if bookie has an override
   */
  const hasOverride = useCallback(
    (bookieId: string): boolean => {
      return overrides.some(o => o.bookieId === bookieId)
    },
    [overrides]
  )

  return {
    plRows,
    ...totals,
    setOverride: setOverrideHandler,
    clearOverride: clearOverrideHandler,
    getOverride: getOverrideHandler,
    hasOverride,
  }
}
