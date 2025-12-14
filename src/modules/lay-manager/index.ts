// Lay Manager Module - Standalone tracker for Betfair lay bets
// Used to turn over bonuses gained from the No Lay Manager
// No connection to Planner - all entries are manual

export * from './components'
export * from './types'

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
