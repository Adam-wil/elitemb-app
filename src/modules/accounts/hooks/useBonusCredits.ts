/**
 * Bonus Credits Hook
 *
 * Manages bonus credit entries (sign-up offers like 100/100).
 * These are manually entered as banks don't show bonus credits.
 *
 * Data is persisted to BOTH:
 * - Database (AccountLedger) - source of truth
 * - localStorage - for offline caching
 */

import { useState, useEffect, useCallback } from 'react'
import type { BonusCredit } from '../types'
import {
  getBonusCredits,
  saveBonusCredits,
  addBonusCredit as addBonusCreditToStorage,
  updateBonusCredit,
  deleteBonusCredit as deleteBonusCreditFromStorage,
  getBonusCreditsByBookie,
  getTotalBonusCreditForBookie,
} from '../utils/accountsStorage'
import { createLedgerEntry, deleteLedgerEntryByBonusCreditId } from '../api/db/ledgerDb.server'

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
  addCredit: (credit: NewBonusCredit) => Promise<BonusCredit>
  updateCredit: (id: string, updates: Partial<NewBonusCredit>) => BonusCredit | null
  removeCredit: (id: string) => Promise<boolean>

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
   * Writes to both localStorage (for caching) and database (source of truth)
   */
  const addCredit = useCallback(async (credit: NewBonusCredit): Promise<BonusCredit> => {
    // Add to localStorage first (immediate UI update)
    const newCredit = addBonusCreditToStorage(credit)
    setBonusCredits(prev => [...prev, newCredit])

    // Also write to database ledger
    try {
      await createLedgerEntry({
        data: {
          bookieName: credit.bookieName,
          bookieId: null, // Will be resolved by server if needed
          isExchange: false,
          entryType: 'BONUS_CREDIT',
          amount: credit.amount,
          direction: 'in',
          date: credit.date,
          description: `Bonus credit: ${credit.notes || 'Sign-up offer'}`,
          notes: credit.notes,
          bonusCreditId: newCredit.id,
        },
      })
    } catch (error) {
      console.error('Failed to sync bonus credit to ledger:', error)
      // Don't throw - localStorage still has the data
    }

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
   * Removes from both localStorage and database
   */
  const removeCredit = useCallback(async (id: string): Promise<boolean> => {
    // Delete from localStorage first (immediate UI update)
    const success = deleteBonusCreditFromStorage(id)
    if (success) {
      setBonusCredits(prev => prev.filter(c => c.id !== id))
    }

    // Also delete from database ledger
    try {
      await deleteLedgerEntryByBonusCreditId({ data: { bonusCreditId: id } })
    } catch (error) {
      console.error('Failed to delete bonus credit from ledger:', error)
      // Don't throw - localStorage already updated
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
