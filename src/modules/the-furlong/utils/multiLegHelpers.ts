/**
 * Multi-leg Bet Helper Functions
 *
 * Utilities for detecting and handling multi-leg (accumulator/parlay) bets.
 * Only parent entries create journal entries; child legs store details only.
 */

import prisma from '@/lib/prisma'
import type { RacingTrackerEntry, LayManagerEntry, RaceOutcome } from '@prisma/client'

// ============================================================================
// Types
// ============================================================================

/**
 * Common multi-leg fields present on both RacingTrackerEntry and LayManagerEntry
 */
interface MultiLegFields {
  isMultiLeg: boolean
  parentBetId: string | null
  legNumber?: number | null
  legCount?: number | null
  combinedOdds?: number | null
}

/**
 * Minimal entry type for multi-leg detection (works with both tracker types)
 */
type TrackerEntry = Pick<
  RacingTrackerEntry | LayManagerEntry,
  'isMultiLeg' | 'parentBetId'
>

/**
 * Entry with outcome for status aggregation
 */
interface EntryWithOutcome {
  outcome: RaceOutcome
}

/**
 * Aggregate status of a multi-leg bet
 */
export interface MultiLegStatus {
  totalLegs: number
  settledLegs: number
  pendingLegs: number
  allWin: boolean
  anyLoss: boolean
  anyScratch: boolean
}

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Check if entry is a multi-leg parent (should create journal)
 *
 * A parent entry has:
 * - isMultiLeg = true
 * - parentBetId = null (it IS the parent)
 */
export function isMultiLegParent(entry: TrackerEntry): boolean {
  return entry.isMultiLeg === true && entry.parentBetId === null
}

/**
 * Check if entry is a multi-leg child (should NOT create journal)
 *
 * A child entry has:
 * - parentBetId != null (it references a parent)
 */
export function isMultiLegChild(entry: TrackerEntry): boolean {
  return entry.parentBetId !== null
}

/**
 * Check if entry is a single (non-multi) bet
 */
export function isSingleBet(entry: TrackerEntry): boolean {
  return !entry.isMultiLeg && entry.parentBetId === null
}

/**
 * Check if entry should create a journal entry
 *
 * Returns true for:
 * - Single bets (normal case)
 * - Multi-leg parents (creates journal for entire multi)
 *
 * Returns false for:
 * - Multi-leg children (parent handles journal)
 */
export function shouldCreateJournalEntry(entry: TrackerEntry): boolean {
  // Child legs never create journals
  if (isMultiLegChild(entry)) {
    return false
  }
  // Single bets and multi-leg parents create journals
  return true
}

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Calculate combined odds for a multi-leg bet
 *
 * Combined odds = product of all individual leg odds
 *
 * Example: 3 legs at 2.50, 2.00, 2.50
 * Combined = 2.50 x 2.00 x 2.50 = 12.50
 *
 * @param legs - Array of legs with backOdds
 * @returns Combined odds (product of all leg odds)
 */
export function calculateCombinedOdds(
  legs: Array<{ backOdds: number }>
): number {
  if (legs.length === 0) return 1
  return legs.reduce((product, leg) => product * leg.backOdds, 1)
}

/**
 * Recalculate combined odds excluding scratched legs
 *
 * When a leg is scratched, the multi continues with remaining legs
 * at recalculated combined odds.
 *
 * @param legs - Array of legs with backOdds and outcome
 * @returns Recalculated combined odds
 */
export function recalculateCombinedOdds(
  legs: Array<{ backOdds: number; outcome: RaceOutcome }>
): number {
  const activeLegs = legs.filter((leg) => leg.outcome !== 'SCRATCHED')
  return calculateCombinedOdds(activeLegs)
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get all child legs for a multi-leg parent
 *
 * @param parentId - ID of the parent entry
 * @param model - 'racing' or 'lay' to specify which tracker
 * @returns Array of child leg entries
 */
export async function getMultiLegChildren(
  parentId: string,
  model: 'racing' | 'lay'
): Promise<Array<RacingTrackerEntry | LayManagerEntry>> {
  if (model === 'racing') {
    return prisma.racingTrackerEntry.findMany({
      where: { parentBetId: parentId },
      orderBy: { legNumber: 'asc' },
    })
  } else {
    return prisma.layManagerEntry.findMany({
      where: { parentBetId: parentId },
      orderBy: { legNumber: 'asc' },
    })
  }
}

/**
 * Get the parent entry for a multi-leg child
 *
 * @param childEntry - Child entry with parentBetId
 * @param model - 'racing' or 'lay' to specify which tracker
 * @returns Parent entry or null if not found
 */
export async function getMultiLegParent(
  childEntry: { parentBetId: string | null },
  model: 'racing' | 'lay'
): Promise<RacingTrackerEntry | LayManagerEntry | null> {
  if (!childEntry.parentBetId) return null

  if (model === 'racing') {
    return prisma.racingTrackerEntry.findUnique({
      where: { id: childEntry.parentBetId },
    })
  } else {
    return prisma.layManagerEntry.findUnique({
      where: { id: childEntry.parentBetId },
    })
  }
}

/**
 * Check if all legs of a multi-leg bet are settled
 *
 * @param parentId - ID of the parent entry
 * @param model - 'racing' or 'lay' to specify which tracker
 * @returns true if all legs have outcomes (not PENDING)
 */
export async function areAllLegsSettled(
  parentId: string,
  model: 'racing' | 'lay'
): Promise<boolean> {
  const children = await getMultiLegChildren(parentId, model)
  return children.every((child) => child.outcome !== 'PENDING')
}

/**
 * Get aggregate status of a multi-leg bet
 *
 * Provides summary of leg outcomes for determining parent settlement.
 *
 * @param parentId - ID of the parent entry
 * @param model - 'racing' or 'lay' to specify which tracker
 * @returns Aggregate status with counts and flags
 */
export async function getMultiLegStatus(
  parentId: string,
  model: 'racing' | 'lay'
): Promise<MultiLegStatus> {
  const children = await getMultiLegChildren(parentId, model)

  const settledLegs = children.filter((c) => c.outcome !== 'PENDING').length
  const pendingLegs = children.filter((c) => c.outcome === 'PENDING').length
  const wins = children.filter((c) => c.outcome === 'WIN').length
  const losses = children.filter((c) => c.outcome === 'LOSS').length
  const scratches = children.filter((c) => c.outcome === 'SCRATCHED').length

  return {
    totalLegs: children.length,
    settledLegs,
    pendingLegs,
    allWin: wins === children.length,
    anyLoss: losses > 0,
    anyScratch: scratches > 0,
  }
}

/**
 * Determine the final outcome of a multi-leg bet
 *
 * Rules:
 * - If any leg is PENDING: return PENDING
 * - If any leg is LOSS: return LOSS (multi loses if any leg loses)
 * - If all legs are WIN or SCRATCHED (with at least one WIN): return WIN
 * - If all legs are SCRATCHED: return SCRATCHED (refund)
 * - If all legs are REFUND: return REFUND
 *
 * @param parentId - ID of the parent entry
 * @param model - 'racing' or 'lay' to specify which tracker
 * @returns Final outcome for the multi-leg bet
 */
export async function determineMultiLegOutcome(
  parentId: string,
  model: 'racing' | 'lay'
): Promise<RaceOutcome> {
  const children = await getMultiLegChildren(parentId, model)

  if (children.length === 0) return 'PENDING'

  // If any leg is pending, the multi is pending
  if (children.some((c) => c.outcome === 'PENDING')) {
    return 'PENDING'
  }

  // If any leg is a loss, the multi loses
  if (children.some((c) => c.outcome === 'LOSS')) {
    return 'LOSS'
  }

  // Count wins, scratches, refunds, dead heats
  const wins = children.filter((c) => c.outcome === 'WIN').length
  const scratches = children.filter((c) => c.outcome === 'SCRATCHED').length
  const refunds = children.filter((c) => c.outcome === 'REFUND').length
  const deadHeats = children.filter((c) => c.outcome === 'DEAD_HEAT').length

  // If all scratched, refund the multi
  if (scratches === children.length) {
    return 'SCRATCHED'
  }

  // If all refunded, refund the multi
  if (refunds === children.length) {
    return 'REFUND'
  }

  // If there are wins (with possible scratches/dead heats), it's a win
  // Dead heats are treated as partial wins in the context of multis
  if (wins > 0 || deadHeats > 0) {
    // If all settled legs are wins/scratches/dead heats, the multi wins
    const nonLossOutcomes = wins + scratches + deadHeats + refunds
    if (nonLossOutcomes === children.length) {
      // If any dead heats, the multi is a dead heat (reduced payout)
      if (deadHeats > 0) {
        return 'DEAD_HEAT'
      }
      return 'WIN'
    }
  }

  // Default fallback (shouldn't reach here normally)
  return 'PENDING'
}
