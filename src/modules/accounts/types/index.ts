/**
 * Accounts Module Types
 *
 * Types for Basiq banking integration, transaction processing,
 * bookie detection, P&L calculation, and account ledger.
 */

// Re-export ledger types
export * from './ledger'

// ============================================================================
// Basiq API Types
// ============================================================================

/**
 * Basiq API token response
 */
export interface BasiqTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

/**
 * Basiq user
 */
export interface BasiqUser {
  id: string
  email: string
  mobile?: string
  firstName?: string
  lastName?: string
}

/**
 * Bank account from Basiq
 */
export interface BasiqAccount {
  id: string
  accountNo: string
  accountHolder: string
  balance: string
  availableFunds: string
  currency: string
  status: string
  lastUpdated: string
  institution: {
    id: string
    name: string
    logo?: string
  }
  class: {
    type: string
    product: string
  }
}

/**
 * Bank connection from Basiq
 */
export interface BasiqConnection {
  id: string
  status: string
  institution: {
    id: string
    name: string
  }
  lastUsed: string
}

/**
 * Raw transaction from Basiq API
 */
export interface BasiqTransaction {
  id: string
  status: string
  description: string
  amount: string
  balance: string
  direction: 'credit' | 'debit'
  class: string
  institution: string
  postDate: string
  transactionDate: string
  account: string
  subClass?: {
    title: string
    code: string
  }
}

/**
 * Job status for async operations
 */
export interface BasiqJobStatus {
  id: string
  status: 'pending' | 'in-progress' | 'success' | 'failed'
  result?: unknown
}

// ============================================================================
// Normalized Transaction Types
// ============================================================================

/**
 * Reconciliation status for a transaction
 */
export type ReconciliationStatus = 'matched' | 'unmatched' | 'pending'

/**
 * Transaction normalized for internal use
 */
export interface NormalizedTransaction {
  id: string
  date: string // YYYY-MM-DD
  description: string
  rawDescription: string
  amount: number // Positive = credit, negative = debit
  balance: number
  direction: 'credit' | 'debit'
  accountId: string

  // Bookie detection results
  detectedBookie: string | null
  bookieId: string | null
  bookieConfidence: number // 0-1
  isBookieTransaction: boolean
  isExchange: boolean

  // Reconciliation
  reconciliationStatus: ReconciliationStatus
  matchedTrackerEntryId: string | null

  // Metadata
  fetchedAt: string
}

// ============================================================================
// Bookie Types
// ============================================================================

/**
 * Bookie definition for detection
 */
export interface BookieDefinition {
  id: string
  name: string
  aliases: string[] // Bank statement variations
  linkedBookies?: string[] // Related bookies (same corporate group)
  website?: string
  isExchange: boolean // true for Betfair/Smarkets
}

/**
 * Result of bookie detection on a transaction
 */
export interface BookieDetectionResult {
  bookieId: string | null
  bookieName: string | null
  confidence: number // 0-1
  matchedAlias: string | null
  isExchange: boolean
}

// ============================================================================
// Bonus Credit Types
// ============================================================================

/**
 * Manually entered bonus credit (sign-up offers like 100/100)
 */
export interface BonusCredit {
  id: string
  bookieId: string
  bookieName: string
  amount: number // Bonus amount received
  date: string // YYYY-MM-DD
  notes: string // e.g., "Sign-up 100/100"
  createdAt: string
  updatedAt: string
}

// ============================================================================
// Racing P&L Types
// ============================================================================

/**
 * Racing P&L row per bookie (matches reference image columns)
 */
export interface BookiePLRow {
  bookieId: string
  bookieName: string
  balance: number // Calculated balance
  manualOverride: number | null // User override if set
  bonusBalance: number // Sum of bonus credits
  depositCount: number
  depositAmount: number
  withdrawalCount: number
  withdrawalAmount: number
  netCash: number // depositAmount - withdrawalAmount + cashP&L
  netBonus: number // Bonus bet P&L
  totalProfit: number // netCash + netBonus
  isProfitable: boolean // For row coloring
}

/**
 * Manual balance override entry
 */
export interface BalanceOverride {
  bookieId: string
  overrideValue: number
  reason?: string
  createdAt: string
}

// ============================================================================
// Reconciliation Types
// ============================================================================

/**
 * A match between bank transaction and tracker entry
 */
export interface ReconciliationMatch {
  id: string
  transactionId: string
  trackerEntryId: string
  trackerType: 'racing' | 'lay-manager'
  matchConfidence: number // 0-1
  matchReason: string // e.g., "bookie + amount + date"
  createdAt: string
}

// ============================================================================
// Connection State Types
// ============================================================================

/**
 * Basiq connection status
 */
export interface BasiqConnectionStatus {
  isConnected: boolean
  userId: string | null
  accounts: BasiqAccount[]
  connections: BasiqConnection[]
  lastFetchedAt: string | null
  error: string | null
}

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Cached transactions with metadata
 */
export interface TransactionCache {
  version: number
  lastFetchedAt: string
  dateRange: {
    from: string
    to: string
  }
  transactions: NormalizedTransaction[]
}

/**
 * Accounts module settings
 */
export interface AccountsSettings {
  defaultDateRangeDays: number
  autoReconcileEnabled: boolean
  bookieDetectionConfidenceThreshold: number
}

/**
 * Default settings
 */
export const DEFAULT_ACCOUNTS_SETTINGS: AccountsSettings = {
  defaultDateRangeDays: 30,
  autoReconcileEnabled: true,
  bookieDetectionConfidenceThreshold: 0.7,
}
