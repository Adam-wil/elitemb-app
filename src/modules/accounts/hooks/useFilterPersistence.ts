/**
 * useFilterPersistence Hook
 *
 * Persists the account filter selection to the database so it
 * survives page refreshes and syncs across devices.
 */

import { useState, useEffect, useCallback } from 'react'
import type { AccountFilter } from '../types/ledger'
import {
  getUserPreference,
  updateLedgerFilter,
} from '../api/db/userPreference.server'

// ============================================================================
// Types
// ============================================================================

export interface UseFilterPersistenceReturn {
  /** Current filter value */
  filter: AccountFilter
  /** Set the filter (persists to database) */
  setFilter: (filter: AccountFilter) => void
  /** Whether initial load is in progress */
  isLoading: boolean
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook that persists filter selection to database
 *
 * @param defaultValue - Default filter value while loading
 * @returns Object with filter, setFilter, and isLoading
 */
export function useFilterPersistence(
  defaultValue: AccountFilter = 'all'
): UseFilterPersistenceReturn {
  const [filter, setFilterState] = useState<AccountFilter>(defaultValue)
  const [isLoading, setIsLoading] = useState(true)

  // Load initial preference from database
  useEffect(() => {
    let mounted = true

    async function loadPreference() {
      try {
        const pref = await getUserPreference({ data: {} })
        if (mounted) {
          setFilterState(pref.ledgerFilter)
        }
      } catch (error) {
        console.error('Failed to load user preference:', error)
        // Keep default value on error
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadPreference()

    return () => {
      mounted = false
    }
  }, [])

  // Update filter and persist to database
  const setFilter = useCallback((newFilter: AccountFilter) => {
    // Optimistic update
    setFilterState(newFilter)

    // Persist to database (fire and forget, with error logging)
    updateLedgerFilter({ data: { filter: newFilter } }).catch((error) => {
      console.error('Failed to persist filter preference:', error)
    })
  }, [])

  return { filter, setFilter, isLoading }
}
