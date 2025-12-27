/**
 * useBookieHealth Hook
 *
 * Fetches bookie health/ratio usage data for planner display.
 * Caches results to avoid unnecessary re-fetches.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { getBookieUsageForPlanner } from '../api/db/bookieHealthDb.server'
import type { ChipRatioStatus } from '../types/bookieHealth'

interface UseBookieHealthResult {
  data: Record<string, ChipRatioStatus> | null
  isLoading: boolean
  error: Error | null
  refresh: () => void
}

export function useBookieHealth(bookieNames: string[]): UseBookieHealthResult {
  const [data, setData] = useState<Record<string, ChipRatioStatus> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Cache key based on sorted bookie names
  const cacheKeyRef = useRef<string>('')

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (bookieNames.length === 0) {
      setData({})
      return
    }

    const cacheKey = bookieNames.slice().sort().join(',')

    // Skip if we already have this data (unless forcing refresh)
    if (!forceRefresh && cacheKey === cacheKeyRef.current && data) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getBookieUsageForPlanner({
        data: { bookieNames },
      })

      setData(result.usageMap)
      cacheKeyRef.current = cacheKey
    } catch (err) {
      setError(err as Error)
      console.error('Failed to fetch bookie health data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [bookieNames, data])

  // Fetch on mount and when bookieNames change
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchData(true)
  }, [fetchData])

  return { data, isLoading, error, refresh }
}
