import type { UnitTier } from './index'

/**
 * Outcome types for race tracking
 */
export type RaceOutcome =
  | '1/W'
  | '2/L'
  | 'Bonus'
  | 'Dead Heat'
  | 'Middle'
  | 'Refund'
  | 'Pending'
  | 'Scratched'

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

export interface BetSide {
  bookie: string
  stake: number
  odds: number
  commissionPercent?: number
}

export interface RaceResultData {
  winnerName: string
  winnerNumber: number
  position?: number
  margin?: number
  deadHeat: boolean
  scratched: number[]
  fetchedAt: string
}

export interface TrackedRaceEntry {
  id: string
  planEntryId: string
  date: string
  time: string
  track: string
  raceNumber: number
  meetingId?: number
  selectionName: string
  selectionNumber: number
  selectedNormalBookies: string[]
  selectedBetBackBookies: string[]
  promoDetails: {
    normalPromos: Record<string, string>
    betBackPromos: Record<string, string>
  }
  backBet: BetSide
  layBet: BetSide
  unitTier: UnitTier
  autoResult?: RaceResultData
  lastPolledAt?: string
  pollAttempts: number
  outcome: RaceOutcome
  outcomeNotes?: string
  profitLoss?: number
  lockedInAt: string
  updatedAt: string
  readOnly?: boolean
  linkedBonusId?: string // Link to bonus in The Stable for turnover tracking
}

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

export interface DailyTrackerData {
  date: string
  entries: TrackedRaceEntry[]
  totalProfit: number
  summary: TrackerSummary
  createdAt: string
  updatedAt: string
}

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

export interface PollingStatus {
  isPolling: boolean
  lastPollTime: string | null
  nextPollTime: string | null
  activeRaces: number
  completedRaces: number
  errorsCount: number
}

export interface CommissionPreferences {
  defaultRate: number
}

export const DEFAULT_COMMISSION_RATE = 5

export function createDefaultBetSide(bookie: string = ''): BetSide {
  return {
    bookie,
    stake: 0,
    odds: 0,
    commissionPercent: undefined,
  }
}

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
