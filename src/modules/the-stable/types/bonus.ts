/**
 * The Stable - Bonus Holding Pen Types
 * Tracks bonuses earned from promo bets until turned over
 */

/**
 * Bonus status lifecycle
 */
export type BonusStatus = 'pending' | 'turned_over' | 'expired' | 'cancelled'

/**
 * Status configuration for display
 */
export const BONUS_STATUS_CONFIG: Record<BonusStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: '#1565c0', bgColor: '#bbdefb' },
  turned_over: { label: 'Turned Over', color: '#2e7d32', bgColor: '#c8e6c9' },
  expired: { label: 'Expired', color: '#d32f2f', bgColor: '#ffcdd2' },
  cancelled: { label: 'Cancelled', color: '#616161', bgColor: '#eeeeee' },
}

/**
 * Individual bonus record
 */
export interface Bonus {
  id: string                    // UUID
  bookie: string                // Bookie name (e.g., "Sportsbet")
  amount: number                // Bonus bet value in dollars
  dateEarned: string            // YYYY-MM-DD when bonus was earned
  expiryDate: string            // YYYY-MM-DD when bonus expires
  status: BonusStatus

  // Linking to source
  sourceEntryId?: string        // Link to TrackedRaceEntry.id that generated this
  sourcePromoType?: string      // The promo type that generated this bonus

  // Turnover tracking
  turnedOverAt?: string         // ISO timestamp when marked as turned over
  bonusTurnoverProfit?: number  // Net bonus profit after Betfair commission and losses

  // Notes
  notes?: string
}

/**
 * Summary statistics for The Stable
 */
export interface StableSummary {
  totalPending: number          // Count of pending bonuses
  totalPendingValue: number     // Sum of pending bonus amounts
  expiringWithin3Days: number   // Count expiring within 3 days
  turnedOverThisMonth: number   // Count turned over this month
  bonusTurnoverProfitThisMonth: number // Total bonus turnover profit this month
  expiredThisMonth: number      // Count that expired this month
}

/**
 * Default bookie expiry days configuration
 * Can be overridden per bonus
 */
export const BOOKIE_EXPIRY_DEFAULTS: Record<string, number> = {
  'Sportsbet': 7,
  'Ladbrokes': 30,
  'Neds': 7,
  'Pointsbet': 7,
  'TAB': 30,
  'Betfair': 90,
  'Unibet': 7,
  'Bet365': 7,
  'BlueBet': 7,
  'TopSport': 14,
  'PlayUp': 7,
  'BetRight': 7,
  'Betr': 7,
}

/**
 * Get default expiry days for a bookie
 */
export function getBookieExpiryDays(bookie: string): number {
  // Try exact match first
  if (BOOKIE_EXPIRY_DEFAULTS[bookie]) {
    return BOOKIE_EXPIRY_DEFAULTS[bookie]
  }

  // Try case-insensitive match
  const lowerBookie = bookie.toLowerCase()
  for (const [key, value] of Object.entries(BOOKIE_EXPIRY_DEFAULTS)) {
    if (key.toLowerCase() === lowerBookie) {
      return value
    }
  }

  // Default to 7 days if unknown
  return 7
}

/**
 * Create a new bonus record
 */
export function createBonus(params: {
  bookie: string
  amount: number
  dateEarned: string
  expiryDate: string
  sourceEntryId?: string
  sourcePromoType?: string
  notes?: string
}): Bonus {
  return {
    id: crypto.randomUUID(),
    bookie: params.bookie,
    amount: params.amount,
    dateEarned: params.dateEarned,
    expiryDate: params.expiryDate,
    status: 'pending',
    sourceEntryId: params.sourceEntryId,
    sourcePromoType: params.sourcePromoType,
    notes: params.notes,
  }
}
