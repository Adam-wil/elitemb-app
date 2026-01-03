/**
 * Journal Entry Types
 *
 * Types for double-entry accounting journal entries and lines.
 * Used by journalService.server.ts for creating balanced transactions.
 */

import type { JournalEntryType, BetType } from '@prisma/client'

/**
 * Input for a single journal line (debit or credit)
 */
export interface JournalLineInput {
  accountId: string
  debit: number // 0 if credit line
  credit: number // 0 if debit line
  memo?: string
}

/**
 * Input for creating a new journal entry with lines
 */
export interface CreateJournalEntryInput {
  profileId: string
  entryDate: string // ISO date string
  entryType: JournalEntryType
  description?: string
  referenceType?: string // 'RACING_TRACKER' | 'LAY_MANAGER' | 'BONUS' | etc.
  referenceId?: string
  betType?: BetType
  lines: JournalLineInput[]
}

/**
 * Journal entry with included journal lines (return type)
 */
export interface JournalEntryWithLines {
  id: string
  profileId: string
  entryDate: Date
  entryType: JournalEntryType
  description: string | null
  referenceType: string | null
  referenceId: string | null
  betType: BetType | null
  isVoid: boolean
  createdAt: Date
  lines: Array<{
    id: string
    accountId: string
    debit: number
    credit: number
    memo: string | null
  }>
}

/**
 * Balance validation result
 */
export interface JournalBalanceResult {
  totalDebits: number
  totalCredits: number
}

/**
 * Custom error for unbalanced journal entries
 */
export class JournalBalanceError extends Error {
  public readonly totalDebits: number
  public readonly totalCredits: number
  public readonly difference: number

  constructor(totalDebits: number, totalCredits: number) {
    const difference = Math.abs(totalDebits - totalCredits)
    super(
      `Journal entry unbalanced: debits=${totalDebits.toFixed(2)}, credits=${totalCredits.toFixed(2)}, difference=${difference.toFixed(2)}`
    )
    this.name = 'JournalBalanceError'
    this.totalDebits = totalDebits
    this.totalCredits = totalCredits
    this.difference = difference
  }
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation error codes for journal entries
 */
export type JournalValidationErrorCode =
  | 'ACCOUNT_NOT_FOUND'
  | 'ACCOUNT_PROFILE_MISMATCH'
  | 'NEGATIVE_AMOUNT'
  | 'BOTH_DEBIT_AND_CREDIT'
  | 'NEITHER_DEBIT_NOR_CREDIT'
  | 'UNBALANCED_ENTRY'
  | 'MISSING_ENTRY_DATE'
  | 'INVALID_ENTRY_DATE'
  | 'INSUFFICIENT_LINES'
  | 'INVALID_ENTRY_TYPE'

/**
 * Structured validation error with field and line information
 */
export interface JournalValidationError {
  code: JournalValidationErrorCode
  message: string
  field?: string
  lineIndex?: number
  details?: Record<string, unknown>
}

/**
 * Result of validating a journal entry
 */
export interface JournalValidationResult {
  isValid: boolean
  errors: JournalValidationError[]
}

// ============================================================================
// Reversal Types
// ============================================================================

/**
 * Input for reversing a journal entry
 */
export interface ReverseJournalEntryInput {
  journalEntryId: string
  reason?: string
}

/**
 * Result of reversing a journal entry
 */
export interface ReversalResult {
  original: JournalEntryWithLines
  reversal: JournalEntryWithLines
}

// ============================================================================
// Adjustment Types
// ============================================================================

/**
 * Input for creating a manual balance adjustment
 */
export interface CreateAdjustmentInput {
  profileId: string
  accountId: string
  amount: number // Positive = increase balance, Negative = decrease
  reason: string
  entryDate?: string // Defaults to today
}

/**
 * Input for creating a transfer between accounts
 */
export interface CreateTransferInput {
  profileId: string
  fromAccountId: string
  toAccountId: string
  amount: number // Must be positive
  description: string
  entryDate?: string // Defaults to today
}

// ============================================================================
// Batch Types
// ============================================================================

/**
 * Input for creating multiple journal entries in one operation
 */
export interface BatchJournalEntryInput {
  profileId: string
  entries: CreateJournalEntryInput[]
}

/**
 * Result of batch journal entry creation
 */
export interface BatchCreateResult {
  success: boolean
  created: JournalEntryWithLines[]
  errors?: Array<{
    index: number
    errors: JournalValidationError[]
  }>
}

// ============================================================================
// Deposit Match Types
// ============================================================================

/**
 * Input for recording a deposit match (deposit + bonus credit)
 */
export interface RecordDepositMatchInput {
  profileId: string
  bookieId: number
  depositAmount: number
  bonusAmount: number
  description?: string
  entryDate?: string // Defaults to today
}

/**
 * Result of recording a deposit match
 */
export interface DepositMatchResult {
  depositEntry: JournalEntryWithLines
  bonusEntry: JournalEntryWithLines | null // null if bonusAmount = 0
  referenceId: string // Shared reference linking both entries
}

// ============================================================================
// Bonus Credit Types
// ============================================================================

/**
 * Input for recording a standalone bonus credit (not tied to deposit)
 */
export interface RecordBonusCreditInput {
  profileId: string
  bookieId: number
  amount: number
  reason: string
  bonusId?: string // Optional link to Bonus record
  entryDate?: string // Defaults to today
}

/**
 * Input for recording a deposit match bonus credit to per-bookie income account
 * Uses BONUS_DEPOSIT_MATCH_RACING_INCOME:{bookieName} for per-bookie P&L tracking
 */
export interface RecordDepositMatchBonusCreditInput {
  profileId: string
  bookieName: string // Used to find/create per-bookie accounts
  amount: number
  notes?: string
  bonusCreditId?: string // For idempotency - prevents duplicate entries
  entryDate?: string // Defaults to today
}

/**
 * Result of recording a deposit match bonus credit
 */
export interface RecordDepositMatchBonusCreditResult {
  journalEntry: JournalEntryWithLines
  bookieName: string
  amount: number
  wasExisting: boolean
}

/**
 * Input for voiding a bonus credit journal entry
 */
export interface VoidBonusCreditInput {
  journalEntryId: string
  reason?: string
}

// ============================================================================
// Bonus Expiry Types
// ============================================================================

/**
 * Input for recording a bonus expiry (unused bonus expires)
 */
export interface RecordBonusExpiryInput {
  profileId: string
  bookieId: number
  amount: number
  reason: string
  bonusId?: string // Optional link to Bonus record
  entryDate?: string // Defaults to today
}

// ============================================================================
// Racing Tracker Types
// ============================================================================

/**
 * Input for recording a racing bet placement in the journal
 */
export interface RecordRacingBetPlacedInput {
  profileId: string
  trackerEntryId: string
  bookieId: number
  stake: number
  isBonusBet: boolean
  horseName: string
  track: string
  raceNumber: number
  entryDate?: string // Defaults to bet date from tracker entry
}

/**
 * Result of recording a bet placement
 */
export interface RecordRacingBetPlacedResult {
  journalEntry: JournalEntryWithLines | null
  wasExisting: boolean // true if idempotent return
  wasSkipped?: boolean // true if child leg (no journal created)
  skipReason?: string // reason for skipping (e.g., "Child leg - journal on parent")
}

/**
 * Input for recording a racing bet win settlement
 */
export interface RecordRacingWinInput {
  profileId: string
  trackerEntryId: string
  bookieId: number
  stake: number
  odds: number
  isBonusBet: boolean
  horseName: string
  track: string
  raceNumber: number
  entryDate?: string
}

/**
 * Result of recording a win settlement
 */
export interface RecordRacingWinResult {
  settlementEntry: JournalEntryWithLines
  reversedPendingEntry: JournalEntryWithLines | null
  returns: number
  profit: number
  wasExisting: boolean
}

/**
 * Input for recording a racing bet loss settlement
 */
export interface RecordRacingLossInput {
  profileId: string
  trackerEntryId: string
  bookieId: number
  stake: number
  isBonusBet: boolean
  horseName: string
  track: string
  raceNumber: number
  entryDate?: string
}

/**
 * Result of recording a loss settlement
 */
export interface RecordRacingLossResult {
  settlementEntry: JournalEntryWithLines
  reversedPendingEntry: JournalEntryWithLines | null
  lossAmount: number
  expenseType: 'BACK_BET_LOSSES' | 'QUALIFYING_LOSS'
  wasExisting: boolean
}

/**
 * Type of void/refund
 */
export type VoidType = 'SCRATCHED' | 'REFUND' | 'VOID'

/**
 * Input for recording a void/scratch/refund
 */
export interface RecordRacingVoidInput {
  profileId: string
  trackerEntryId: string
  bookieId: number
  stake: number
  isBonusBet: boolean
  voidType: VoidType
  reason?: string // From outcomeNotes
  horseName: string
  track: string
  raceNumber: number
  entryDate?: string
}

/**
 * Result of recording a void/refund
 */
export interface RecordRacingVoidResult {
  refundEntry: JournalEntryWithLines
  reversedPendingEntry: JournalEntryWithLines | null
  refundAmount: number
  refundAccount: 'BOOKIE_CASH' | 'BOOKIE_BONUS'
  wasExisting: boolean
}

/**
 * Input for recording a dead heat result
 */
export interface RecordRacingDeadHeatInput {
  profileId: string
  trackerEntryId: string
  bookieId: number
  stake: number
  odds: number
  deadHeatDivisor: number // 2 for 2-way, 3 for 3-way, etc.
  isBonusBet: boolean
  horseName: string
  track: string
  raceNumber: number
  entryDate?: string
}

/**
 * Dead heat calculation breakdown
 */
export interface DeadHeatCalculation {
  originalStake: number
  effectiveStake: number // stake / divisor
  returnedStake: number // stake - effectiveStake
  winningPortion: number // effectiveStake * odds
  totalReturns: number // winningPortion + returnedStake
  profit: number // totalReturns - originalStake
  deadHeatDivisor: number
}

/**
 * Result of recording a dead heat
 */
export interface RecordRacingDeadHeatResult {
  settlementEntry: JournalEntryWithLines
  reversedPendingEntry: JournalEntryWithLines | null
  calculation: DeadHeatCalculation
  wasExisting: boolean
}

// ============================================================================
// Lay Manager Types
// ============================================================================

/**
 * Input for recording a matched bet placement (back + lay)
 */
export interface RecordMatchedBetPlacedInput {
  profileId: string
  layManagerEntryId: string
  // Back side
  backBookieId: number
  backStake: number
  backOdds: number
  isBonusBet: boolean
  // Lay side
  layStake: number
  layOdds: number
  // Details
  horseName: string
  track: string
  raceNumber: number
  entryDate?: string
}

/**
 * Result of recording a matched bet placement
 */
export interface RecordMatchedBetPlacedResult {
  journalEntry: JournalEntryWithLines | null
  backStake: number
  layLiability: number
  totalExposure: number // backStake + layLiability
  wasExisting: boolean
  wasSkipped?: boolean // true if child leg (no journal created)
  skipReason?: string // reason for skipping
}

/**
 * Input for recording a matched bet where back wins (lay loses)
 */
export interface RecordMatchedBetBackWinsInput {
  profileId: string
  layManagerEntryId: string
  // Back side
  backBookieId: number
  backStake: number
  backOdds: number
  isBonusBet: boolean
  // Lay side
  layStake: number
  layOdds: number
  // Details
  horseName: string
  track: string
  raceNumber: number
  entryDate?: string
}

/**
 * Calculation breakdown for back wins settlement
 */
export interface BackWinsCalculation {
  backReturns: number
  backProfit: number
  layLiabilityPaid: number
  netProfitLoss: number // backProfit - layLiabilityPaid
}

/**
 * Result of recording back wins settlement
 */
export interface RecordMatchedBetBackWinsResult {
  settlementEntry: JournalEntryWithLines
  reversedPendingEntry: JournalEntryWithLines | null
  calculation: BackWinsCalculation
  wasExisting: boolean
}

/**
 * Input for recording a matched bet where lay wins (back loses)
 */
export interface RecordMatchedBetLayWinsInput {
  profileId: string
  layManagerEntryId: string
  // Back side
  backBookieId: number
  backStake: number
  isBonusBet: boolean
  // Lay side
  layStake: number
  layOdds: number
  layCommissionPercent: number // e.g., 5 for 5%
  // Details
  horseName: string
  track: string
  raceNumber: number
  entryDate?: string
}

/**
 * Calculation breakdown for lay wins settlement
 */
export interface LayWinsCalculation {
  backLoss: number
  layLiabilityReturned: number
  layGrossProfit: number // layStake (backer's stake kept)
  betfairCommission: number // layGrossProfit * rate
  layNetProfit: number // layGrossProfit - commission
  netProfitLoss: number // layNetProfit - backLoss
}

/**
 * Result of recording lay wins settlement
 */
export interface RecordMatchedBetLayWinsResult {
  settlementEntry: JournalEntryWithLines
  reversedPendingEntry: JournalEntryWithLines | null
  calculation: LayWinsCalculation
  wasExisting: boolean
}

// ============================================================================
// Multi-leg Settlement Types
// ============================================================================

/**
 * Summary of a single leg in a multi-leg bet
 */
export interface LegSummary {
  id: string
  legNumber: number
  outcome: 'WIN' | 'LOSS' | 'PENDING' | 'SCRATCHED' | 'REFUND' | 'DEAD_HEAT'
  odds: number
  isScratched: boolean
  isDeadHeat: boolean
  deadHeatDivisor?: number
  horseName?: string
  track?: string
  raceNumber?: number
}

/**
 * Result of determining multi-leg bet outcome
 */
export interface MultiLegOutcomeResult {
  outcome: 'WIN' | 'LOSS' | 'VOID' | 'DEAD_HEAT' | 'PENDING'
  adjustedCombinedOdds: number
  deadHeatFactor: number
  activeLegCount: number
  scratchedLegCount: number
  losingLeg?: LegSummary
}

/**
 * Calculation breakdown for multi-leg returns
 */
export interface MultiLegReturnsCalculation {
  originalCombinedOdds: number
  adjustedCombinedOdds: number
  effectiveStake: number
  winningPortion: number
  returnedPortion: number
  totalReturns: number
  profit: number
  deadHeatFactor: number
}

/**
 * Input for settling a multi-leg bet
 */
export interface SettleMultiLegInput {
  profileId: string
  parentEntryId: string
  model: 'racing' | 'lay'
  bookieId?: number // For racing tracker
}

/**
 * Result of settling a multi-leg bet
 */
export interface SettleMultiLegResult {
  settled: boolean
  wasExisting?: boolean
  outcome?: 'WIN' | 'LOSS' | 'VOID' | 'DEAD_HEAT'
  reason?: string // If not settled, why
  settlementEntry?: JournalEntryWithLines
  reversedPendingEntry?: JournalEntryWithLines | null
  calculation?: MultiLegReturnsCalculation
  legSummaries?: LegSummary[]
}

// ============================================================================
// Bank Transaction Types
// ============================================================================

/**
 * Type of bank transaction
 */
export type BankTransactionType = 'DEPOSIT' | 'WITHDRAWAL'

/**
 * Input for recording a bank transaction
 */
export interface RecordBankTransactionInput {
  profileId: string
  type: BankTransactionType
  bookieId: number
  amount: number
  bankName?: string // For provisioning or lookup
  bankAccountId?: string // Existing bank account ID
  bankTransactionId?: string // Basiq transaction ID (optional, for idempotency)
  notes?: string
  entryDate?: string // ISO date string, defaults to today
}

/**
 * Result of recording a bank transaction
 */
export interface RecordBankTransactionResult {
  journalEntry: JournalEntryWithLines
  created: boolean
  message: string
}

/**
 * Input for batch recording bank transactions
 */
export interface BatchBankTransactionInput {
  profileId: string
  transactions: Omit<RecordBankTransactionInput, 'profileId'>[]
}

/**
 * Result of a single transaction in a batch
 */
export interface BatchTransactionItemResult {
  success: boolean
  journalEntry?: JournalEntryWithLines
  created?: boolean
  error?: string
  transaction?: Omit<RecordBankTransactionInput, 'profileId'>
}

/**
 * Result of batch recording bank transactions
 */
export interface BatchBankTransactionResult {
  total: number
  created: number
  skipped: number
  failed: number
  results: BatchTransactionItemResult[]
}

// ============================================================================
// Betfair Transaction Types
// ============================================================================

/**
 * Type of Betfair transaction
 */
export type BetfairTransactionType = 'DEPOSIT' | 'WITHDRAWAL'

/**
 * Input for recording a Betfair transaction
 */
export interface RecordBetfairTransactionInput {
  profileId: string
  type: BetfairTransactionType
  amount: number
  bankName?: string // Default: "Betfair Bank"
  bankAccountId?: string // Existing bank account ID
  bankTransactionId?: string // For idempotency
  pending?: boolean // For funds in transit
  notes?: string
  entryDate?: string // ISO date string, defaults to today
}

/**
 * Result of recording a Betfair transaction
 */
export interface RecordBetfairTransactionResult {
  journalEntry: JournalEntryWithLines
  created: boolean
  pending: boolean
  message: string
}

/**
 * Input for settling a pending Betfair deposit
 */
export interface SettlePendingBetfairDepositInput {
  profileId: string
  pendingJournalEntryId: string
  bankTransactionId?: string // Optional Basiq transaction ID
  entryDate?: string // ISO date string, defaults to today
}

/**
 * Result of settling a pending Betfair deposit
 */
export interface SettlePendingBetfairDepositResult {
  settlementEntry: JournalEntryWithLines
  originalEntry: JournalEntryWithLines
  message: string
}

// ============================================================================
// Tracker Edit / Journal Sync Types
// ============================================================================

/**
 * Type of tracker entry
 */
export type TrackerEntryType = 'RACING_TRACKER' | 'LAY_MANAGER'

/**
 * Values that can be edited on a tracker entry
 */
export interface TrackerEditValues {
  stake?: number
  odds?: number
  outcome?: string
  bookieId?: number
  isBonusBet?: boolean
  // Lay Manager specific
  layStake?: number
  layOdds?: number
}

/**
 * Input for updating tracker entry journal entries
 */
export interface UpdateTrackerEntryJournalInput {
  entryType: TrackerEntryType
  entryId: string
  profileId: string
  oldValues: TrackerEditValues
  newValues: TrackerEditValues
}

/**
 * Result of updating tracker entry journal entries
 */
export interface UpdateTrackerEntryJournalResult {
  reversedEntries?: JournalEntryWithLines[]
  reversalEntries?: JournalEntryWithLines[]
  newEntry?: JournalEntryWithLines
  updatedInPlace?: boolean
  message: string
}

/**
 * Input for reversing a journal entry
 */
export interface ReverseJournalInput {
  originalEntryId: string
  reason?: string
}

/**
 * Result of reversing a journal entry
 */
export interface ReverseJournalResult {
  reversedEntry: JournalEntryWithLines
  reversalEntry: JournalEntryWithLines
  message: string
}

/**
 * Check if tracker entry can be edited
 */
export interface CanEditTrackerEntryResult {
  canEdit: boolean
  requiresReversal: boolean
  hasPendingEntries: boolean
  hasPostedEntries: boolean
  message: string
}

/**
 * Audit trail entry for tracker changes
 */
export interface TrackerAuditTrailEntry {
  id: string
  entryDate: Date
  description: string | null
  entryType: string
  isReversal: boolean
  wasReversed: boolean
  lines: Array<{
    accountName: string
    debit: number
    credit: number
  }>
}
