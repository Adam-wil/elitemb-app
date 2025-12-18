/**
 * Accounts Module localStorage Utilities
 *
 * Handles persistence of:
 * - Basiq connection status
 * - Cached transactions
 * - Bonus credits
 * - Balance overrides
 * - Reconciliation matches
 * - Module settings
 * - Custom bookies (user-added)
 */

import type {
  BookieDefinition,
  BasiqConnectionStatus,
  TransactionCache,
  NormalizedTransaction,
  BonusCredit,
  BalanceOverride,
  ReconciliationMatch,
  AccountsSettings,
  DEFAULT_ACCOUNTS_SETTINGS,
} from '../types'

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  CONNECTION: 'elitemb-basiq-connection',
  TRANSACTIONS: 'elitemb-bank-transactions',
  BONUS_CREDITS: 'elitemb-bonus-credits',
  BALANCE_OVERRIDES: 'elitemb-balance-overrides',
  RECONCILIATION: 'elitemb-reconciliation-matches',
  SETTINGS: 'elitemb-accounts-settings',
  CUSTOM_BOOKIES: 'elitemb-custom-bookies',
} as const

// ============================================================================
// Connection Status
// ============================================================================

/**
 * Save Basiq connection status
 */
export function saveConnectionStatus(status: BasiqConnectionStatus): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.CONNECTION, JSON.stringify(status))
}

/**
 * Get Basiq connection status
 */
export function getConnectionStatus(): BasiqConnectionStatus | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(STORAGE_KEYS.CONNECTION)
  return stored ? JSON.parse(stored) : null
}

/**
 * Clear connection status (disconnect)
 */
export function clearConnectionStatus(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEYS.CONNECTION)
}

// ============================================================================
// Transaction Cache
// ============================================================================

/**
 * Save transactions to cache
 */
export function saveTransactions(
  transactions: NormalizedTransaction[],
  dateRange: { from: string; to: string }
): void {
  if (typeof window === 'undefined') return

  const cache: TransactionCache = {
    version: 1,
    lastFetchedAt: new Date().toISOString(),
    dateRange,
    transactions,
  }

  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(cache))
}

/**
 * Get cached transactions
 */
export function getTransactionCache(): TransactionCache | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)
  return stored ? JSON.parse(stored) : null
}

/**
 * Clear transaction cache
 */
export function clearTransactionCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS)
}

/**
 * Check if cache is stale (older than specified minutes)
 */
export function isTransactionCacheStale(maxAgeMinutes: number = 60): boolean {
  const cache = getTransactionCache()
  if (!cache) return true

  const cacheAge = Date.now() - new Date(cache.lastFetchedAt).getTime()
  const maxAgeMs = maxAgeMinutes * 60 * 1000
  return cacheAge > maxAgeMs
}

// ============================================================================
// Bonus Credits
// ============================================================================

/**
 * Get all bonus credits
 */
export function getBonusCredits(): BonusCredit[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(STORAGE_KEYS.BONUS_CREDITS)
  return stored ? JSON.parse(stored) : []
}

/**
 * Save all bonus credits
 */
export function saveBonusCredits(credits: BonusCredit[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.BONUS_CREDITS, JSON.stringify(credits))
}

/**
 * Add a bonus credit
 */
export function addBonusCredit(credit: Omit<BonusCredit, 'id' | 'createdAt' | 'updatedAt'>): BonusCredit {
  const credits = getBonusCredits()
  const newCredit: BonusCredit = {
    ...credit,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  credits.push(newCredit)
  saveBonusCredits(credits)
  return newCredit
}

/**
 * Update a bonus credit
 */
export function updateBonusCredit(id: string, updates: Partial<BonusCredit>): BonusCredit | null {
  const credits = getBonusCredits()
  const index = credits.findIndex(c => c.id === id)
  if (index === -1) return null

  credits[index] = {
    ...credits[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  saveBonusCredits(credits)
  return credits[index]
}

/**
 * Delete a bonus credit
 */
export function deleteBonusCredit(id: string): boolean {
  const credits = getBonusCredits()
  const filtered = credits.filter(c => c.id !== id)
  if (filtered.length === credits.length) return false
  saveBonusCredits(filtered)
  return true
}

/**
 * Get bonus credits for a specific bookie
 */
export function getBonusCreditsByBookie(bookieId: string): BonusCredit[] {
  return getBonusCredits().filter(c => c.bookieId === bookieId)
}

/**
 * Get total bonus credits for a bookie
 */
export function getTotalBonusCreditForBookie(bookieId: string): number {
  return getBonusCreditsByBookie(bookieId).reduce((sum, c) => sum + c.amount, 0)
}

// ============================================================================
// Balance Overrides
// ============================================================================

/**
 * Get all balance overrides
 */
export function getBalanceOverrides(): BalanceOverride[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(STORAGE_KEYS.BALANCE_OVERRIDES)
  return stored ? JSON.parse(stored) : []
}

/**
 * Save all balance overrides
 */
export function saveBalanceOverrides(overrides: BalanceOverride[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.BALANCE_OVERRIDES, JSON.stringify(overrides))
}

/**
 * Set balance override for a bookie
 */
export function setBalanceOverride(
  bookieId: string,
  overrideValue: number,
  reason?: string
): BalanceOverride {
  const overrides = getBalanceOverrides()
  const existing = overrides.findIndex(o => o.bookieId === bookieId)

  const override: BalanceOverride = {
    bookieId,
    overrideValue,
    reason,
    createdAt: new Date().toISOString(),
  }

  if (existing !== -1) {
    overrides[existing] = override
  } else {
    overrides.push(override)
  }

  saveBalanceOverrides(overrides)
  return override
}

/**
 * Get balance override for a bookie
 */
export function getBalanceOverride(bookieId: string): BalanceOverride | null {
  const overrides = getBalanceOverrides()
  return overrides.find(o => o.bookieId === bookieId) || null
}

/**
 * Clear balance override for a bookie
 */
export function clearBalanceOverride(bookieId: string): boolean {
  const overrides = getBalanceOverrides()
  const filtered = overrides.filter(o => o.bookieId !== bookieId)
  if (filtered.length === overrides.length) return false
  saveBalanceOverrides(filtered)
  return true
}

// ============================================================================
// Reconciliation Matches
// ============================================================================

/**
 * Get all reconciliation matches
 */
export function getReconciliationMatches(): ReconciliationMatch[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(STORAGE_KEYS.RECONCILIATION)
  return stored ? JSON.parse(stored) : []
}

/**
 * Save all reconciliation matches
 */
export function saveReconciliationMatches(matches: ReconciliationMatch[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.RECONCILIATION, JSON.stringify(matches))
}

/**
 * Add a reconciliation match
 */
export function addReconciliationMatch(
  match: Omit<ReconciliationMatch, 'id' | 'createdAt'>
): ReconciliationMatch {
  const matches = getReconciliationMatches()
  const newMatch: ReconciliationMatch = {
    ...match,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  matches.push(newMatch)
  saveReconciliationMatches(matches)
  return newMatch
}

/**
 * Get match for a transaction
 */
export function getMatchForTransaction(transactionId: string): ReconciliationMatch | null {
  const matches = getReconciliationMatches()
  return matches.find(m => m.transactionId === transactionId) || null
}

/**
 * Get match for a tracker entry
 */
export function getMatchForTrackerEntry(trackerEntryId: string): ReconciliationMatch | null {
  const matches = getReconciliationMatches()
  return matches.find(m => m.trackerEntryId === trackerEntryId) || null
}

/**
 * Remove a reconciliation match
 */
export function removeReconciliationMatch(matchId: string): boolean {
  const matches = getReconciliationMatches()
  const filtered = matches.filter(m => m.id !== matchId)
  if (filtered.length === matches.length) return false
  saveReconciliationMatches(filtered)
  return true
}

/**
 * Clear all reconciliation matches
 */
export function clearReconciliationMatches(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEYS.RECONCILIATION)
}

// ============================================================================
// Settings
// ============================================================================

/**
 * Get accounts settings
 */
export function getAccountsSettings(): AccountsSettings {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNTS_SETTINGS
  const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS)
  return stored ? { ...DEFAULT_ACCOUNTS_SETTINGS, ...JSON.parse(stored) } : DEFAULT_ACCOUNTS_SETTINGS
}

/**
 * Save accounts settings
 */
export function saveAccountsSettings(settings: Partial<AccountsSettings>): void {
  if (typeof window === 'undefined') return
  const current = getAccountsSettings()
  const updated = { ...current, ...settings }
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated))
}

// ============================================================================
// Custom Bookies (User-Added)
// ============================================================================

/**
 * Custom bookie entry (user-added)
 */
export interface CustomBookie extends BookieDefinition {
  createdAt: string
  updatedAt: string
}

/**
 * Get all custom bookies
 */
export function getCustomBookies(): CustomBookie[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_BOOKIES)
  return stored ? JSON.parse(stored) : []
}

/**
 * Save all custom bookies
 */
export function saveCustomBookies(bookies: CustomBookie[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.CUSTOM_BOOKIES, JSON.stringify(bookies))
}

/**
 * Add a custom bookie
 */
export function addCustomBookie(
  bookie: Omit<BookieDefinition, 'id'> & { id?: string }
): CustomBookie {
  const bookies = getCustomBookies()
  const newBookie: CustomBookie = {
    ...bookie,
    id: bookie.id || `custom-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  bookies.push(newBookie)
  saveCustomBookies(bookies)
  return newBookie
}

/**
 * Update a custom bookie
 */
export function updateCustomBookie(id: string, updates: Partial<BookieDefinition>): CustomBookie | null {
  const bookies = getCustomBookies()
  const index = bookies.findIndex(b => b.id === id)
  if (index === -1) return null

  bookies[index] = {
    ...bookies[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  saveCustomBookies(bookies)
  return bookies[index]
}

/**
 * Add alias to a custom bookie
 */
export function addAliasToCustomBookie(id: string, alias: string): CustomBookie | null {
  const bookies = getCustomBookies()
  const bookie = bookies.find(b => b.id === id)
  if (!bookie) return null

  if (!bookie.aliases.includes(alias.toUpperCase())) {
    bookie.aliases.push(alias.toUpperCase())
    bookie.updatedAt = new Date().toISOString()
    saveCustomBookies(bookies)
  }
  return bookie
}

/**
 * Delete a custom bookie
 */
export function deleteCustomBookie(id: string): boolean {
  const bookies = getCustomBookies()
  const filtered = bookies.filter(b => b.id !== id)
  if (filtered.length === bookies.length) return false
  saveCustomBookies(filtered)
  return true
}

/**
 * Check if a bookie ID is custom
 */
export function isCustomBookie(id: string): boolean {
  return id.startsWith('custom-') || getCustomBookies().some(b => b.id === id)
}

// ============================================================================
// Clear All Data
// ============================================================================

/**
 * Clear all accounts module data
 */
export function clearAllAccountsData(): void {
  if (typeof window === 'undefined') return
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key))
}
