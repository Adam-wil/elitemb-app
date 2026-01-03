/**
 * useDepositMatches Hook
 *
 * Manages deposit match bonuses (sign-up offers, reloads, deposit matches).
 * Uses database storage with full CRUD operations.
 * Linked to journal entries for accounting.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getDepositMatches,
  createDepositMatch,
  updateDepositMatch,
  deleteDepositMatch,
  getDepositMatchTotal,
  type DepositMatchRecord,
  type CreateDepositMatchInput,
  type UpdateDepositMatchInput,
} from '../api/db/depositMatchDb.server'

// ============================================================================
// Types
// ============================================================================

interface NewDepositMatch {
  bookieId: number
  bookieName: string
  amount: number
  date: string
  notes?: string
}

interface UseDepositMatchesReturn {
  // Data
  depositMatches: DepositMatchRecord[]

  // State
  isLoading: boolean
  error: string | null

  // CRUD operations
  addDepositMatch: (match: NewDepositMatch) => Promise<DepositMatchRecord>
  updateDepositMatch: (id: string, updates: Partial<NewDepositMatch>) => Promise<DepositMatchRecord>
  removeDepositMatch: (id: string) => Promise<boolean>

  // Queries
  getMatchesByBookie: (bookieId: number) => DepositMatchRecord[]
  getTotalForBookie: (bookieId: number) => number
  getGrandTotal: () => number

  // Summary
  bookieSummaries: { bookieId: number; bookieName: string; totalAmount: number; count: number }[]

  // Refresh
  refresh: () => Promise<void>
}

// ============================================================================
// Hook
// ============================================================================

export function useDepositMatches(): UseDepositMatchesReturn {
  const [depositMatches, setDepositMatches] = useState<DepositMatchRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch deposit matches from database
   */
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getDepositMatches({ data: {} })
      setDepositMatches(result)
    } catch (err) {
      console.error('useDepositMatches fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load deposit matches')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  /**
   * Add a new deposit match
   */
  const addDepositMatch = useCallback(
    async (match: NewDepositMatch): Promise<DepositMatchRecord> => {
      const result = await createDepositMatch({
        data: {
          bookieId: match.bookieId,
          bookieName: match.bookieName,
          amount: match.amount,
          date: match.date,
          notes: match.notes,
        },
      })

      setDepositMatches((prev) => [result, ...prev])
      return result
    },
    []
  )

  /**
   * Update an existing deposit match
   */
  const handleUpdateDepositMatch = useCallback(
    async (id: string, updates: Partial<NewDepositMatch>): Promise<DepositMatchRecord> => {
      const result = await updateDepositMatch({
        data: {
          id,
          amount: updates.amount,
          date: updates.date,
          notes: updates.notes,
        },
      })

      setDepositMatches((prev) => prev.map((dm) => (dm.id === id ? result : dm)))
      return result
    },
    []
  )

  /**
   * Delete a deposit match
   */
  const removeDepositMatch = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteDepositMatch({ data: { id } })
      setDepositMatches((prev) => prev.filter((dm) => dm.id !== id))
      return true
    } catch (err) {
      console.error('Failed to delete deposit match:', err)
      return false
    }
  }, [])

  /**
   * Get deposit matches for a specific bookie
   */
  const getMatchesByBookie = useCallback(
    (bookieId: number): DepositMatchRecord[] => {
      return depositMatches.filter((dm) => dm.bookieId === bookieId)
    },
    [depositMatches]
  )

  /**
   * Get total amount for a specific bookie
   */
  const getTotalForBookie = useCallback(
    (bookieId: number): number => {
      return depositMatches
        .filter((dm) => dm.bookieId === bookieId)
        .reduce((sum, dm) => sum + dm.amount, 0)
    },
    [depositMatches]
  )

  /**
   * Get grand total of all deposit matches
   */
  const getGrandTotal = useCallback((): number => {
    return depositMatches.reduce((sum, dm) => sum + dm.amount, 0)
  }, [depositMatches])

  /**
   * Summary by bookie
   */
  const bookieSummaries = useMemo(() => {
    const map = new Map<number, { bookieId: number; bookieName: string; totalAmount: number; count: number }>()

    depositMatches.forEach((dm) => {
      const existing = map.get(dm.bookieId)
      if (existing) {
        existing.totalAmount += dm.amount
        existing.count += 1
      } else {
        map.set(dm.bookieId, {
          bookieId: dm.bookieId,
          bookieName: dm.bookieName,
          totalAmount: dm.amount,
          count: 1,
        })
      }
    })

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount)
  }, [depositMatches])

  return {
    depositMatches,
    isLoading,
    error,
    addDepositMatch,
    updateDepositMatch: handleUpdateDepositMatch,
    removeDepositMatch,
    getMatchesByBookie,
    getTotalForBookie,
    getGrandTotal,
    bookieSummaries,
    refresh: fetchData,
  }
}
