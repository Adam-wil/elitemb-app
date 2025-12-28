/**
 * Account Ledger Types
 *
 * Types for the financial ledger system that tracks bookie/exchange balances
 * with proper audit trail and P&L separation from cash movements.
 */

// ============================================================================
// Ledger Entry Types
// ============================================================================

/**
 * Types of ledger entries that can be created
 * - DEPOSIT/WITHDRAWAL: From bank transactions (money movement)
 * - BET_WIN/BET_LOSS: From racing tracker (P&L affecting)
 * - BONUS_CREDIT: Bonus received (balance only, not P&L)
 * - BONUS_TURNOVER: Bonus bet result (can affect P&L)
 * - ADJUSTMENT: Manual balance correction
 * - COMMISSION: Exchange fees
 * - REFUND: Bet refunds
 */
export type LedgerEntryType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'BET_WIN'
  | 'BET_LOSS'
  | 'BONUS_CREDIT'
  | 'BONUS_TURNOVER'
  | 'ADJUSTMENT'
  | 'COMMISSION'
  | 'REFUND'

/**
 * Direction of money flow relative to bookie account
 * - 'in': Money flowing INTO the bookie account (increases balance)
 * - 'out': Money flowing OUT of the bookie account (decreases balance)
 */
export type LedgerDirection = 'in' | 'out'

/**
 * Individual ledger entry representing a single transaction
 */
export interface LedgerEntry {
  id: string
  profileId: string
  bookieId?: number | null
  bookieName: string
  isExchange: boolean
  entryType: LedgerEntryType
  amount: number // Always positive
  direction: LedgerDirection
  runningBalance: number // Balance after this entry
  date: string // ISO date string
  description?: string
  notes?: string

  // Linking to source data
  bankTransactionId?: string | null
  trackerEntryId?: string | null
  layManagerEntryId?: string | null
  bonusCreditId?: string | null

  // Reconciliation
  isReconciled: boolean
  reconciledAt?: string | null

  createdAt: string
  updatedAt: string
}

/**
 * Account balance for a single bookie/exchange
 */
export interface AccountBalance {
  id: string
  profileId: string
  bookieId?: number | null
  bookieName: string
  isExchange: boolean
  currentBalance: number
  totalPL: number // Sum of BET_WIN + BET_LOSS only
  lastUpdated: string

  // Manual override
  isOverridden: boolean
  overrideValue?: number | null
  overrideReason?: string | null
  overrideAt?: string | null
}

/**
 * Summary of ledger data for a date range
 */
export interface LedgerSummary {
  totalDeposits: number
  totalWithdrawals: number
  totalWins: number
  totalLosses: number
  totalBonuses: number
  totalCommissions: number
  netPL: number // wins - losses - commissions
  currentBalance: number
  discrepancy: number // Bank net vs Tracker net
}

/**
 * Filter options for querying ledger entries
 */
export interface LedgerFilters {
  bookieName?: string
  isExchange?: boolean
  entryTypes?: LedgerEntryType[]
  dateRange?: {
    start: string
    end: string
  }
  isReconciled?: boolean
  limit?: number
  offset?: number
}

/**
 * Data for creating a new ledger entry
 */
export interface CreateLedgerEntryInput {
  profileId: string
  bookieId?: number | null
  bookieName: string
  isExchange: boolean
  entryType: LedgerEntryType
  amount: number
  direction: LedgerDirection
  date: Date | string
  description?: string
  notes?: string
  bankTransactionId?: string
  trackerEntryId?: string
  layManagerEntryId?: string
  bonusCreditId?: string
}

/**
 * Data for adjusting a balance manually
 */
export interface AdjustBalanceInput {
  profileId: string
  bookieName: string
  newBalance: number
  reason: string
}

// ============================================================================
// UI Configuration
// ============================================================================

/**
 * Configuration for each ledger entry type in the UI
 */
export interface LedgerEntryTypeConfig {
  label: string
  color: string
  icon: string
  direction: 'in' | 'out' | 'both'
  affectsPL: boolean
}

/**
 * UI configuration for all entry types
 */
export const LEDGER_ENTRY_CONFIG: Record<LedgerEntryType, LedgerEntryTypeConfig> = {
  DEPOSIT: {
    label: 'Deposit',
    color: '#2196f3', // Blue
    icon: 'ArrowUpRight',
    direction: 'in',
    affectsPL: false,
  },
  WITHDRAWAL: {
    label: 'Withdrawal',
    color: '#4caf50', // Green
    icon: 'ArrowDownLeft',
    direction: 'out',
    affectsPL: false,
  },
  BET_WIN: {
    label: 'Win',
    color: '#4caf50', // Green
    icon: 'TrendingUp',
    direction: 'in',
    affectsPL: true,
  },
  BET_LOSS: {
    label: 'Loss',
    color: '#f44336', // Red
    icon: 'TrendingDown',
    direction: 'out',
    affectsPL: true,
  },
  BONUS_CREDIT: {
    label: 'Bonus',
    color: '#9c27b0', // Purple
    icon: 'Gift',
    direction: 'in',
    affectsPL: false,
  },
  BONUS_TURNOVER: {
    label: 'Turnover',
    color: '#ff9800', // Orange
    icon: 'RefreshCw',
    direction: 'both',
    affectsPL: true,
  },
  ADJUSTMENT: {
    label: 'Adjustment',
    color: '#607d8b', // Gray
    icon: 'Edit2',
    direction: 'both',
    affectsPL: false,
  },
  COMMISSION: {
    label: 'Commission',
    color: '#795548', // Brown
    icon: 'Percent',
    direction: 'out',
    affectsPL: true,
  },
  REFUND: {
    label: 'Refund',
    color: '#00bcd4', // Cyan
    icon: 'RotateCcw',
    direction: 'in',
    affectsPL: false,
  },
}

/**
 * Account filter options for the UI
 */
export type AccountFilter = 'all' | 'bookies' | 'exchange'

/**
 * Time period options for summaries
 */
export type LedgerTimePeriod = 'week' | 'month' | 'quarter' | 'year' | 'all'

/**
 * Reconciliation status indicator
 */
export type ReconciliationIndicator = 'reconciled' | 'pending' | 'unmatched'

/**
 * Get reconciliation indicator color
 */
export function getReconciliationColor(status: ReconciliationIndicator): string {
  switch (status) {
    case 'reconciled':
      return '#4caf50' // Green
    case 'pending':
      return '#ff9800' // Yellow/Orange
    case 'unmatched':
      return '#f44336' // Red
  }
}

/**
 * Format currency for display
 */
export function formatLedgerCurrency(value: number): string {
  const isNegative = value < 0
  const absValue = Math.abs(value)
  const formatted = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absValue)

  return isNegative ? `-${formatted}` : formatted
}

/**
 * Calculate the balance effect of an entry
 * Returns positive for balance increase, negative for decrease
 */
export function calculateBalanceEffect(
  amount: number,
  direction: LedgerDirection
): number {
  return direction === 'in' ? amount : -amount
}

/**
 * Check if an entry type affects P&L
 */
export function affectsPL(entryType: LedgerEntryType): boolean {
  return LEDGER_ENTRY_CONFIG[entryType].affectsPL
}
