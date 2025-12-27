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
import { markBonusAsTurnedOver, getBonusById } from '@/modules/the-stable'

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
   * Also marks linked bonus as turned over when outcome changes to a final state
   */
  const updateEntry = useCallback(
    (entryId: string, updates: Partial<TrackedRaceEntry>) => {
      // Check if we need to mark a bonus as turned over
      if (updates.outcome && data) {
        const entry = data.entries.find((e) => e.id === entryId)
        if (entry && entry.linkedBonusId) {
          const isFinalOutcome = updates.outcome !== 'Pending'
          const wasNotFinal = entry.outcome === 'Pending'

          if (isFinalOutcome && wasNotFinal) {
            // Check if bonus still exists and is pending
            const bonus = getBonusById(entry.linkedBonusId)
            if (bonus && bonus.status === 'pending') {
              // Mark the bonus as turned over with the P/L
              const entryWithOutcome = { ...entry, ...updates }
              const profitLoss = calculateProfitLoss(entryWithOutcome as TrackedRaceEntry)
              markBonusAsTurnedOver(entry.linkedBonusId, profitLoss)
              console.log(`[LayManager] Marked bonus ${entry.linkedBonusId} as turned over with P/L: $${profitLoss}`)
            }
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
   * Also marks linked bonus as turned over when outcome is set
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

      // Mark linked bonus as turned over when race completes
      if (entry.linkedBonusId && entry.outcome === 'Pending' && outcome !== 'Pending') {
        const bonus = getBonusById(entry.linkedBonusId)
        if (bonus && bonus.status === 'pending') {
          markBonusAsTurnedOver(entry.linkedBonusId, updatedEntry.profitLoss)
          console.log(`[LayManager] Marked bonus ${entry.linkedBonusId} as turned over (via polling) with P/L: $${updatedEntry.profitLoss}`)
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
   */
  const updateOutcome = useCallback(
    (entryId: string, outcome: RaceOutcome, notes?: string) => {
      if (!data) return

      const entry = data.entries.find((e) => e.id === entryId)
      if (!entry) return

      const updatedEntry = { ...entry, outcome, outcomeNotes: notes }
      const profitLoss = calculateProfitLoss(updatedEntry)

      updateEntry(entryId, {
        outcome,
        outcomeNotes: notes,
        profitLoss,
      })
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
