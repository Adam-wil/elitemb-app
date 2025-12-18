/**
 * Bonus Credits Hook
 *
 * Manages bonus credit entries (sign-up offers like 100/100).
 * These are manually entered as banks don't show bonus credits.
 */

import { useState, useEffect, useCallback } from 'react'
import type { BonusCredit } from '../types'
import {
  getBonusCredits,
  saveBonusCredits,
  addBonusCredit,
  updateBonusCredit,
  deleteBonusCredit,
  getBonusCreditsByBookie,
  getTotalBonusCreditForBookie,
} from '../utils/accountsStorage'

// ============================================================================
// Types
// ============================================================================

interface NewBonusCredit {
  bookieId: string
  bookieName: string
  amount: number
  date: string
  notes: string
}

interface UseBonusCreditsReturn {
  // All credits
  bonusCredits: BonusCredit[]

  // State
  isLoading: boolean

  // CRUD operations
  addCredit: (credit: NewBonusCredit) => BonusCredit
  updateCredit: (id: string, updates: Partial<NewBonusCredit>) => BonusCredit | null
  removeCredit: (id: string) => boolean

  // Queries
  getCreditsByBookie: (bookieId: string) => BonusCredit[]
  getTotalForBookie: (bookieId: string) => number
  getGrandTotal: () => number

  // Refresh
  refresh: () => void
}

// ============================================================================
// Hook
// ============================================================================

export function useBonusCredits(): UseBonusCreditsReturn {
  const [bonusCredits, setBonusCredits] = useState<BonusCredit[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load on mount
  useEffect(() => {
    setBonusCredits(getBonusCredits())
    setIsLoading(false)
  }, [])

  /**
   * Refresh from storage
   */
  const refresh = useCallback(() => {
    setBonusCredits(getBonusCredits())
  }, [])

  /**
   * Add a new bonus credit
   */
  const addCredit = useCallback((credit: NewBonusCredit): BonusCredit => {
    const newCredit = addBonusCredit(credit)
    setBonusCredits(prev => [...prev, newCredit])
    return newCredit
  }, [])

  /**
   * Update an existing bonus credit
   */
  const updateCreditHandler = useCallback(
    (id: string, updates: Partial<NewBonusCredit>): BonusCredit | null => {
      const updated = updateBonusCredit(id, updates)
      if (updated) {
        setBonusCredits(prev => prev.map(c => (c.id === id ? updated : c)))
      }
      return updated
    },
    []
  )

  /**
   * Delete a bonus credit
   */
  const removeCredit = useCallback((id: string): boolean => {
    const success = deleteBonusCredit(id)
    if (success) {
      setBonusCredits(prev => prev.filter(c => c.id !== id))
    }
    return success
  }, [])

  /**
   * Get credits for a specific bookie
   */
  const getCreditsByBookie = useCallback((bookieId: string): BonusCredit[] => {
    return getBonusCreditsByBookie(bookieId)
  }, [])

  /**
   * Get total bonus credit amount for a bookie
   */
  const getTotalForBookie = useCallback((bookieId: string): number => {
    return getTotalBonusCreditForBookie(bookieId)
  }, [])

  /**
   * Get grand total of all bonus credits
   */
  const getGrandTotal = useCallback((): number => {
    return bonusCredits.reduce((sum, c) => sum + c.amount, 0)
  }, [bonusCredits])

  return {
    bonusCredits,
    isLoading,
    addCredit,
    updateCredit: updateCreditHandler,
    removeCredit,
    getCreditsByBookie,
    getTotalForBookie,
    getGrandTotal,
    refresh,
  }
}
