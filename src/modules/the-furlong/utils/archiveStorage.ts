import type { RacingPlanEntry } from '../types'

/**
 * Archived racing plan for a specific date
 */
export interface ArchivedPlan {
  date: string // YYYY-MM-DD format
  archivedAt: string // ISO timestamp
  entries: RacingPlanEntry[]
  metadata?: {
    totalRaces: number
    skippedRaces: number
    tracksIncluded: string[]
  }
}

const ARCHIVE_STORAGE_KEY = 'elitemb-racing-plan-archives'

/**
 * Get all archived plans from localStorage
 */
export function getArchivedPlans(): ArchivedPlan[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(ARCHIVE_STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored) as ArchivedPlan[]
  } catch (error) {
    console.error('Error reading archived plans:', error)
    return []
  }
}

/**
 * Get archived plan for a specific date
 */
export function getArchivedPlanByDate(date: string): ArchivedPlan | null {
  const archives = getArchivedPlans()
  return archives.find(a => a.date === date) || null
}

/**
 * Archive a racing plan for a specific date
 * If an archive already exists for that date, it will be replaced
 */
export function archivePlan(date: string, entries: RacingPlanEntry[]): ArchivedPlan {
  const archives = getArchivedPlans()

  // Create metadata
  const tracks = [...new Set(entries.map(e => e.track))]
  const metadata = {
    totalRaces: entries.length,
    skippedRaces: entries.filter(e => e.skip).length,
    tracksIncluded: tracks,
  }

  const archivedPlan: ArchivedPlan = {
    date,
    archivedAt: new Date().toISOString(),
    entries,
    metadata,
  }

  // Remove existing archive for this date if it exists
  const filteredArchives = archives.filter(a => a.date !== date)

  // Add new archive
  filteredArchives.push(archivedPlan)

  // Sort by date (newest first)
  filteredArchives.sort((a, b) => b.date.localeCompare(a.date))

  // Save to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(filteredArchives))
  }

  return archivedPlan
}

/**
 * Delete an archived plan by date
 */
export function deleteArchivedPlan(date: string): boolean {
  const archives = getArchivedPlans()
  const filteredArchives = archives.filter(a => a.date !== date)

  if (filteredArchives.length === archives.length) {
    return false // Nothing was deleted
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(filteredArchives))
  }

  return true
}

/**
 * Get list of dates that have archived plans
 */
export function getArchivedDates(): string[] {
  const archives = getArchivedPlans()
  return archives.map(a => a.date)
}

/**
 * Check if a date has an archived plan
 */
export function hasArchivedPlan(date: string): boolean {
  const archives = getArchivedPlans()
  return archives.some(a => a.date === date)
}

/**
 * Clear all archived plans (use with caution)
 */
export function clearAllArchives(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ARCHIVE_STORAGE_KEY)
  }
}

/**
 * Get archive storage size in bytes (approximate)
 */
export function getArchiveStorageSize(): number {
  if (typeof window === 'undefined') return 0

  const stored = localStorage.getItem(ARCHIVE_STORAGE_KEY)
  if (!stored) return 0

  return new Blob([stored]).size
}

/**
 * Prune old archives to keep storage manageable
 * Keeps the most recent N archives
 */
export function pruneOldArchives(keepCount: number = 30): number {
  const archives = getArchivedPlans()

  if (archives.length <= keepCount) {
    return 0 // Nothing to prune
  }

  // Sort by date (newest first) and keep only the most recent
  const sortedArchives = [...archives].sort((a, b) => b.date.localeCompare(a.date))
  const prunedArchives = sortedArchives.slice(0, keepCount)
  const removedCount = archives.length - prunedArchives.length

  if (typeof window !== 'undefined') {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(prunedArchives))
  }

  return removedCount
}
