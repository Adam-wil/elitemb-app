import type {
  TrackedRaceEntry,
  DailyTrackerData,
  ArchivedTrackerDay,
  TrackerSummary,
  RaceOutcome,
  CommissionPreferences,
  BetSide,
} from '../types'
import type { RacingPlanEntry } from '../types'
import { createDefaultSummary, createDefaultBetSide, DEFAULT_COMMISSION_RATE } from '../types'

const TRACKER_STORAGE_KEY = 'elitemb-racing-tracker'
const TRACKER_ARCHIVE_KEY = 'elitemb-racing-tracker-archives'
const COMMISSION_PREFS_KEY = 'elitemb-commission-preferences'
const ARCHIVE_RETENTION_DAYS = 30

/**
 * Internal storage structure
 */
interface TrackerStorage {
  version: number
  data: Record<string, DailyTrackerData> // keyed by date YYYY-MM-DD
}

/**
 * Get the storage object
 */
function getStorage(): TrackerStorage {
  if (typeof window === 'undefined') {
    return { version: 1, data: {} }
  }

  try {
    const stored = localStorage.getItem(TRACKER_STORAGE_KEY)
    if (!stored) {
      return { version: 1, data: {} }
    }
    return JSON.parse(stored) as TrackerStorage
  } catch (error) {
    console.error('Error reading tracker storage:', error)
    return { version: 1, data: {} }
  }
}

/**
 * Save the storage object
 */
function saveStorage(storage: TrackerStorage): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(storage))
  } catch (error) {
    console.error('Error saving tracker storage:', error)
  }
}

/**
 * Get tracker data for a specific date
 */
export function getTrackerData(date: string): DailyTrackerData | null {
  const storage = getStorage()
  return storage.data[date] || null
}

/**
 * Get all dates that have tracker data
 */
export function getDatesWithTrackerData(): string[] {
  const storage = getStorage()
  return Object.keys(storage.data).sort((a, b) => b.localeCompare(a)) // newest first
}

/**
 * Save tracker data for a specific date
 */
export function saveTrackerData(date: string, data: DailyTrackerData): void {
  const storage = getStorage()
  storage.data[date] = {
    ...data,
    updatedAt: new Date().toISOString(),
  }
  saveStorage(storage)
}

/**
 * Create new daily tracker data
 */
export function createDailyTrackerData(date: string): DailyTrackerData {
  const now = new Date().toISOString()
  return {
    date,
    entries: [],
    totalProfit: 0,
    summary: createDefaultSummary(),
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Add entries to tracker for a date
 * If appendMode is true, adds to existing entries; otherwise replaces
 */
export function addTrackerEntries(
  date: string,
  entries: TrackedRaceEntry[],
  appendMode: boolean = true
): DailyTrackerData {
  const existing = getTrackerData(date)
  const now = new Date().toISOString()

  let allEntries: TrackedRaceEntry[]

  if (existing && appendMode) {
    // Append new entries, avoiding duplicates by planEntryId
    const existingIds = new Set(existing.entries.map((e) => e.planEntryId))
    const newEntries = entries.filter((e) => !existingIds.has(e.planEntryId))
    allEntries = [...existing.entries, ...newEntries]
  } else {
    allEntries = entries
  }

  // Sort by time
  allEntries.sort((a, b) => a.time.localeCompare(b.time))

  const data: DailyTrackerData = {
    date,
    entries: allEntries,
    totalProfit: calculateTotalProfit(allEntries),
    summary: calculateSummary(allEntries),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }

  saveTrackerData(date, data)
  return data
}

/**
 * Update a single tracker entry
 */
export function updateTrackerEntry(
  date: string,
  entryId: string,
  updates: Partial<TrackedRaceEntry>
): DailyTrackerData | null {
  const data = getTrackerData(date)
  if (!data) return null

  const entryIndex = data.entries.findIndex((e) => e.id === entryId)
  if (entryIndex === -1) return null

  data.entries[entryIndex] = {
    ...data.entries[entryIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  // Recalculate totals
  data.totalProfit = calculateTotalProfit(data.entries)
  data.summary = calculateSummary(data.entries)

  saveTrackerData(date, data)
  return data
}

/**
 * Remove a tracker entry
 */
export function removeTrackerEntry(date: string, entryId: string): DailyTrackerData | null {
  const data = getTrackerData(date)
  if (!data) return null

  data.entries = data.entries.filter((e) => e.id !== entryId)
  data.totalProfit = calculateTotalProfit(data.entries)
  data.summary = calculateSummary(data.entries)

  saveTrackerData(date, data)
  return data
}

/**
 * Delete tracker data for a date
 */
export function deleteTrackerData(date: string): boolean {
  const storage = getStorage()
  if (!storage.data[date]) return false

  delete storage.data[date]
  saveStorage(storage)
  return true
}

/**
 * Calculate total profit from entries
 */
export function calculateTotalProfit(entries: TrackedRaceEntry[]): number {
  return entries.reduce((sum, entry) => sum + (entry.profitLoss || 0), 0)
}

/**
 * Calculate summary from entries
 */
export function calculateSummary(entries: TrackedRaceEntry[]): TrackerSummary {
  const summary = createDefaultSummary()

  for (const entry of entries) {
    switch (entry.outcome) {
      case '1/W':
        summary.wins++
        break
      case '2/L':
        summary.losses++
        break
      case 'Bonus':
        summary.bonuses++
        break
      case 'Refund':
        summary.refunds++
        break
      case 'Dead Heat':
        summary.deadHeats++
        break
      case 'Middle':
        summary.middles++
        break
      case 'Scratched':
        summary.scratched++
        break
      case 'Pending':
      default:
        summary.pending++
        break
    }
  }

  return summary
}

// ============================================================
// ARCHIVE FUNCTIONS
// ============================================================

/**
 * Get all archived tracker days
 */
export function getArchivedTrackerDays(): ArchivedTrackerDay[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(TRACKER_ARCHIVE_KEY)
    if (!stored) return []
    return JSON.parse(stored) as ArchivedTrackerDay[]
  } catch (error) {
    console.error('Error reading tracker archives:', error)
    return []
  }
}

/**
 * Get archived tracker by date
 */
export function getArchivedTrackerByDate(date: string): ArchivedTrackerDay | null {
  const archives = getArchivedTrackerDays()
  return archives.find((a) => a.date === date) || null
}

/**
 * Get list of archived dates
 */
export function getArchivedTrackerDates(): string[] {
  const archives = getArchivedTrackerDays()
  return archives.map((a) => a.date)
}

/**
 * Check if date has archived tracker
 */
export function hasArchivedTracker(date: string): boolean {
  const archives = getArchivedTrackerDays()
  return archives.some((a) => a.date === date)
}

/**
 * Archive tracker day
 */
export function archiveTrackerDay(date: string): ArchivedTrackerDay | null {
  const data = getTrackerData(date)
  if (!data) return null

  const archives = getArchivedTrackerDays()

  // Build metadata
  const outcomeBreakdown: Record<RaceOutcome, number> = {
    '1/W': 0,
    '2/L': 0,
    Bonus: 0,
    'Dead Heat': 0,
    Middle: 0,
    Refund: 0,
    Pending: 0,
    Scratched: 0,
  }

  const bookiesSet = new Set<string>()
  const tracksSet = new Set<string>()

  for (const entry of data.entries) {
    outcomeBreakdown[entry.outcome]++
    if (entry.backBet.bookie) bookiesSet.add(entry.backBet.bookie)
    if (entry.layBet.bookie) bookiesSet.add(entry.layBet.bookie)
    tracksSet.add(entry.track)
  }

  const archivedDay: ArchivedTrackerDay = {
    date,
    archivedAt: new Date().toISOString(),
    data,
    metadata: {
      totalRaces: data.entries.length,
      totalProfit: data.totalProfit,
      outcomeBreakdown,
      bookiesUsed: Array.from(bookiesSet),
      tracksIncluded: Array.from(tracksSet),
    },
  }

  // Remove existing archive for same date
  const filtered = archives.filter((a) => a.date !== date)
  filtered.push(archivedDay)

  // Sort newest first
  filtered.sort((a, b) => b.date.localeCompare(a.date))

  if (typeof window !== 'undefined') {
    localStorage.setItem(TRACKER_ARCHIVE_KEY, JSON.stringify(filtered))
  }

  return archivedDay
}

/**
 * Delete archived tracker day
 */
export function deleteArchivedTracker(date: string): boolean {
  const archives = getArchivedTrackerDays()
  const filtered = archives.filter((a) => a.date !== date)

  if (filtered.length === archives.length) return false

  if (typeof window !== 'undefined') {
    localStorage.setItem(TRACKER_ARCHIVE_KEY, JSON.stringify(filtered))
  }

  return true
}

/**
 * Restore tracker from archive
 */
export function restoreTrackerFromArchive(date: string): DailyTrackerData | null {
  const archived = getArchivedTrackerByDate(date)
  if (!archived) return null

  saveTrackerData(date, archived.data)
  return archived.data
}

/**
 * Prune old tracker archives
 */
export function pruneOldTrackerArchives(keepDays: number = ARCHIVE_RETENTION_DAYS): number {
  const archives = getArchivedTrackerDays()

  if (archives.length <= keepDays) return 0

  const sorted = [...archives].sort((a, b) => b.date.localeCompare(a.date))
  const pruned = sorted.slice(0, keepDays)
  const removedCount = archives.length - pruned.length

  if (typeof window !== 'undefined') {
    localStorage.setItem(TRACKER_ARCHIVE_KEY, JSON.stringify(pruned))
  }

  return removedCount
}

/**
 * Auto-archive completed days older than today
 */
export function autoArchiveCompletedDays(): string[] {
  const today = new Date().toISOString().split('T')[0]
  const storage = getStorage()
  const archivedDates: string[] = []

  for (const date of Object.keys(storage.data)) {
    if (date < today) {
      const data = storage.data[date]
      // Only archive if all races are completed (no pending)
      const hasPending = data.entries.some((e) => e.outcome === 'Pending')
      if (!hasPending) {
        archiveTrackerDay(date)
        delete storage.data[date]
        archivedDates.push(date)
      }
    }
  }

  if (archivedDates.length > 0) {
    saveStorage(storage)
  }

  return archivedDates
}

// ============================================================
// COMMISSION PREFERENCES
// ============================================================

/**
 * Get user's commission preferences
 */
export function getCommissionPreferences(): CommissionPreferences {
  if (typeof window === 'undefined') {
    return { defaultRate: DEFAULT_COMMISSION_RATE }
  }

  try {
    const stored = localStorage.getItem(COMMISSION_PREFS_KEY)
    if (!stored) {
      return { defaultRate: DEFAULT_COMMISSION_RATE }
    }
    return JSON.parse(stored) as CommissionPreferences
  } catch {
    return { defaultRate: DEFAULT_COMMISSION_RATE }
  }
}

/**
 * Save user's commission preferences
 */
export function saveCommissionPreferences(prefs: CommissionPreferences): void {
  if (typeof window === 'undefined') return

  localStorage.setItem(COMMISSION_PREFS_KEY, JSON.stringify(prefs))
}

/**
 * Get default commission rate
 */
export function getDefaultCommissionRate(): number {
  return getCommissionPreferences().defaultRate
}

/**
 * Set default commission rate
 */
export function setDefaultCommissionRate(rate: number): void {
  saveCommissionPreferences({ defaultRate: rate })
}

// ============================================================
// CONVERSION FUNCTIONS
// ============================================================

/**
 * Convert a RacingPlanEntry to a TrackedRaceEntry
 */
export function convertPlanEntryToTrackedEntry(
  planEntry: RacingPlanEntry,
  date: string
): TrackedRaceEntry {
  const now = new Date().toISOString()
  const defaultCommission = getDefaultCommissionRate()

  // Build promo details from bookie selections
  const normalPromos: Record<string, string> = {}
  const betBackPromos: Record<string, string> = {}

  planEntry.normalPromosByBookie?.forEach((bp) => {
    if (bp.promo) {
      normalPromos[bp.bookie] = bp.promo
    }
  })

  planEntry.betBackPromosByBookie?.forEach((bp) => {
    if (bp.promo) {
      betBackPromos[bp.bookie] = bp.promo
    }
  })

  // Get the first selected normal bookie as the back bet bookie
  const backBookie = planEntry.selectedNormalBookies?.[0] || ''
  // Default lay bookie to Betfair
  const layBookie = 'Betfair'

  return {
    id: crypto.randomUUID(),
    planEntryId: planEntry.id,
    date,
    time: planEntry.time,
    track: planEntry.track,
    raceNumber: planEntry.raceNumber,
    selectionName: '',
    selectionNumber: 0,
    selectedNormalBookies: planEntry.selectedNormalBookies || [],
    selectedBetBackBookies: planEntry.selectedBetBackBookies || [],
    promoDetails: {
      normalPromos,
      betBackPromos,
    },
    backBet: {
      bookie: backBookie,
      stake: 0,
      odds: 0,
    },
    layBet: {
      bookie: layBookie,
      stake: 0,
      odds: 0,
      commissionPercent: defaultCommission,
    },
    unitTier: planEntry.unitTier,
    pollAttempts: 0,
    outcome: 'Pending',
    lockedInAt: now,
    updatedAt: now,
  }
}

/**
 * Lock in multiple plan entries to the tracker
 */
export function lockInPlanEntries(
  planEntries: RacingPlanEntry[],
  date: string,
  appendMode: boolean = true
): DailyTrackerData {
  // Sort by time to maintain sequence
  const sorted = [...planEntries].sort((a, b) => a.time.localeCompare(b.time))

  // Convert to tracked entries
  const trackedEntries = sorted.map((entry) =>
    convertPlanEntryToTrackedEntry(entry, date)
  )

  // Add to tracker storage
  return addTrackerEntries(date, trackedEntries, appendMode)
}
