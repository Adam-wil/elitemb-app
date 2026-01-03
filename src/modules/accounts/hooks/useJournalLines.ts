/**
 * useJournalLines Hook
 *
 * Fetches journal lines for an account with pagination support.
 * Lines are returned in reverse chronological order.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getJournalLinesForAccount,
  type JournalLineWithEntry,
} from '../api/db/journalQueries.server'

interface UseJournalLinesOptions {
  accountId: string
  profileId?: string // Optional - server function will derive from account if not provided
  pageSize?: number
  enabled?: boolean
  startDate?: string // ISO date string for filtering
  endDate?: string // ISO date string for filtering
}

interface UseJournalLinesReturn {
  lines: JournalLineWithEntry[]
  isLoading: boolean
  isLoadingMore: boolean
  isError: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refetch: () => Promise<void>
}

export function useJournalLines(
  options: UseJournalLinesOptions
): UseJournalLinesReturn {
  const { accountId, profileId, pageSize = 50, enabled = true, startDate, endDate } = options

  const [lines, setLines] = useState<JournalLineWithEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)

  // Track current offset for pagination
  const offsetRef = useRef(0)

  // Fetch initial page
  const fetchLines = useCallback(async () => {
    if (!accountId || !enabled) return

    setIsLoading(true)
    setIsError(false)
    setError(null)
    offsetRef.current = 0

    try {
      const result = await getJournalLinesForAccount({
        data: {
          accountId,
          profileId,
          limit: pageSize,
          offset: 0,
          startDate,
          endDate,
        },
      })
      setLines(result)
      setHasMore(result.length === pageSize)
      offsetRef.current = result.length
    } catch (err) {
      setIsError(true)
      setError(
        err instanceof Error ? err : new Error('Failed to fetch journal lines')
      )
    } finally {
      setIsLoading(false)
    }
  }, [accountId, profileId, pageSize, enabled, startDate, endDate])

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (!accountId || !enabled || isLoadingMore || !hasMore)
      return

    setIsLoadingMore(true)

    try {
      const result = await getJournalLinesForAccount({
        data: {
          accountId,
          profileId,
          limit: pageSize,
          offset: offsetRef.current,
          startDate,
          endDate,
        },
      })

      setLines((prev) => [...prev, ...result])
      setHasMore(result.length === pageSize)
      offsetRef.current += result.length
    } catch (err) {
      setIsError(true)
      setError(
        err instanceof Error ? err : new Error('Failed to load more lines')
      )
    } finally {
      setIsLoadingMore(false)
    }
  }, [accountId, profileId, pageSize, enabled, isLoadingMore, hasMore, startDate, endDate])

  // Initial fetch on mount or when dependencies change
  useEffect(() => {
    fetchLines()
  }, [fetchLines])

  return {
    lines,
    isLoading,
    isLoadingMore,
    isError,
    error,
    hasMore,
    loadMore,
    refetch: fetchLines,
  }
}
