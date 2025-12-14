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

const TRACKER_STORAGE_KEY = 'elitemb-lay-tracker'
const TRACKER_ARCHIVE_KEY = 'elitemb-lay-tracker-archives'
const COMMISSION_PREFS_KEY = 'elitemb-lay-commission-preferences'
const ARCHIVE_RETENTION_DAYS = 30

// ============================================================
// TRACK TO STATE MAPPING
// ============================================================

/**
 * State commission rates interface (matches TrackerSidePanel)
 */
export interface StateCommissionRate {
  id: string
  rate: number
}

/**
 * Australian and NZ tracks mapped to their state/territory codes
 */
const TRACK_TO_STATE: Record<string, string> = {
  // New South Wales (NSW) - 10%
  'RANDWICK': 'nsw', 'ROSEHILL': 'nsw', 'ROSEHILL GARDENS': 'nsw', 'WARWICK FARM': 'nsw',
  'CANTERBURY': 'nsw', 'CANTERBURY PARK': 'nsw', 'GOSFORD': 'nsw', 'NEWCASTLE': 'nsw',
  'KEMBLA GRANGE': 'nsw', 'HAWKESBURY': 'nsw', 'WYONG': 'nsw', 'SCONE': 'nsw',
  'GRAFTON': 'nsw', 'TAMWORTH': 'nsw', 'MUSWELLBROOK': 'nsw', 'DUBBO': 'nsw',
  'ALBURY': 'nsw', 'WAGGA': 'nsw', 'WAGGA WAGGA': 'nsw', 'PORT MACQUARIE': 'nsw',
  'COFFS HARBOUR': 'nsw', 'MORUYA': 'nsw', 'NOWRA': 'nsw', 'QUEANBEYAN': 'nsw',
  'TAREE': 'nsw', 'BATHURST': 'nsw', 'MUDGEE': 'nsw', 'GOULBURN': 'nsw',
  'GUNDAGAI': 'nsw', 'BALLINA': 'nsw', 'LISMORE': 'nsw', 'CASINO': 'nsw',
  'MOREE': 'nsw', 'INVERELL': 'nsw', 'ARMIDALE': 'nsw', 'COONAMBLE': 'nsw',
  'COONABARABRAN': 'nsw', 'NARROMINE': 'nsw', 'PARKES': 'nsw', 'ORANGE': 'nsw',
  'WELLINGTON': 'nsw', 'GILGANDRA': 'nsw', 'CONDOBOLIN': 'nsw', 'FORBES': 'nsw',
  'COWRA': 'nsw', 'YOUNG': 'nsw', 'COOTAMUNDRA': 'nsw', 'TEMORA': 'nsw',
  'JUNEE': 'nsw', 'COROWA': 'nsw', 'DENILIQUIN': 'nsw', 'HAY': 'nsw',
  'BROKEN HILL': 'nsw', 'BOURKE': 'nsw', 'NYNGAN': 'nsw',

  // Victoria (VIC) - 8%
  'FLEMINGTON': 'vic', 'CAULFIELD': 'vic', 'MOONEE VALLEY': 'vic', 'SANDOWN': 'vic',
  'SANDOWN HILLSIDE': 'vic', 'SANDOWN LAKESIDE': 'vic', 'CRANBOURNE': 'vic', 'PAKENHAM': 'vic',
  'MORNINGTON': 'vic', 'BALLARAT': 'vic', 'GEELONG': 'vic', 'BENDIGO': 'vic',
  'SALE': 'vic', 'WARRNAMBOOL': 'vic', 'KYNETON': 'vic', 'ECHUCA': 'vic',
  'WANGARATTA': 'vic', 'BENALLA': 'vic', 'SEYMOUR': 'vic', 'YARRA VALLEY': 'vic',
  'BAL-SYNTH': 'vic', 'TATURA': 'vic', 'MOE': 'vic', 'BAIRNSDALE': 'vic',
  'STAWELL': 'vic', 'ARARAT': 'vic', 'HAMILTON': 'vic', 'COLAC': 'vic',
  'CAMPERDOWN': 'vic', 'TERANG': 'vic', 'MORTLAKE': 'vic', 'WODONGA': 'vic',
  'KILMORE': 'vic', 'HANGING ROCK': 'vic', 'DONALD': 'vic', 'ST ARNAUD': 'vic',
  'STONY CREEK': 'vic', 'MILDURA': 'vic', 'SWAN HILL': 'vic', 'KERANG': 'vic',
  'AVOCA': 'vic', 'BALLAN': 'vic', 'CASTERTON': 'vic', 'COLERAINE': 'vic',
  'DUNKELD': 'vic', 'HORSHAM': 'vic', 'NHILL': 'vic', 'EDENHOPE': 'vic',
  'GREAT WESTERN': 'vic', 'WERRIBEE': 'vic', 'SPORTSBET-PAKENHAM': 'vic',

  // Queensland (QLD) - 8%
  'EAGLE FARM': 'qld', 'DOOMBEN': 'qld', 'GOLD COAST': 'qld', 'SUNSHINE COAST': 'qld',
  'IPSWICH': 'qld', 'TOOWOOMBA': 'qld', 'CAIRNS': 'qld', 'TOWNSVILLE': 'qld',
  'MACKAY': 'qld', 'ROCKHAMPTON': 'qld', 'BUNDABERG': 'qld', 'CALLAGHAN PARK': 'qld',
  'BEAUDESERT': 'qld', 'GATTON': 'qld', 'KILCOY': 'qld', 'NANANGO': 'qld',
  'GYMPIE': 'qld', 'DALBY': 'qld', 'WARWICK': 'qld', 'STANTHORPE': 'qld',
  'ROMA': 'qld', 'CHARLEVILLE': 'qld', 'CUNNAMULLA': 'qld', 'LONGREACH': 'qld',
  'BARCALDINE': 'qld', 'EMERALD': 'qld', 'CLERMONT': 'qld', 'MORANBAH': 'qld',
  'BOWEN': 'qld', 'PROSERPINE': 'qld', 'INNISFAIL': 'qld', 'ATHERTON': 'qld',
  'MAREEBA': 'qld', 'MOUNT ISA': 'qld', 'CLONCURRY': 'qld', 'JULIA CREEK': 'qld',
  'RICHMOND': 'qld', 'HUGHENDEN': 'qld', 'CHARTERS TOWERS': 'qld', 'AYR': 'qld',
  'HOME HILL': 'qld', 'COLLINSVILLE': 'qld', 'GLADSTONE': 'qld', 'BILOELA': 'qld',
  'MONTO': 'qld', 'CHINCHILLA': 'qld', 'MILES': 'qld', 'GOONDIWINDI': 'qld',
  'ST GEORGE': 'qld', 'DIRRANBANDI': 'qld', 'THANGOOL': 'qld',

  // South Australia (SA) - 8%
  'MORPHETTVILLE': 'sa', 'MORPHETTVILLE PARKS': 'sa', 'MURRAY BRIDGE': 'sa', 'GAWLER': 'sa',
  'STRATHALBYN': 'sa', 'PORT LINCOLN': 'sa', 'MOUNT GAMBIER': 'sa', 'BORDERTOWN': 'sa',
  'NARACOORTE': 'sa', 'PENOLA': 'sa', 'MILLICENT': 'sa', 'PORT AUGUSTA': 'sa',
  'BALAKLAVA': 'sa', 'CLARE': 'sa', 'PORT PIRIE': 'sa', 'KADINA': 'sa',
  'CEDUNA': 'sa', 'OAKBANK': 'sa',

  // Western Australia (WA) - 8%
  'ASCOT': 'wa', 'BELMONT': 'wa', 'BELMONT PARK': 'wa', 'PINJARRA': 'wa',
  'BUNBURY': 'wa', 'KALGOORLIE': 'wa', 'ALBANY': 'wa', 'GERALDTON': 'wa',
  'NORTHAM': 'wa', 'YORK': 'wa', 'NARROGIN': 'wa', 'LARK HILL': 'wa',
  'BROOME': 'wa', 'CARNARVON': 'wa', 'ESPERANCE': 'wa', 'MT BARKER': 'wa',
  'BEVERLEY': 'wa', 'CUNDERDIN': 'wa', 'MERREDIN': 'wa', 'MOORA': 'wa',
  'WONGAN HILLS': 'wa', 'WAGIN': 'wa', 'KATANNING': 'wa', 'PINGELLY': 'wa',
  'KULIN': 'wa', 'CORRIGIN': 'wa', 'TOODYAY': 'wa',

  // Tasmania (TAS) - 8%
  'HOBART': 'tas', 'LAUNCESTON': 'tas', 'DEVONPORT': 'tas', 'SPREYTON': 'tas',
  'SCOTTSDALE': 'tas', 'LONGFORD': 'tas', 'BURNIE': 'tas',

  // Northern Territory (NT) - 8%
  'DARWIN': 'nt', 'FANNIE BAY': 'nt', 'ALICE SPRINGS': 'nt', 'KATHERINE': 'nt', 'TENNANT CREEK': 'nt',

  // Australian Capital Territory (ACT) - 10%
  'CANBERRA': 'act', 'THOROUGHBRED PARK': 'act',

  // New Zealand (NZ) - 6%
  'ELLERSLIE': 'nz', 'TRENTHAM': 'nz', 'RICCARTON': 'nz', 'TE RAPA': 'nz',
  'HASTINGS': 'nz', 'OTAKI': 'nz', 'AWAPUNI': 'nz', 'WANGANUI': 'nz',
  'NEW PLYMOUTH': 'nz', 'HAWERA': 'nz', 'TE AROHA': 'nz', 'MATAMATA': 'nz',
  'CAMBRIDGE': 'nz', 'ROTORUA': 'nz', 'TAUPO': 'nz', 'TAURANGA': 'nz',
  'RUAKAKA': 'nz', 'PUKEKOHE': 'nz', 'AVONDALE': 'nz', 'WAIKATO': 'nz',
  'WAIPA': 'nz', 'WOODVILLE': 'nz', 'WAVERLEY': 'nz', 'TAUHERENIKAU': 'nz',
  'WINGATUI': 'nz', 'ASCOT PARK': 'nz', 'INVERCARGILL': 'nz', 'GORE': 'nz',
  'CROMWELL': 'nz', 'OAMARU': 'nz', 'TIMARU': 'nz', 'ASHBURTON': 'nz',
  'RANGIORA': 'nz', 'METHVEN': 'nz', 'WESTPORT': 'nz', 'GREYMOUTH': 'nz',
  'REEFTON': 'nz', 'HOKITIKA': 'nz', 'KUMARA': 'nz', 'NELSON': 'nz',
  'BLENHEIM': 'nz', 'KUROW': 'nz', 'WAIMATE': 'nz', 'WYNDHAM': 'nz',
  'RIVERTON': 'nz', 'WAIKOUAITI': 'nz', 'ROXBURGH': 'nz', 'OMAKAU': 'nz',
  'TAPANUI': 'nz', 'BALCLUTHA': 'nz',
}

/**
 * Look up the state/territory for a given track name
 */
export function getStateForTrack(trackName: string): string {
  const normalized = trackName.toUpperCase().trim()

  // Try exact match first
  if (TRACK_TO_STATE[normalized]) {
    return TRACK_TO_STATE[normalized]
  }

  // Try partial match for variations like "KEMBLA HEATH"
  const trackWords = normalized.split(/\s+/)
  const firstWord = trackWords[0]

  if (TRACK_TO_STATE[firstWord]) {
    return TRACK_TO_STATE[firstWord]
  }

  if (trackWords.length >= 2) {
    const firstTwoWords = `${trackWords[0]} ${trackWords[1]}`
    if (TRACK_TO_STATE[firstTwoWords]) {
      return TRACK_TO_STATE[firstTwoWords]
    }
  }

  for (const knownTrack of Object.keys(TRACK_TO_STATE)) {
    const knownWords = knownTrack.split(/\s+/)
    if (knownWords[0] === firstWord) {
      return TRACK_TO_STATE[knownTrack]
    }
  }

  return 'int'
}

/**
 * Get commission rate for a track based on state commissions
 */
export function getCommissionForTrack(
  trackName: string,
  stateCommissions: StateCommissionRate[]
): number {
  const stateId = getStateForTrack(trackName)
  const stateRate = stateCommissions.find((s) => s.id === stateId)
  return stateRate?.rate ?? 6
}

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
 * Add a new empty tracker entry
 */
export function addTrackerEntry(date: string, afterId?: string): DailyTrackerData {
  const now = new Date().toISOString()
  const defaultCommission = getDefaultCommissionRate()

  const newEntry: TrackedRaceEntry = {
    id: crypto.randomUUID(),
    planEntryId: '',
    date,
    time: '',
    track: '',
    raceNumber: 0,
    selectionName: '',
    selectionNumber: 0,
    selectedNormalBookies: [],
    selectedBetBackBookies: [],
    promoDetails: { normalPromos: {}, betBackPromos: {} },
    backBet: { bookie: '', stake: 0, odds: 0 },
    layBet: { bookie: 'Betfair', stake: 0, odds: 0, commissionPercent: defaultCommission },
    unitTier: 'neutral',
    pollAttempts: 0,
    outcome: 'Pending',
    lockedInAt: now,
    updatedAt: now,
    readOnly: false,
  }

  let data = getTrackerData(date)
  if (!data) {
    data = createDailyTrackerData(date)
  }

  if (afterId) {
    const index = data.entries.findIndex((e) => e.id === afterId)
    if (index !== -1) {
      data.entries.splice(index + 1, 0, newEntry)
    } else {
      data.entries.push(newEntry)
    }
  } else {
    data.entries.push(newEntry)
  }

  data.updatedAt = now
  saveTrackerData(date, data)
  return data
}

/**
 * Add a new empty tracker entry above a specified entry
 */
export function addTrackerEntryAbove(date: string, beforeId: string): DailyTrackerData {
  const now = new Date().toISOString()
  const defaultCommission = getDefaultCommissionRate()

  const newEntry: TrackedRaceEntry = {
    id: crypto.randomUUID(),
    planEntryId: '',
    date,
    time: '',
    track: '',
    raceNumber: 0,
    selectionName: '',
    selectionNumber: 0,
    selectedNormalBookies: [],
    selectedBetBackBookies: [],
    promoDetails: { normalPromos: {}, betBackPromos: {} },
    backBet: { bookie: '', stake: 0, odds: 0 },
    layBet: { bookie: 'Betfair', stake: 0, odds: 0, commissionPercent: defaultCommission },
    unitTier: 'neutral',
    pollAttempts: 0,
    outcome: 'Pending',
    lockedInAt: now,
    updatedAt: now,
    readOnly: false,
  }

  let data = getTrackerData(date)
  if (!data) {
    data = createDailyTrackerData(date)
  }

  const index = data.entries.findIndex((e) => e.id === beforeId)
  if (index !== -1) {
    data.entries.splice(index, 0, newEntry)
  } else {
    data.entries.unshift(newEntry)
  }

  data.updatedAt = now
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
 * Convert a RacingPlanEntry to multiple TrackedRaceEntry items
 * Creates one entry per selected bookie (both normal and bet back)
 */
export function convertPlanEntryToTrackedEntries(
  planEntry: RacingPlanEntry,
  date: string,
  stateCommissions?: StateCommissionRate[]
): TrackedRaceEntry[] {
  const now = new Date().toISOString()

  // Get commission rate: use state-based rate if stateCommissions provided
  const commissionRate = stateCommissions
    ? getCommissionForTrack(planEntry.track, stateCommissions)
    : getDefaultCommissionRate()

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

  const entries: TrackedRaceEntry[] = []

  // Create an entry for each normal bookie
  const normalBookies = planEntry.selectedNormalBookies || []
  for (const bookie of normalBookies) {
    entries.push({
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
      promoDetails: { normalPromos, betBackPromos },
      backBet: { bookie, stake: 0, odds: 0 },
      layBet: { bookie: 'Betfair', stake: 0, odds: 0, commissionPercent: commissionRate },
      unitTier: planEntry.unitTier,
      pollAttempts: 0,
      outcome: 'Pending',
      lockedInAt: now,
      updatedAt: now,
    })
  }

  // Create an entry for each bet back bookie
  const betBackBookies = planEntry.selectedBetBackBookies || []
  for (const bookie of betBackBookies) {
    entries.push({
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
      promoDetails: { normalPromos, betBackPromos },
      backBet: { bookie, stake: 0, odds: 0 },
      layBet: { bookie: 'Betfair', stake: 0, odds: 0, commissionPercent: commissionRate },
      unitTier: planEntry.unitTier,
      pollAttempts: 0,
      outcome: 'Pending',
      lockedInAt: now,
      updatedAt: now,
    })
  }

  // If no bookies selected, still create one entry with empty bookie
  if (entries.length === 0) {
    entries.push({
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
      promoDetails: { normalPromos, betBackPromos },
      backBet: { bookie: '', stake: 0, odds: 0 },
      layBet: { bookie: 'Betfair', stake: 0, odds: 0, commissionPercent: commissionRate },
      unitTier: planEntry.unitTier,
      pollAttempts: 0,
      outcome: 'Pending',
      lockedInAt: now,
      updatedAt: now,
    })
  }

  return entries
}

/**
 * Lock in multiple plan entries to the tracker
 */
export function lockInPlanEntries(
  planEntries: RacingPlanEntry[],
  date: string,
  appendMode: boolean = true,
  stateCommissions?: StateCommissionRate[]
): DailyTrackerData {
  // Sort by time to maintain sequence
  const sorted = [...planEntries].sort((a, b) => a.time.localeCompare(b.time))

  // Convert to tracked entries - flatten since each plan entry can produce multiple tracked entries
  const trackedEntries = sorted.flatMap((entry) =>
    convertPlanEntryToTrackedEntries(entry, date, stateCommissions)
  )

  // Add to tracker storage
  return addTrackerEntries(date, trackedEntries, appendMode)
}
