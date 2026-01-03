/**
 * System Account Definitions
 *
 * Defines all system accounts that should be created for each profile.
 * These are non-bookie accounts used for tracking income, expenses, equity, etc.
 */

import type { AccountType, AccountSubType } from '@prisma/client'

/**
 * System account definition for seeding
 */
export interface SystemAccountDefinition {
  code: string
  name: string
  type: AccountType
  subType: AccountSubType
}

/**
 * All system accounts to be created per profile
 *
 * Code ranges:
 * - 1300: Betfair Available (Asset)
 * - 1501-1502: Pending bets (Asset)
 * - 2001: Liabilities
 * - 3001-3002: Equity
 * - 4001-4003: Income
 * - 5001-5005: Expenses
 */
export const SYSTEM_ACCOUNTS: SystemAccountDefinition[] = [
  // Assets - Betfair
  {
    code: '1300',
    name: 'Betfair Available',
    type: 'ASSET',
    subType: 'BETFAIR_AVAILABLE',
  },

  // Assets - Pending
  {
    code: '1501',
    name: 'Pending Back Bets',
    type: 'ASSET',
    subType: 'PENDING_BACK',
  },
  {
    code: '1502',
    name: 'Pending Lay Bets',
    type: 'ASSET',
    subType: 'PENDING_LAY',
  },

  // Liabilities
  {
    code: '2001',
    name: 'Betfair Lay Liability',
    type: 'LIABILITY',
    subType: 'BETFAIR_LIABILITY',
  },

  // Equity
  {
    code: '3001',
    name: 'Manual Adjustments',
    type: 'EQUITY',
    subType: 'ADJUSTMENT',
  },
  {
    code: '3002',
    name: 'Opening Balance Equity',
    type: 'EQUITY',
    subType: 'OPENING_BALANCE_EQUITY',
  },

  // Income
  {
    code: '4002',
    name: 'Lay Bet Wins',
    type: 'INCOME',
    subType: 'LAY_BET_WINS',
  },
  {
    code: '4003',
    name: 'Bonus Income',
    type: 'INCOME',
    subType: 'BONUS_INCOME',
  },
  {
    code: '4100',
    name: 'Racing Income',
    type: 'INCOME',
    subType: 'RACING_INCOME',
  },
  {
    code: '4200',
    name: 'Bonus/Deposit Match Racing Income',
    type: 'INCOME',
    subType: 'BONUS_DEPOSIT_MATCH_RACING_INCOME',
  },
  // Future: BONUS_DEPOSIT_MATCH_SPORTS_INCOME (4300) will be added when sports module is implemented

  // Expenses
  {
    code: '5002',
    name: 'Lay Bet Payouts',
    type: 'EXPENSE',
    subType: 'LAY_BET_PAYOUTS',
  },
  {
    code: '5004',
    name: 'Betfair Commission',
    type: 'EXPENSE',
    subType: 'BETFAIR_COMMISSION',
  },
  {
    code: '5005',
    name: 'Bonus Expired',
    type: 'EXPENSE',
    subType: 'BONUS_EXPIRED',
  },
  {
    code: '5100',
    name: 'Racing Expense',
    type: 'EXPENSE',
    subType: 'RACING_EXPENSE',
  },
]

/**
 * Total number of system accounts
 */
export const SYSTEM_ACCOUNT_COUNT = SYSTEM_ACCOUNTS.length
