/**
 * Bookie Health Types
 *
 * Types for tracking promo:non-promo ratios and bookie account status.
 */

export type RatioTimeWindow = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export type BookieAccountStatus =
  | 'PROMO_ELIGIBLE'
  | 'GUBBED'
  | 'STAT_DECD'
  | 'SUSPENDED'
  | 'CLOSED'

export const BOOKIE_STATUS_CONFIG: Record<
  BookieAccountStatus,
  {
    label: string
    description: string
    color: 'success' | 'warning' | 'error' | 'info' | 'default'
  }
> = {
  PROMO_ELIGIBLE: {
    label: 'Promo Eligible',
    description: 'Account in good standing, receiving promos',
    color: 'success',
  },
  GUBBED: {
    label: 'Gubbed',
    description: 'No longer receiving promotional offers',
    color: 'error',
  },
  STAT_DECD: {
    label: 'Stat Dec',
    description: 'Statutory declaration submitted',
    color: 'info',
  },
  SUSPENDED: {
    label: 'Suspended',
    description: 'Account temporarily suspended',
    color: 'error',
  },
  CLOSED: {
    label: 'Closed',
    description: 'Account permanently closed',
    color: 'default',
  },
}

export const TIME_WINDOW_CONFIG: Record<
  RatioTimeWindow,
  {
    label: string
    description: string
  }
> = {
  DAILY: { label: 'Daily', description: 'Reset ratio tracking each day' },
  WEEKLY: { label: 'Weekly', description: 'Reset ratio tracking each Monday' },
  MONTHLY: {
    label: 'Monthly',
    description: 'Reset ratio tracking on 1st of month',
  },
}

export interface BookieRatioConfig {
  id: string
  profileId: string
  bookieId: number
  bookieName: string
  promoRatio: number
  nonPromoRatio: number
  timeWindow: RatioTimeWindow
  status: BookieAccountStatus
  statusNotes: string | null
  statusChangedAt: string | null
  warningThreshold: number
  exceededThreshold: number
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface BookieUsageStats {
  bookieId: number
  bookieName: string
  promoBets: number
  nonPromoBets: number
  totalBets: number
  currentRatio: number | null
  targetRatio: number
  ratioPercentage: number
  status: 'ok' | 'warning' | 'exceeded'
}

// For planner chip display
export interface ChipRatioStatus {
  bookieName: string
  status: 'ok' | 'warning' | 'exceeded' | 'none'
  ratioDisplay: string // e.g., "2/6" (2 promo, 6 non-promo)
  tooltipText: string
}
