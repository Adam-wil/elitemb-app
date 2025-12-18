/**
 * Bookie Detection Algorithm
 *
 * Detects which bookie a bank transaction belongs to by matching
 * the transaction description against known bookie aliases.
 *
 * Uses fuzzy matching with confidence scoring.
 */

import type { BookieDetectionResult, NormalizedTransaction, BasiqTransaction, BookieDefinition } from '../types'
import { BOOKIE_DEFINITIONS } from './bookieList'
import { getCustomBookies } from './accountsStorage'

/**
 * Get all bookies (built-in + custom)
 */
function getAllBookies(): BookieDefinition[] {
  const customBookies = getCustomBookies()
  return [...BOOKIE_DEFINITIONS, ...customBookies]
}

// ============================================================================
// Text Normalization
// ============================================================================

/**
 * Normalize a string for comparison
 * - Uppercase
 * - Remove special characters
 * - Collapse whitespace
 */
function normalize(str: string): string {
  return str
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Remove common payment processor suffixes
 */
function removePaymentSuffixes(str: string): string {
  const suffixes = [
    'PTY LTD',
    'PTY',
    'LTD',
    'LIMITED',
    'AUSTRALIA',
    'AU',
    'HOLDINGS',
    'DIGITAL',
    'DIRECT DEBIT',
    'TRANSFER',
    'PAYMENT',
  ]

  let result = str
  for (const suffix of suffixes) {
    result = result.replace(new RegExp(`\\s*${suffix}\\s*$`, 'i'), '')
  }
  return result.trim()
}

// ============================================================================
// Similarity Scoring
// ============================================================================

/**
 * Calculate similarity score between description and alias
 * Returns a value between 0 and 1
 */
function calculateSimilarity(description: string, alias: string): number {
  const normDesc = normalize(description)
  const normAlias = normalize(alias)
  const cleanDesc = removePaymentSuffixes(normDesc)

  // Exact match after normalization
  if (normDesc === normAlias || cleanDesc === normAlias) {
    return 1.0
  }

  // Description contains full alias
  if (normDesc.includes(normAlias)) {
    // Higher score for longer aliases (more specific)
    const lengthBonus = Math.min(normAlias.length / 20, 0.05)
    return 0.9 + lengthBonus
  }

  // Clean description contains alias
  if (cleanDesc.includes(normAlias)) {
    return 0.85
  }

  // Alias contains description (less common)
  if (normAlias.includes(cleanDesc) && cleanDesc.length > 3) {
    return 0.75
  }

  // Word-by-word matching
  const descWords = normDesc.split(' ')
  const aliasWords = normAlias.split(' ')

  let matchedWords = 0
  for (const aliasWord of aliasWords) {
    if (aliasWord.length < 3) continue // Skip short words
    if (descWords.some(dw => dw.includes(aliasWord) || aliasWord.includes(dw))) {
      matchedWords++
    }
  }

  if (matchedWords > 0 && aliasWords.length > 0) {
    const wordMatchRatio = matchedWords / aliasWords.length
    return Math.min(wordMatchRatio * 0.7, 0.7)
  }

  return 0
}

// ============================================================================
// Bookie Detection
// ============================================================================

/**
 * Detect bookie from transaction description
 */
export function detectBookie(description: string): BookieDetectionResult {
  let bestMatch: BookieDetectionResult = {
    bookieId: null,
    bookieName: null,
    confidence: 0,
    matchedAlias: null,
    isExchange: false,
  }

  const allBookies = getAllBookies()
  for (const bookie of allBookies) {
    for (const alias of bookie.aliases) {
      const similarity = calculateSimilarity(description, alias)

      if (similarity > bestMatch.confidence) {
        bestMatch = {
          bookieId: bookie.id,
          bookieName: bookie.name,
          confidence: similarity,
          matchedAlias: alias,
          isExchange: bookie.isExchange,
        }
      }
    }
  }

  // Only consider it a match if confidence is above threshold
  const CONFIDENCE_THRESHOLD = 0.7
  if (bestMatch.confidence < CONFIDENCE_THRESHOLD) {
    return {
      bookieId: null,
      bookieName: null,
      confidence: bestMatch.confidence, // Keep the best score even if below threshold
      matchedAlias: null,
      isExchange: false,
    }
  }

  return bestMatch
}

/**
 * Check if a transaction is bookie-related
 */
export function isBookieTransaction(description: string): boolean {
  const result = detectBookie(description)
  return result.bookieId !== null
}

/**
 * Check if a transaction is from an exchange (Betfair, Smarkets)
 */
export function isExchangeTransaction(description: string): boolean {
  const result = detectBookie(description)
  return result.isExchange
}

// ============================================================================
// Transaction Normalization
// ============================================================================

/**
 * Normalize a Basiq transaction and detect bookie
 */
export function normalizeTransaction(tx: BasiqTransaction): NormalizedTransaction {
  const detection = detectBookie(tx.description)

  return {
    id: tx.id,
    date: tx.postDate.split('T')[0],
    description: tx.description,
    rawDescription: tx.description,
    amount: parseFloat(tx.amount),
    balance: parseFloat(tx.balance),
    direction: tx.direction,
    accountId: tx.account,

    // Bookie detection results
    detectedBookie: detection.bookieName,
    bookieId: detection.bookieId,
    bookieConfidence: detection.confidence,
    isBookieTransaction: detection.bookieId !== null,
    isExchange: detection.isExchange,

    // Reconciliation (pending by default)
    reconciliationStatus: 'pending',
    matchedTrackerEntryId: null,

    // Metadata
    fetchedAt: new Date().toISOString(),
  }
}

/**
 * Process an array of Basiq transactions
 */
export function processTransactions(transactions: BasiqTransaction[]): NormalizedTransaction[] {
  return transactions.map(normalizeTransaction)
}

/**
 * Filter transactions to only bookie-related ones
 */
export function filterBookieTransactions(
  transactions: NormalizedTransaction[]
): NormalizedTransaction[] {
  return transactions.filter(tx => tx.isBookieTransaction)
}

/**
 * Filter transactions to only exchange-related ones (Betfair, Smarkets)
 */
export function filterExchangeTransactions(
  transactions: NormalizedTransaction[]
): NormalizedTransaction[] {
  return transactions.filter(tx => tx.isExchange)
}

/**
 * Filter transactions to only regular bookie (non-exchange) ones
 */
export function filterRegularBookieTransactions(
  transactions: NormalizedTransaction[]
): NormalizedTransaction[] {
  return transactions.filter(tx => tx.isBookieTransaction && !tx.isExchange)
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get transaction statistics by bookie
 */
export function getTransactionStatsByBookie(
  transactions: NormalizedTransaction[]
): Map<string, { count: number; totalIn: number; totalOut: number }> {
  const stats = new Map<string, { count: number; totalIn: number; totalOut: number }>()

  for (const tx of transactions) {
    if (!tx.bookieId) continue

    const existing = stats.get(tx.bookieId) || { count: 0, totalIn: 0, totalOut: 0 }
    existing.count++

    if (tx.direction === 'credit') {
      existing.totalIn += Math.abs(tx.amount)
    } else {
      existing.totalOut += Math.abs(tx.amount)
    }

    stats.set(tx.bookieId, existing)
  }

  return stats
}

/**
 * Get unique bookies from transactions
 */
export function getUniqueBookiesFromTransactions(
  transactions: NormalizedTransaction[]
): string[] {
  const bookies = new Set<string>()
  for (const tx of transactions) {
    if (tx.detectedBookie) {
      bookies.add(tx.detectedBookie)
    }
  }
  return Array.from(bookies).sort()
}
