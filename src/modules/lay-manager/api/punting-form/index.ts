/**
 * PuntingForm API Module
 * Exports all services, types, and configuration for the PuntingForm racing API
 */

// Configuration
export {
  PUNTING_FORM_API_BASE,
  getApiKey,
  ENDPOINTS,
  JURISDICTIONS,
  TIME_VALIDATION_TOLERANCE_MINUTES,
} from './config'

// Meetings Service
export { getMeetings, findMeetingByTrack } from './meetingsService'

// Results Service
export {
  getMeetingResults,
  getMeetingForm,
  getRaceTimesForTrack,
} from './resultsService'

// Time Validation Service
export { validateRaceTimes, applyTimeCorrections } from './timeValidationService'

// Tracker Results Service
export {
  fetchRaceResult,
  isRaceFinished,
  getMeetingIdForTrack,
  clearMeetingIdCache,
  fetchResultsForTracks,
} from './trackerResultsService'

// Server Functions (for bypassing CORS)
export {
  fetchMeetingsServer,
  fetchResultsServer,
  fetchFormServer,
} from './server'

// Types
export type {
  PFMeeting,
  PFMeetingsResponse,
  PFRunner,
  PFRaceResult,
  PFMeetingResults,
  PFResultsResponse,
  PFRaceField,
  PFFieldRunner,
  PFFormResponse,
  TimeValidationResult,
  ValidationSummary,
} from './types'
