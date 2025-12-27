export type TimeValidationStatus = 'pending' | 'verified' | 'mismatch' | 'not_found'

/**
 * Unit tier based on Excel cell background color
 * - green: 1U tip MAXIMUM
 * - neutral: Standard race (0.5U to 2U)
 * - pink: Potentially 3U race (minimum 2U, 90% of the time)
 */
export type UnitTier = 'green' | 'neutral' | 'pink'

export const UNIT_TIER_CONFIG: Record<UnitTier, { label: string; description: string; minUnits: number; maxUnits: number }> = {
  green: { label: '1U MAX', description: '1U tip MAXIMUM for this race', minUnits: 0, maxUnits: 1 },
  neutral: { label: 'Standard', description: 'Standard race (0.5U to 2U)', minUnits: 0.5, maxUnits: 2 },
  pink: { label: '3U', description: 'Potentially 3U race (minimum 2U)', minUnits: 2, maxUnits: 3 },
}

// Promo info for a specific bookie on a race
export interface BookiePromo {
  bookie: string
  promo: string // The promo text/description
  selected: boolean // Whether this bookie is selected for this race
}

export interface RacingPlanEntry {
  id: string
  track: string
  raceNumber: number
  time: string
  // Legacy fields for backward compatibility
  normalPromos: string[]
  betBackPromos: string[]
  // New bookie-level promo data
  normalPromosByBookie: BookiePromo[]
  betBackPromosByBookie: BookiePromo[]
  // Selected bookies (up to 3 each)
  selectedNormalBookies: string[]
  selectedBetBackBookies: string[]
  skip: boolean
  // Unit tier based on Excel cell color (green/neutral/pink)
  unitTier: UnitTier
  // Time validation fields
  timeValidationStatus?: TimeValidationStatus
  apiTime?: string | null
  timeDifferenceMinutes?: number | null
}

// Available bookies extracted from Excel headers
export interface BookieList {
  normalPromoBookies: string[]
  betBackBookies: string[]
}

export interface DailyRacingPlan {
  date: string
  entries: RacingPlanEntry[]
}

// Re-export tracker types
export * from './tracker'

// Re-export dashboard types
export * from './dashboard'

// Re-export bookie health types
export * from './bookieHealth'

// Known Australian race tracks for detection
export const KNOWN_TRACKS = [
  'BALLARAT', 'DOOMBEN', 'ASCOT', 'CAULFIELD', 'ROSEHILL',
  'FLEMINGTON', 'RANDWICK', 'MOONEE VALLEY', 'SANDOWN', 'MORPHETTVILLE',
  'EAGLE FARM', 'WARWICK FARM', 'CANTERBURY', 'GOSFORD', 'NEWCASTLE',
  'GEELONG', 'BENDIGO', 'PAKENHAM', 'CRANBOURNE', 'MORNINGTON',
  'BELMONT', 'NORTHAM', 'PINJARRA', 'BUNBURY', 'KALGOORLIE',
  'GOLD COAST', 'SUNSHINE COAST', 'IPSWICH', 'TOOWOOMBA',
  'MURRAY BRIDGE', 'GAWLER', 'PORT LINCOLN', 'HOBART', 'LAUNCESTON',
  'DEVONPORT', 'DARWIN', 'ALICE SPRINGS', 'TOWNSVILLE', 'CAIRNS',
  'NOWRA', 'WYONG', 'KEMBLA GRANGE', 'SCONE', 'TAMWORTH', 'GRAFTON',
]
