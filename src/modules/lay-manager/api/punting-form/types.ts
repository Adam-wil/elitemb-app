/**
 * PuntingForm API Types
 * Based on the API response structures from the PuntingForm racing API
 */

// Meeting list response types
export interface PFTrack {
  name: string
  trackId: string
  location: string
  state: string
  country: string
  abbrev: string
  surface: string | null
}

export interface PFMeeting {
  meetingId: string
  track: PFTrack
  races: unknown | null
  tabMeeting: boolean
  railPosition: string
  meetingDate: string
  stage: string
  expectedCondition: string | null
  isBarrierTrial: boolean
  isJumps: boolean
  hasSectionals: boolean
  formUpdated: string
  resultsUpdated: string
  sectionalsUpdated: string | null
  ratingsUpdated: string
}

export interface PFMeetingsResponse {
  meetings: PFMeeting[]
  date: string
}

// Race and runner types
export interface PFRunner {
  position: number
  margin: number
  tabNo: number
  runner: string // Horse name
  runnerId: number
  trainer: string
  jockey: string
  barrier: number
  weight: number
  price: number
}

export interface PFRaceResult {
  raceId: number
  raceNumber: number
  raceTime: string // HH:mm format
  raceName: string
  distance: number
  trackConditionLabel: string
  trackCondition: number
  officialRaceTime: string
  officialRaceTimeString: string
  runners: PFRunner[]
}

export interface PFMeetingResults {
  meetingId: number
  track: string
  trackId: number
  meetingDate: string
  raceResults: PFRaceResult[]
}

export interface PFResultsResponse {
  statusCode: number
  status: number
  error: string | null
  errors: string[] | null
  payLoad: PFMeetingResults[]
}

// Form/Field data types (for race times before results)
export interface PFRaceField {
  raceNumber: number
  raceTime: string // HH:mm format in Melbourne time
  raceName: string
  distance: number
  class: string
  prizeMoney: number
  runners: PFFieldRunner[]
}

export interface PFFieldRunner {
  tabNo: number
  runner: string
  barrier: number
  weight: number
  jockey: string
  trainer: string
}

export interface PFFormResponse {
  meetingId: number
  track: string
  meetingDate: string
  races: PFRaceField[]
}

// Validation types
export interface TimeValidationResult {
  raceNumber: number
  track: string
  excelTime: string
  apiTime: string | null
  isValid: boolean
  timeDifferenceMinutes: number | null
  status: 'verified' | 'mismatch' | 'not_found' | 'pending'
  message: string
}

export interface ValidationSummary {
  totalRaces: number
  verified: number
  mismatches: number
  notFound: number
  pending: number
  allValid: boolean
}
