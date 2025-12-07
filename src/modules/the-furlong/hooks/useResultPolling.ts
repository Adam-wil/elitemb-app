import { useState, useEffect, useCallback, useRef } from 'react'
import dayjs from 'dayjs'
import type { TrackedRaceEntry, RaceResultData, RaceOutcome, PollingStatus } from '../types'
import { fetchRaceResult } from '../api/punting-form/trackerResultsService'
import { determineOutcome } from '../utils/outcomeLogic'

interface UseResultPollingOptions {
  date: string
  entries: TrackedRaceEntry[]
  enabled: boolean
  intervalMs?: number // Default 90000 (1.5 minutes)
  raceDelayMinutes?: number // Delay after race time before polling (default 2 min)
  onResultUpdate: (entryId: string, result: RaceResultData, outcome: RaceOutcome) => void
  onError?: (entryId: string, error: Error) => void
}

interface UseResultPollingReturn {
  status: PollingStatus
  startPolling: () => void
  stopPolling: () => void
  pollNow: () => Promise<void>
  pollSingleRace: (entryId: string) => Promise<RaceResultData | null>
  isPolling: boolean
}

const DEFAULT_INTERVAL_MS = 90000 // 1.5 minutes
const DEFAULT_RACE_DELAY_MINUTES = 2 // Start polling 2 mins after race time
const REQUEST_STAGGER_MS = 500 // Delay between individual race requests

/**
 * Hook for polling race results
 * - Polls every 90 seconds for pending races
 * - Only polls races where race time + 2 minutes has passed
 * - Stops polling a race once result is fetched (auto or manual)
 */
export function useResultPolling({
  date,
  entries,
  enabled,
  intervalMs = DEFAULT_INTERVAL_MS,
  raceDelayMinutes = DEFAULT_RACE_DELAY_MINUTES,
  onResultUpdate,
  onError,
}: UseResultPollingOptions): UseResultPollingReturn {
  const [status, setStatus] = useState<PollingStatus>({
    isPolling: false,
    lastPollTime: null,
    nextPollTime: null,
    activeRaces: 0,
    completedRaces: 0,
    errorsCount: 0,
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef(false)

  /**
   * Get entries that should be polled
   * - Only pending outcomes
   * - Race time + delay has passed
   */
  const getPolableEntries = useCallback((): TrackedRaceEntry[] => {
    const now = dayjs()

    return entries.filter((entry) => {
      // Only poll pending races
      if (entry.outcome !== 'Pending') {
        return false
      }

      // Check if race time + delay has passed
      const raceDateTime = dayjs(`${entry.date} ${entry.time}`)
      const pollableTime = raceDateTime.add(raceDelayMinutes, 'minute')

      return now.isAfter(pollableTime)
    })
  }, [entries, raceDelayMinutes])

  /**
   * Poll a single race for results
   * This works for any date - past, present, or future (if race is finished)
   */
  const pollSingleRace = useCallback(
    async (entryId: string): Promise<RaceResultData | null> => {
      console.log(`[Polling] pollSingleRace called for entry: ${entryId}`)

      const entry = entries.find((e) => e.id === entryId)
      if (!entry) {
        console.warn(`[Polling] Entry not found: ${entryId}`)
        return null
      }

      console.log(`[Polling] Found entry:`, {
        track: entry.track,
        date: entry.date,
        raceNumber: entry.raceNumber,
        selectionNumber: entry.selectionNumber,
        selectionName: entry.selectionName,
      })

      try {
        // Fetch result - this works for any date as long as race results exist
        const result = await fetchRaceResult(entry.track, entry.date, entry.raceNumber)
        console.log(`[Polling] fetchRaceResult returned:`, result)

        if (result) {
          // Determine outcome based on selection
          // If user has entered selection number, compare with winner
          let outcome: RaceOutcome = entry.outcome

          if (entry.selectionNumber && entry.selectionNumber > 0) {
            outcome = determineOutcome(
              entry.selectionName || '',
              entry.selectionNumber,
              result
            )
            console.log(`[Polling] Determined outcome: ${outcome} (selection #${entry.selectionNumber} vs winner #${result.winnerNumber})`)
          } else {
            console.log(`[Polling] No selection number, keeping outcome as: ${outcome}`)
          }

          onResultUpdate(entryId, result, outcome)
          return result
        }

        console.warn(`[Polling] No result returned from API`)
        return null
      } catch (error) {
        console.error(`[Polling] Error fetching result:`, error)
        onError?.(entryId, error as Error)
        return null
      }
    },
    [entries, onResultUpdate, onError]
  )

  /**
   * Poll all pending races
   */
  const pollNow = useCallback(async (): Promise<void> => {
    if (isPollingRef.current) return

    isPollingRef.current = true
    setStatus((prev) => ({ ...prev, isPolling: true }))

    const pollableEntries = getPolableEntries()
    let errorsCount = 0

    for (const entry of pollableEntries) {
      try {
        const result = await fetchRaceResult(entry.track, entry.date, entry.raceNumber)

        if (result) {
          // Determine outcome if user has made a selection
          let outcome: RaceOutcome = 'Pending'
          if (entry.selectionName && entry.selectionNumber) {
            outcome = determineOutcome(entry.selectionName, entry.selectionNumber, result)
          }

          onResultUpdate(entry.id, result, outcome)
        }
      } catch (error) {
        errorsCount++
        onError?.(entry.id, error as Error)
      }

      // Stagger requests to avoid rate limiting
      if (pollableEntries.indexOf(entry) < pollableEntries.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, REQUEST_STAGGER_MS))
      }
    }

    const now = new Date().toISOString()
    const nextPoll = new Date(Date.now() + intervalMs).toISOString()

    // Update status
    const pendingCount = entries.filter((e) => e.outcome === 'Pending').length
    const completedCount = entries.filter((e) => e.outcome !== 'Pending').length

    setStatus({
      isPolling: false,
      lastPollTime: now,
      nextPollTime: enabled ? nextPoll : null,
      activeRaces: pendingCount,
      completedRaces: completedCount,
      errorsCount,
    })

    isPollingRef.current = false
  }, [entries, getPolableEntries, onResultUpdate, onError, intervalMs, enabled])

  /**
   * Start automatic polling
   */
  const startPolling = useCallback(() => {
    if (intervalRef.current) return

    // Initial poll
    pollNow()

    // Set up interval
    intervalRef.current = setInterval(() => {
      pollNow()
    }, intervalMs)

    setStatus((prev) => ({
      ...prev,
      nextPollTime: new Date(Date.now() + intervalMs).toISOString(),
    }))
  }, [pollNow, intervalMs])

  /**
   * Stop automatic polling
   */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    setStatus((prev) => ({
      ...prev,
      isPolling: false,
      nextPollTime: null,
    }))
  }, [])

  // Start/stop polling based on enabled flag
  // Using refs to avoid dependency issues that cause infinite loops
  const enabledRef = useRef(enabled)
  const entriesLengthRef = useRef(entries.length)
  enabledRef.current = enabled
  entriesLengthRef.current = entries.length

  useEffect(() => {
    if (enabledRef.current && entriesLengthRef.current > 0) {
      // Initial poll
      pollNow()

      // Set up interval
      intervalRef.current = setInterval(() => {
        pollNow()
      }, intervalMs)

      setStatus((prev) => ({
        ...prev,
        nextPollTime: new Date(Date.now() + intervalMs).toISOString(),
      }))
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, entries.length, intervalMs])

  // Update active/completed counts when entries change
  // Note: We avoid putting stopPolling in deps to prevent infinite loops
  useEffect(() => {
    const pendingCount = entries.filter((e) => e.outcome === 'Pending').length
    const completedCount = entries.filter((e) => e.outcome !== 'Pending').length

    setStatus((prev) => ({
      ...prev,
      activeRaces: pendingCount,
      completedRaces: completedCount,
    }))

    // Stop polling if no more pending races
    if (pendingCount === 0 && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      setStatus((prev) => ({
        ...prev,
        isPolling: false,
        nextPollTime: null,
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries])

  return {
    status,
    startPolling,
    stopPolling,
    pollNow,
    pollSingleRace,
    isPolling: status.isPolling,
  }
}
