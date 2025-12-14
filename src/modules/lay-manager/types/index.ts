export type TimeValidationStatus = 'pending' | 'verified' | 'mismatch' | 'not_found'

/**
 * Unit tier based on Excel cell background color
 */
export type UnitTier = 'green' | 'neutral' | 'pink'

export const UNIT_TIER_CONFIG: Record<UnitTier, { label: string; description: string; minUnits: number; maxUnits: number }> = {
  green: { label: '1U MAX', description: '1U tip MAXIMUM for this race', minUnits: 0, maxUnits: 1 },
  neutral: { label: 'Standard', description: 'Standard race (0.5U to 2U)', minUnits: 0.5, maxUnits: 2 },
  pink: { label: '3U', description: 'Potentially 3U race (minimum 2U)', minUnits: 2, maxUnits: 3 },
}

export interface BookiePromo {
  bookie: string
  promo: string
  selected: boolean
}

export interface RacingPlanEntry {
  id: string
  track: string
  raceNumber: number
  time: string
  normalPromos: string[]
  betBackPromos: string[]
  normalPromosByBookie: BookiePromo[]
  betBackPromosByBookie: BookiePromo[]
  selectedNormalBookies: string[]
  selectedBetBackBookies: string[]
  skip: boolean
  unitTier: UnitTier
  timeValidationStatus?: TimeValidationStatus
  apiTime?: string | null
  timeDifferenceMinutes?: number | null
}

export interface BookieList {
  normalPromoBookies: string[]
  betBackBookies: string[]
}

export interface DailyRacingPlan {
  date: string
  entries: RacingPlanEntry[]
}

export * from './tracker'

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
