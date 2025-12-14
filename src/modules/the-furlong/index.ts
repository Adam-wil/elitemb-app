// The Furlong Module - Horse Racing Subscription Module
// All horse racing related functionality is contained within this module

export * from './components'
export * from './types'
export { parseRacingPlanExcel, getSupportedDateFormats, type ParseResult, type ParseOptions } from './utils/excelParser'
export {
  TIMEZONES,
  SOURCE_TIMEZONE,
  convertRaceTime,
  getOffsetDifference,
  getSavedTimezone,
  saveTimezone,
  type TimezoneOption,
} from './utils/timezones'

// Archive exports
export {
  archivePlan,
  getArchivedPlans,
  getArchivedPlanByDate,
  deleteArchivedPlan,
  getArchivedDates,
  hasArchivedPlan,
  pruneOldArchives,
  type ArchivedPlan,
} from './utils/archiveStorage'

// API exports
export {
  // Services
  getMeetings,
  findMeetingByTrack,
  getMeetingResults,
  getMeetingForm,
  getRaceTimesForTrack,
  validateRaceTimes,
  applyTimeCorrections,
  // Tracker API
  fetchRaceResult,
  isRaceFinished,
  fetchResultsForTracks,
  // Config
  PUNTING_FORM_API_BASE,
  getApiKey,
  JURISDICTIONS,
  TIME_VALIDATION_TOLERANCE_MINUTES,
  // Types
  type PFMeeting,
  type PFRunner,
  type PFRaceResult,
  type PFMeetingResults,
  type PFRaceField,
  type TimeValidationResult,
  type ValidationSummary,
} from './api'

// Tracker storage exports
export {
  getTrackerData,
  saveTrackerData,
  updateTrackerEntry,
  removeTrackerEntry,
  addTrackerEntry,
  addTrackerEntryAbove,
  createDailyTrackerData,
  addTrackerEntries,
  getDatesWithTrackerData,
  archiveTrackerDay,
  getArchivedTrackerDays,
  getArchivedTrackerByDate,
  getArchivedTrackerDates,
  hasArchivedTracker,
  deleteArchivedTracker,
  restoreTrackerFromArchive,
  pruneOldTrackerArchives,
  autoArchiveCompletedDays,
  getCommissionPreferences,
  saveCommissionPreferences,
  getDefaultCommissionRate,
  setDefaultCommissionRate,
  convertPlanEntryToTrackedEntries,
  lockInPlanEntries,
  // Track-to-state commission utilities
  getStateForTrack,
  getCommissionForTrack,
  type StateCommissionRate,
} from './utils/trackerStorage'

// Outcome logic exports
export {
  determineOutcome,
  calculateProfitLoss,
  calculateLayLiability,
  calculateBackProfit,
  calculateQualifyingLoss,
  calculateOptimalLayStake,
} from './utils/outcomeLogic'

// Hooks exports
export { useResultPolling } from './hooks/useResultPolling'
export { useTrackerData } from './hooks/useTrackerData'
