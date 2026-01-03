/**
 * useJournalEntryDetail Hook
 *
 * Fetches a single journal entry with all its lines and account details.
 * Used by JournalGroupDetail component.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getJournalEntryDetail,
  type JournalEntryDetail,
} from '../api/db/journalQueries.server'

interface UseJournalEntryDetailOptions {
  journalEntryId: string
  profileId?: string // Optional - server will query by entry ID alone
  enabled?: boolean
}

interface UseJournalEntryDetailReturn {
  entry: JournalEntryDetail | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useJournalEntryDetail(
  options: UseJournalEntryDetailOptions
): UseJournalEntryDetailReturn {
  const { journalEntryId, profileId, enabled = true } = options

  const [entry, setEntry] = useState<JournalEntryDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchEntry = useCallback(async () => {
    // Only require journalEntryId - profileId is optional
    if (!journalEntryId || !enabled) return

    setIsLoading(true)
    setIsError(false)
    setError(null)

    try {
      const result = await getJournalEntryDetail({
        data: {
          journalEntryId,
          ...(profileId ? { profileId } : {}),
        },
      })
      setEntry(result)
    } catch (err) {
      setIsError(true)
      setError(
        err instanceof Error ? err : new Error('Failed to fetch journal entry')
      )
    } finally {
      setIsLoading(false)
    }
  }, [journalEntryId, profileId, enabled])

  useEffect(() => {
    fetchEntry()
  }, [fetchEntry])

  return {
    entry,
    isLoading,
    isError,
    error,
    refetch: fetchEntry,
  }
}
