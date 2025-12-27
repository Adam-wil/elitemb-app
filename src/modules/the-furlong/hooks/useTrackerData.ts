import { useState, useEffect, useCallback } from 'react'
import type {
  TrackedRaceEntry,
  DailyTrackerData,
  RaceOutcome,
  RaceResultData,
} from '../types'
import {
  getTrackerData,
  saveTrackerData,
  updateTrackerEntry,
  removeTrackerEntry,
  addTrackerEntry,
  addTrackerEntryAbove,
  createDailyTrackerData,
  getArchivedTrackerDates,
  getDatesWithTrackerData,
} from '../utils/trackerStorage'
import { calculateProfitLoss } from '../utils/outcomeLogic'
import { addBonus, bonusExistsForEntry } from '@/modules/the-stable/utils/bonusStorage'
import { createBonus, getBookieExpiryDays } from '@/modules/the-stable/types'
import dayjs from 'dayjs'

interface UseTrackerDataOptions {
  date: string
}

interface UseTrackerDataReturn {
  data: DailyTrackerData | null
  entries: TrackedRaceEntry[]
  isLoading: boolean
  // CRUD operations
  addEntry: (afterId?: string) => void
  addEntryAbove: (beforeId: string) => void
  updateEntry: (entryId: string, updates: Partial<TrackedRaceEntry>) => void
  removeEntry: (entryId: string) => void
  // Result updates
  updateResult: (entryId: string, result: RaceResultData, outcome: RaceOutcome) => void
  // Selection updates
  updateSelection: (entryId: string, name: string, number: number) => void
  // Bet details updates
  updateBackBet: (entryId: string, updates: { stake?: number; odds?: number; bookie?: string }) => void
  updateLayBet: (entryId: string, updates: { stake?: number; odds?: number; commissionPercent?: number }) => void
  // Outcome updates
  updateOutcome: (entryId: string, outcome: RaceOutcome, notes?: string) => void
  // Refresh from storage
  refresh: () => void
  // Dates with data
  datesWithData: string[]
  archivedDates: string[]
}

/**
 * Hook for managing tracker data for a specific date
 */
export function useTrackerData({ date }: UseTrackerDataOptions): UseTrackerDataReturn {
  const [data, setData] = useState<DailyTrackerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [datesWithData, setDatesWithData] = useState<string[]>([])
  const [archivedDates, setArchivedDates] = useState<string[]>([])

  // Load data when date changes
  useEffect(() => {
    setIsLoading(true)
    const trackerData = getTrackerData(date)
    setData(trackerData)
    setDatesWithData(getDatesWithTrackerData())
    setArchivedDates(getArchivedTrackerDates())
    setIsLoading(false)
  }, [date])

  /**
   * Refresh data from storage
   */
  const refresh = useCallback(() => {
    const trackerData = getTrackerData(date)
    setData(trackerData)
    setDatesWithData(getDatesWithTrackerData())
    setArchivedDates(getArchivedTrackerDates())
  }, [date])

  /**
   * Add a new entry (below specified row or at end)
   */
  const addEntry = useCallback(
    (afterId?: string) => {
      const updated = addTrackerEntry(date, afterId)
      setData(updated)
      setDatesWithData(getDatesWithTrackerData())
    },
    [date]
  )

  /**
   * Add a new entry above specified row
   */
  const addEntryAbove = useCallback(
    (beforeId: string) => {
      const updated = addTrackerEntryAbove(date, beforeId)
      setData(updated)
      setDatesWithData(getDatesWithTrackerData())
    },
    [date]
  )

  /**
   * Update an entry
   * Also creates a bonus in The Stable if outcome changes to 'Bonus' and promo type is set
   */
  const updateEntry = useCallback(
    (entryId: string, updates: Partial<TrackedRaceEntry>) => {
      // Check if we need to create a bonus (outcome changing to 'Bonus')
      if (updates.outcome === 'Bonus' && data) {
        const entry = data.entries.find((e) => e.id === entryId)
        if (entry && entry.promoType && entry.promoType !== 'none') {
          if (!bonusExistsForEntry(entryId) && entry.backBet?.bookie && entry.backBet?.stake) {
            const bookie = entry.backBet.bookie
            const expiryDays = getBookieExpiryDays(bookie)
            const dateEarned = entry.date || dayjs().format('YYYY-MM-DD')
            const expiryDate = dayjs(dateEarned).add(expiryDays, 'day').format('YYYY-MM-DD')

            const bonus = createBonus({
              bookie,
              amount: entry.backBet.stake,
              dateEarned,
              expiryDate,
              sourceEntryId: entryId,
              sourcePromoType: entry.promoType,
              notes: `${entry.track} R${entry.raceNumber} - ${entry.selectionName || 'Selection'}`,
            })

            addBonus(bonus)
            updates.generatedBonusId = bonus.id

            console.log(`[Tracker] Created bonus (grid edit) for entry ${entryId}:`, {
              bookie,
              amount: entry.backBet.stake,
              expiryDate,
            })
          }
        }
      }

      const updated = updateTrackerEntry(date, entryId, updates)
      if (updated) {
        setData(updated)
      }
    },
    [date, data]
  )

  /**
   * Remove an entry
   */
  const removeEntry = useCallback(
    (entryId: string) => {
      const updated = removeTrackerEntry(date, entryId)
      if (updated) {
        setData(updated)
      }
    },
    [date]
  )

  /**
   * Update result and outcome for an entry
   * Also creates a bonus in The Stable if outcome is 'Bonus' and promo type is set
   */
  const updateResult = useCallback(
    (entryId: string, result: RaceResultData, outcome: RaceOutcome) => {
      if (!data) return

      const entry = data.entries.find((e) => e.id === entryId)
      if (!entry) return

      // Calculate profit/loss with the new outcome
      const updatedEntry: Partial<TrackedRaceEntry> = {
        autoResult: result,
        outcome,
        lastPolledAt: new Date().toISOString(),
      }

      // Recalculate P/L
      const entryWithOutcome = { ...entry, ...updatedEntry }
      updatedEntry.profitLoss = calculateProfitLoss(entryWithOutcome as TrackedRaceEntry)

      // Create bonus in The Stable if outcome is 'Bonus' and promo type is set
      if (outcome === 'Bonus' && entry.promoType && entry.promoType !== 'none') {
        // Check if bonus doesn't already exist for this entry
        if (!bonusExistsForEntry(entryId) && entry.backBet?.bookie && entry.backBet?.stake) {
          const bookie = entry.backBet.bookie
          const expiryDays = getBookieExpiryDays(bookie)
          const dateEarned = entry.date || dayjs().format('YYYY-MM-DD')
          const expiryDate = dayjs(dateEarned).add(expiryDays, 'day').format('YYYY-MM-DD')

          const bonus = createBonus({
            bookie,
            amount: entry.backBet.stake,
            dateEarned,
            expiryDate,
            sourceEntryId: entryId,
            sourcePromoType: entry.promoType,
            notes: `${entry.track} R${entry.raceNumber} - ${entry.selectionName || 'Selection'}`,
          })

          addBonus(bonus)
          updatedEntry.generatedBonusId = bonus.id

          console.log(`[Tracker] Created bonus for entry ${entryId}:`, {
            bookie,
            amount: entry.backBet.stake,
            expiryDate,
          })
        }
      }

      updateEntry(entryId, updatedEntry)
    },
    [data, updateEntry]
  )

  /**
   * Update horse selection
   */
  const updateSelection = useCallback(
    (entryId: string, name: string, number: number) => {
      updateEntry(entryId, {
        selectionName: name,
        selectionNumber: number,
      })
    },
    [updateEntry]
  )

  /**
   * Update back bet details
   */
  const updateBackBet = useCallback(
    (entryId: string, updates: { stake?: number; odds?: number; bookie?: string }) => {
      if (!data) return

      const entry = data.entries.find((e) => e.id === entryId)
      if (!entry) return

      const updatedBackBet = { ...entry.backBet, ...updates }
      const updatedEntry = { ...entry, backBet: updatedBackBet }

      // Recalculate P/L if outcome is known
      const profitLoss =
        entry.outcome !== 'Pending' ? calculateProfitLoss(updatedEntry) : entry.profitLoss

      updateEntry(entryId, {
        backBet: updatedBackBet,
        profitLoss,
      })
    },
    [data, updateEntry]
  )

  /**
   * Update lay bet details
   */
  const updateLayBet = useCallback(
    (entryId: string, updates: { stake?: number; odds?: number; commissionPercent?: number }) => {
      if (!data) return

      const entry = data.entries.find((e) => e.id === entryId)
      if (!entry) return

      const updatedLayBet = { ...entry.layBet, ...updates }
      const updatedEntry = { ...entry, layBet: updatedLayBet }

      // Recalculate P/L if outcome is known
      const profitLoss =
        entry.outcome !== 'Pending' ? calculateProfitLoss(updatedEntry) : entry.profitLoss

      updateEntry(entryId, {
        layBet: updatedLayBet,
        profitLoss,
      })
    },
    [data, updateEntry]
  )

  /**
   * Update outcome (manual override)
   * Also creates a bonus in The Stable if outcome is 'Bonus' and promo type is set
   */
  const updateOutcome = useCallback(
    (entryId: string, outcome: RaceOutcome, notes?: string) => {
      if (!data) return

      const entry = data.entries.find((e) => e.id === entryId)
      if (!entry) return

      const updatedEntry = { ...entry, outcome, outcomeNotes: notes }
      const profitLoss = calculateProfitLoss(updatedEntry)

      const updates: Partial<TrackedRaceEntry> = {
        outcome,
        outcomeNotes: notes,
        profitLoss,
      }

      // Create bonus in The Stable if outcome is 'Bonus' and promo type is set
      if (outcome === 'Bonus' && entry.promoType && entry.promoType !== 'none') {
        if (!bonusExistsForEntry(entryId) && entry.backBet?.bookie && entry.backBet?.stake) {
          const bookie = entry.backBet.bookie
          const expiryDays = getBookieExpiryDays(bookie)
          const dateEarned = entry.date || dayjs().format('YYYY-MM-DD')
          const expiryDate = dayjs(dateEarned).add(expiryDays, 'day').format('YYYY-MM-DD')

          const bonus = createBonus({
            bookie,
            amount: entry.backBet.stake,
            dateEarned,
            expiryDate,
            sourceEntryId: entryId,
            sourcePromoType: entry.promoType,
            notes: `${entry.track} R${entry.raceNumber} - ${entry.selectionName || 'Selection'}`,
          })

          addBonus(bonus)
          updates.generatedBonusId = bonus.id

          console.log(`[Tracker] Created bonus (manual) for entry ${entryId}:`, {
            bookie,
            amount: entry.backBet.stake,
            expiryDate,
          })
        }
      }

      updateEntry(entryId, updates)
    },
    [data, updateEntry]
  )

  return {
    data,
    entries: data?.entries || [],
    isLoading,
    addEntry,
    addEntryAbove,
    updateEntry,
    removeEntry,
    updateResult,
    updateSelection,
    updateBackBet,
    updateLayBet,
    updateOutcome,
    refresh,
    datesWithData,
    archivedDates,
  }
}
