/**
 * The Stable - Bonus Data Hook
 * Provides CRUD operations and state management for bonuses
 */

import { useState, useCallback, useEffect } from 'react'
import dayjs from 'dayjs'
import type { Bonus, BonusStatus, StableSummary } from '../types'
import { createBonus, getBookieExpiryDays } from '../types'
import {
  getAllBonuses,
  saveBonuses,
  addBonus as storageAddBonus,
  updateBonus as storageUpdateBonus,
  deleteBonus as storageDeleteBonus,
  markExpiredBonuses,
  calculateSummary,
  bonusExistsForEntry,
} from '../utils/bonusStorage'

interface UseBonusDataReturn {
  bonuses: Bonus[]
  summary: StableSummary
  loading: boolean

  // CRUD operations
  addBonus: (params: {
    bookie: string
    amount: number
    dateEarned?: string
    expiryDate?: string
    sourceEntryId?: string
    sourcePromoType?: string
    notes?: string
  }) => Bonus

  updateBonus: (id: string, updates: Partial<Bonus>) => void
  deleteBonus: (id: string) => void

  // Status changes
  markAsTurnedOver: (id: string, profit?: number) => void
  markAsExpired: (id: string) => void
  markAsCancelled: (id: string) => void

  // Split operations
  splitBonus: (id: string, splitAmount: number) => void

  // Bulk operations
  refreshData: () => void
  checkAndMarkExpired: () => number
}

export function useBonusData(): UseBonusDataReturn {
  const [bonuses, setBonuses] = useState<Bonus[]>([])
  const [summary, setSummary] = useState<StableSummary>({
    totalPending: 0,
    totalPendingValue: 0,
    expiringWithin3Days: 0,
    turnedOverThisMonth: 0,
    bonusTurnoverProfitThisMonth: 0,
    expiredThisMonth: 0,
  })
  const [loading, setLoading] = useState(true)

  // Refresh data from storage
  const refreshData = useCallback(() => {
    const data = getAllBonuses()
    setBonuses(data)
    setSummary(calculateSummary())
  }, [])

  // Initial load and check for expired
  useEffect(() => {
    markExpiredBonuses()
    refreshData()
    setLoading(false)
  }, [refreshData])

  // Add a new bonus
  const addBonus = useCallback(
    (params: {
      bookie: string
      amount: number
      dateEarned?: string
      expiryDate?: string
      sourceEntryId?: string
      sourcePromoType?: string
      notes?: string
    }): Bonus => {
      const dateEarned = params.dateEarned || dayjs().format('YYYY-MM-DD')
      const expiryDays = getBookieExpiryDays(params.bookie)
      const expiryDate =
        params.expiryDate || dayjs(dateEarned).add(expiryDays, 'day').format('YYYY-MM-DD')

      const bonus = createBonus({
        bookie: params.bookie,
        amount: params.amount,
        dateEarned,
        expiryDate,
        sourceEntryId: params.sourceEntryId,
        sourcePromoType: params.sourcePromoType,
        notes: params.notes,
      })

      storageAddBonus(bonus)
      refreshData()
      return bonus
    },
    [refreshData]
  )

  // Update a bonus
  const updateBonus = useCallback(
    (id: string, updates: Partial<Bonus>) => {
      storageUpdateBonus(id, updates)
      refreshData()
    },
    [refreshData]
  )

  // Delete a bonus
  const deleteBonus = useCallback(
    (id: string) => {
      storageDeleteBonus(id)
      refreshData()
    },
    [refreshData]
  )

  // Mark as turned over
  const markAsTurnedOver = useCallback(
    (id: string, bonusTurnoverProfit?: number) => {
      storageUpdateBonus(id, {
        status: 'turned_over',
        turnedOverAt: new Date().toISOString(),
        bonusTurnoverProfit,
      })
      refreshData()
    },
    [refreshData]
  )

  // Mark as expired
  const markAsExpired = useCallback(
    (id: string) => {
      storageUpdateBonus(id, { status: 'expired' })
      refreshData()
    },
    [refreshData]
  )

  // Mark as cancelled
  const markAsCancelled = useCallback(
    (id: string) => {
      storageUpdateBonus(id, { status: 'cancelled' })
      refreshData()
    },
    [refreshData]
  )

  // Check and mark expired bonuses
  const checkAndMarkExpired = useCallback(() => {
    const count = markExpiredBonuses()
    if (count > 0) {
      refreshData()
    }
    return count
  }, [refreshData])

  // Split a bonus into multiple smaller bonuses
  const splitBonus = useCallback(
    (id: string, splitAmount: number) => {
      const bonus = bonuses.find((b) => b.id === id)
      if (!bonus || bonus.status !== 'pending') return

      const numSplits = Math.floor(bonus.amount / splitAmount)
      const remainder = bonus.amount % splitAmount

      // Create split bonuses
      for (let i = 0; i < numSplits; i++) {
        const newBonus = createBonus({
          bookie: bonus.bookie,
          amount: splitAmount,
          dateEarned: bonus.dateEarned,
          expiryDate: bonus.expiryDate,
          sourceEntryId: bonus.sourceEntryId,
          sourcePromoType: bonus.sourcePromoType,
          notes: bonus.notes ? `${bonus.notes} (split ${i + 1}/${numSplits}${remainder > 0 ? `+1` : ''})` : `Split ${i + 1}/${numSplits}${remainder > 0 ? `+1` : ''}`,
        })
        storageAddBonus(newBonus)
      }

      // Create remainder bonus if any
      if (remainder > 0) {
        const remainderBonus = createBonus({
          bookie: bonus.bookie,
          amount: remainder,
          dateEarned: bonus.dateEarned,
          expiryDate: bonus.expiryDate,
          sourceEntryId: bonus.sourceEntryId,
          sourcePromoType: bonus.sourcePromoType,
          notes: bonus.notes ? `${bonus.notes} (remainder)` : 'Remainder',
        })
        storageAddBonus(remainderBonus)
      }

      // Delete the original bonus
      storageDeleteBonus(id)
      refreshData()
    },
    [bonuses, refreshData]
  )

  return {
    bonuses,
    summary,
    loading,
    addBonus,
    updateBonus,
    deleteBonus,
    markAsTurnedOver,
    markAsExpired,
    markAsCancelled,
    splitBonus,
    refreshData,
    checkAndMarkExpired,
  }
}

/**
 * Helper to check if bonus already exists for a tracker entry
 */
export { bonusExistsForEntry }
