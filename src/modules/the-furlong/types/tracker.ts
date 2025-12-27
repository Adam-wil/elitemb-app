import type { UnitTier } from './index'

/**
 * Promo types for matched betting
 */
export type PromoType =
  | 'none'           // Standard win/lose - no bonus promo
  | '2nd_bonus'      // 2nd place = Bonus
  | '2nd_3rd_bonus'  // 2nd or 3rd place = Bonus
  | 'bet_back'       // Non-win = Bonus (bet back promos)

/**
 * Promo type configuration
 */
export const PROMO_TYPE_CONFIG: Record<PromoType, { label: string; description: string; bonusPlaces: number[] }> = {
  'none': { label: 'None', description: 'Standard matched bet', bonusPlaces: [] },
  '2nd_bonus': { label: '2nd Bonus', description: 'Bonus if 2nd place', bonusPlaces: [2] },
  '2nd_3rd_bonus': { label: '2nd/3rd', description: 'Bonus if 2nd or 3rd', bonusPlaces: [2, 3] },
  'bet_back': { label: 'Bet Back', description: 'Bonus if horse loses', bonusPlaces: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
}

/**
 * Outcome types for race tracking
 */
export type RaceOutcome =
  | '1/W'        // Back bet wins OR 1st side of 2-way dutch wins
  | '2/L'        // Back bet loses OR 2nd side of dutch wins
  | 'Bonus'      // Bet loses but qualifies for bonus bet
  | 'Dead Heat'  // Horse involved in dead heat
  | 'Middle'     // Hit a middle on 2-way dutch
  | 'Refund'     // Thankyou Neds method OR promo cash back
  | 'Pending'    // Race not yet completed
  | 'Scratched'  // Selected horse was scratched

/**
 * Outcome configuration for display
 */
export const OUTCOME_CONFIG: Record<RaceOutcome, { label: string; color: string; bgColor: string }> = {
  '1/W': { label: '1/W', color: '#2e7d32', bgColor: '#c8e6c9' },
  '2/L': { label: '2/L', color: '#c62828', bgColor: '#ffcdd2' },
  'Bonus': { label: 'Bonus', color: '#1565c0', bgColor: '#bbdefb' },
  'Dead Heat': { label: 'Dead Heat', color: '#f57c00', bgColor: '#ffe0b2' },
  'Middle': { label: 'Middle', color: '#7b1fa2', bgColor: '#e1bee7' },
  'Refund': { label: 'Refund', color: '#616161', bgColor: '#eeeeee' },
  'Pending': { label: 'Pending', color: '#9e9e9e', bgColor: '#f5f5f5' },
  'Scratched': { label: 'Scratched', color: '#d32f2f', bgColor: '#ffebee' },
}

/**
 * Bet side information (backing or laying)
 */
export interface BetSide {
  bookie: string
  stake: number
  odds: number
  commissionPercent?: number // For Betfair/exchanges - user editable per race
}

/**
 * Place information for a finishing position
 */
export interface PlaceInfo {
  number: number      // Horse/runner number
  name: string        // Horse name
  margin?: number     // Winning/placing margin
  deadHeat?: boolean  // True if dead heat at this position
}

/**
 * API result data from PuntingForm
 */
export interface RaceResultData {
  // Structured placings (1st, 2nd, 3rd)
  places: {
    first: PlaceInfo | null
    second: PlaceInfo | null
    third: PlaceInfo | null
  }
  // Legacy fields for backward compatibility
  winnerName: string
  winnerNumber: number
  position?: number
  margin?: number
  deadHeat: boolean
  scratched: number[] // List of scratched runner numbers
  fetchedAt: string   // ISO timestamp
}

/**
 * Individual tracked race entry
 */
export interface TrackedRaceEntry {
  id: string                          // UUID
  planEntryId: string                 // Reference to original RacingPlanEntry.id
  date: string                        // YYYY-MM-DD

  // Race identification
  time: string                        // HH:mm
  track: string
  raceNumber: number
  meetingId?: number                  // PuntingForm meeting ID

  // User selection
  selectionName: string               // Horse name (manual entry)
  selectionNumber: number             // Horse number (manual entry)

  // Bookie selections from planner
  selectedNormalBookies: string[]
  selectedBetBackBookies: string[]
  promoDetails: {                     // Stored promo info for reference
    normalPromos: Record<string, string>   // bookie -> promo text
    betBackPromos: Record<string, string>
  }

  // Promo type for this race (determines bonus eligibility)
  promoType: PromoType

  // Bet details
  backBet: BetSide                    // Bookie 1 (backing)
  layBet: BetSide                     // Bookie 2 (Betfair/exchange)

  // Unit tier from planner
  unitTier: UnitTier

  // Result tracking
  autoResult?: RaceResultData
  lastPolledAt?: string               // ISO timestamp
  pollAttempts: number

  // Outcome
  outcome: RaceOutcome
  outcomeNotes?: string               // User notes for refunds/special cases

  // Profit calculation
  profitLoss?: number                 // Calculated P/L after outcome known

  // Bonus tracking (link to The Stable)
  generatedBonusId?: string           // ID of bonus created when outcome = Bonus

  // Metadata
  lockedInAt: string                  // ISO timestamp when locked in
  updatedAt: string                   // ISO timestamp of last update

  // Row state
  readOnly?: boolean                  // If true, row is locked from editing
}

/**
 * Summary statistics for a day's tracking
 */
export interface TrackerSummary {
  wins: number
  losses: number
  bonuses: number
  refunds: number
  deadHeats: number
  middles: number
  scratched: number
  pending: number
}

/**
 * Daily tracker data structure
 */
export interface DailyTrackerData {
  date: string                        // YYYY-MM-DD
  entries: TrackedRaceEntry[]
  totalProfit: number
  summary: TrackerSummary
  createdAt: string
  updatedAt: string
}

/**
 * Archived tracker data (for historical storage)
 */
export interface ArchivedTrackerDay {
  date: string
  archivedAt: string
  data: DailyTrackerData
  metadata: {
    totalRaces: number
    totalProfit: number
    outcomeBreakdown: Record<RaceOutcome, number>
    bookiesUsed: string[]
    tracksIncluded: string[]
  }
}

/**
 * Polling status for UI
 */
export interface PollingStatus {
  isPolling: boolean
  lastPollTime: string | null
  nextPollTime: string | null
  activeRaces: number      // Races still pending result
  completedRaces: number   // Races with results
  errorsCount: number
}

/**
 * User's default commission preference (can be overridden per race)
 * - Auto-populates when locking in races
 * - User can manually edit on individual races (e.g., for half-price specials)
 */
export interface CommissionPreferences {
  defaultRate: number // User's default Betfair commission rate (e.g., 5 for 5%)
}

/**
 * Default commission rate for new users
 */
export const DEFAULT_COMMISSION_RATE = 5 // 5%

/**
 * Create default empty bet side
 */
export function createDefaultBetSide(bookie: string = ''): BetSide {
  return {
    bookie,
    stake: 0,
    odds: 0,
    commissionPercent: undefined,
  }
}

/**
 * Create default tracker summary
 */
export function createDefaultSummary(): TrackerSummary {
  return {
    wins: 0,
    losses: 0,
    bonuses: 0,
    refunds: 0,
    deadHeats: 0,
    middles: 0,
    scratched: 0,
    pending: 0,
  }
}
