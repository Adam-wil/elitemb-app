/**
 * useLastReconciled Hook
 *
 * Tracks when the user last reconciled their accounts.
 * Updates timestamp when user views Attention filter or manually reconciles.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getUserPreference,
  updateLastReconciled,
} from '../api/db/userPreference.server'

// ============================================================================
// Types
// ============================================================================

export interface UseLastReconciledReturn {
  /** Last reconciled timestamp (ISO string) or null */
  lastReconciledAt: string | null
  /** Days since last reconciliation */
  daysSinceReconciled: number | null
  /** Whether data is loading */
  isLoading: boolean
  /** Mark as reconciled now */
  markReconciled: () => Promise<void>
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000 // hours * minutes * seconds * milliseconds
  const diffDays = Math.floor(Math.abs(date1.getTime() - date2.getTime()) / oneDay)
  return diffDays
}

/**
 * Format the "last reconciled" message
 */
export function formatLastReconciled(daysSince: number | null): string {
  if (daysSince === null) {
    return 'Never reconciled'
  }
  if (daysSince === 0) {
    return 'Reconciled today'
  }
  if (daysSince === 1) {
    return 'Reconciled yesterday'
  }
  return `Last reconciled ${daysSince} days ago`
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to track and update last reconciled timestamp
 */
export function useLastReconciled(): UseLastReconciledReturn {
  const [lastReconciledAt, setLastReconciledAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load initial value from database
  useEffect(() => {
    let mounted = true

    async function loadPreference() {
      try {
        const pref = await getUserPreference({ data: {} })
        if (mounted) {
          setLastReconciledAt(pref.lastReconciledAt)
        }
      } catch (error) {
        console.error('Failed to load last reconciled:', error)
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

  // Calculate days since last reconciled
  const daysSinceReconciled = lastReconciledAt
    ? daysBetween(new Date(lastReconciledAt), new Date())
    : null

  // Mark as reconciled now
  const markReconciled = useCallback(async () => {
    try {
      const pref = await updateLastReconciled({ data: {} })
      setLastReconciledAt(pref.lastReconciledAt)
    } catch (error) {
      console.error('Failed to update last reconciled:', error)
    }
  }, [])

  return {
    lastReconciledAt,
    daysSinceReconciled,
    isLoading,
    markReconciled,
  }
}
