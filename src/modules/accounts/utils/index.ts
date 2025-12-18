/**
 * Accounts Module Utilities
 */

// Bookie list and helpers
export {
  BOOKIE_DEFINITIONS,
  getBookieById,
  getBookieByName,
  getExchangeBookies,
  getRegularBookies,
  getAllBookieNames,
  getBookieCount,
} from './bookieList'

// Bookie detection
export {
  detectBookie,
  isBookieTransaction,
  isExchangeTransaction,
  normalizeTransaction,
  processTransactions,
  filterBookieTransactions,
  filterExchangeTransactions,
  filterRegularBookieTransactions,
  getTransactionStatsByBookie,
  getUniqueBookiesFromTransactions,
} from './bookieDetection'

// localStorage persistence
export {
  // Connection
  saveConnectionStatus,
  getConnectionStatus,
  clearConnectionStatus,
  // Transactions
  saveTransactions,
  getTransactionCache,
  clearTransactionCache,
  isTransactionCacheStale,
  // Bonus credits
  getBonusCredits,
  saveBonusCredits,
  addBonusCredit,
  updateBonusCredit,
  deleteBonusCredit,
  getBonusCreditsByBookie,
  getTotalBonusCreditForBookie,
  // Balance overrides
  getBalanceOverrides,
  saveBalanceOverrides,
  setBalanceOverride,
  getBalanceOverride,
  clearBalanceOverride,
  // Reconciliation
  getReconciliationMatches,
  saveReconciliationMatches,
  addReconciliationMatch,
  getMatchForTransaction,
  getMatchForTrackerEntry,
  removeReconciliationMatch,
  clearReconciliationMatches,
  // Settings
  getAccountsSettings,
  saveAccountsSettings,
  // Custom bookies
  getCustomBookies,
  saveCustomBookies,
  addCustomBookie,
  updateCustomBookie,
  addAliasToCustomBookie,
  deleteCustomBookie,
  isCustomBookie,
  // Clear all
  clearAllAccountsData,
} from './accountsStorage'
