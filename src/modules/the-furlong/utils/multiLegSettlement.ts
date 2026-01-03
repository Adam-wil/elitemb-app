/**
 * Multi-leg Bet Settlement Logic
 *
 * Utilities for determining outcomes and calculating returns for multi-leg
 * (accumulator/parlay) bets. Handles scratched legs, dead heats, and early
 * loss detection.
 *
 * @see Story 3.10: Multi-leg Bet Settlement Logic
 */

import type {
  LegSummary,
  MultiLegOutcomeResult,
  MultiLegReturnsCalculation,
} from '@/modules/accounts/types/journal'

// ============================================================================
// Outcome Determination
// ============================================================================

/**
 * Determine the outcome of a multi-leg bet based on leg summaries
 *
 * Rules (in order of precedence):
 * 1. If ANY leg is PENDING → PENDING (wait for results)
 * 2. If ANY leg is LOSS → LOSS (multi loses immediately)
 * 3. If ALL legs are SCRATCHED → VOID (full refund)
 * 4. If any leg is DEAD_HEAT → DEAD_HEAT (reduced payout)
 * 5. Otherwise → WIN (all non-scratched legs won)
 *
 * @param legs - Array of leg summaries with outcomes
 * @returns Multi-leg outcome result with adjusted odds and factors
 */
export function determineMultiLegOutcome(
  legs: LegSummary[]
): MultiLegOutcomeResult {
  if (legs.length === 0) {
    return {
      outcome: 'PENDING',
      adjustedCombinedOdds: 0,
      deadHeatFactor: 1,
      activeLegCount: 0,
      scratchedLegCount: 0,
    }
  }

  // Check for any pending legs - must wait
  const pendingLegs = legs.filter((l) => l.outcome === 'PENDING')
  if (pendingLegs.length > 0) {
    const scratchedCount = legs.filter((l) => l.outcome === 'SCRATCHED').length
    return {
      outcome: 'PENDING',
      adjustedCombinedOdds: 0,
      deadHeatFactor: 1,
      activeLegCount: legs.length - pendingLegs.length - scratchedCount,
      scratchedLegCount: scratchedCount,
    }
  }

  // Check for any losing legs - multi loses immediately
  const losingLeg = legs.find((l) => l.outcome === 'LOSS')
  if (losingLeg) {
    return {
      outcome: 'LOSS',
      adjustedCombinedOdds: 0,
      deadHeatFactor: 1,
      activeLegCount: legs.length,
      scratchedLegCount: 0,
      losingLeg,
    }
  }

  // Separate scratched and active legs
  const scratchedLegs = legs.filter((l) => l.isScratched || l.outcome === 'SCRATCHED')
  const activeLegs = legs.filter((l) => !l.isScratched && l.outcome !== 'SCRATCHED')

  // All scratched = void (full refund)
  if (activeLegs.length === 0) {
    return {
      outcome: 'VOID',
      adjustedCombinedOdds: 1,
      deadHeatFactor: 1,
      activeLegCount: 0,
      scratchedLegCount: scratchedLegs.length,
    }
  }

  // Calculate adjusted combined odds (excluding scratched legs)
  const adjustedCombinedOdds = activeLegs.reduce(
    (product, leg) => product * leg.odds,
    1
  )

  // Check for dead heats in active legs
  const deadHeatLegs = activeLegs.filter(
    (l) => l.isDeadHeat || l.outcome === 'DEAD_HEAT'
  )

  if (deadHeatLegs.length > 0) {
    // Calculate combined dead heat factor (product of all DH factors)
    // DH factor = 1 / divisor (e.g., 1/2 for 2-way dead heat)
    const deadHeatFactor = deadHeatLegs.reduce((factor, leg) => {
      const divisor = leg.deadHeatDivisor || 2
      return factor * (1 / divisor)
    }, 1)

    return {
      outcome: 'DEAD_HEAT',
      adjustedCombinedOdds,
      deadHeatFactor,
      activeLegCount: activeLegs.length,
      scratchedLegCount: scratchedLegs.length,
    }
  }

  // All active legs won - success!
  return {
    outcome: 'WIN',
    adjustedCombinedOdds,
    deadHeatFactor: 1,
    activeLegCount: activeLegs.length,
    scratchedLegCount: scratchedLegs.length,
  }
}

// ============================================================================
// Returns Calculation
// ============================================================================

/**
 * Calculate returns for a multi-leg bet
 *
 * For clean wins:
 *   totalReturns = stake x combinedOdds
 *   profit = totalReturns - stake
 *
 * For dead heats:
 *   effectiveStake = stake x deadHeatFactor
 *   returnedPortion = stake - effectiveStake
 *   winningPortion = effectiveStake x combinedOdds
 *   totalReturns = winningPortion + returnedPortion
 *   profit = totalReturns - stake
 *
 * @param stake - Original stake amount
 * @param originalCombinedOdds - Original combined odds (all legs)
 * @param adjustedCombinedOdds - Adjusted odds (excluding scratched legs)
 * @param deadHeatFactor - Combined dead heat factor (1.0 if no dead heats)
 * @returns Detailed breakdown of returns calculation
 */
export function calculateMultiLegReturns(
  stake: number,
  originalCombinedOdds: number,
  adjustedCombinedOdds: number,
  deadHeatFactor: number
): MultiLegReturnsCalculation {
  if (deadHeatFactor === 1) {
    // No dead heat - simple calculation
    const totalReturns = stake * adjustedCombinedOdds
    return {
      originalCombinedOdds,
      adjustedCombinedOdds,
      effectiveStake: stake,
      winningPortion: totalReturns,
      returnedPortion: 0,
      totalReturns,
      profit: totalReturns - stake,
      deadHeatFactor: 1,
    }
  }

  // Dead heat - apply factor to stake
  const effectiveStake = stake * deadHeatFactor
  const returnedPortion = stake - effectiveStake
  const winningPortion = effectiveStake * adjustedCombinedOdds
  const totalReturns = winningPortion + returnedPortion

  return {
    originalCombinedOdds,
    adjustedCombinedOdds,
    effectiveStake,
    winningPortion,
    returnedPortion,
    totalReturns,
    profit: totalReturns - stake,
    deadHeatFactor,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build leg summaries from tracker entries
 *
 * Extracts relevant outcome data from RacingTrackerEntry or LayManagerEntry
 * for use in settlement calculations.
 *
 * @param legs - Array of tracker entries (children of a multi-leg bet)
 * @returns Array of leg summaries
 */
export function buildLegSummaries(
  legs: Array<{
    id: string
    legNumber?: number | null
    outcome: string
    backOdds: unknown // Decimal from Prisma
    autoResult?: { deadHeatDivisor?: number } | null
    horseName?: string | null
    track?: string | null
    raceNumber?: number | null
  }>
): LegSummary[] {
  return legs.map((leg, index) => {
    const outcome = leg.outcome as LegSummary['outcome']
    const isScratched = outcome === 'SCRATCHED'
    const isDeadHeat = outcome === 'DEAD_HEAT'

    return {
      id: leg.id,
      legNumber: leg.legNumber ?? index + 1,
      outcome,
      odds: Number(leg.backOdds),
      isScratched,
      isDeadHeat,
      deadHeatDivisor: isDeadHeat
        ? leg.autoResult?.deadHeatDivisor ?? 2
        : undefined,
      horseName: leg.horseName ?? undefined,
      track: leg.track ?? undefined,
      raceNumber: leg.raceNumber ?? undefined,
    }
  })
}

/**
 * Generate settlement description for a multi-leg bet
 *
 * @param outcome - Final outcome of the multi-leg bet
 * @param totalLegs - Total number of legs
 * @param activeLegs - Number of non-scratched legs
 * @param scratchedLegs - Number of scratched legs
 * @param combinedOdds - Combined odds used for payout
 * @param losingLeg - The leg that caused the loss (if applicable)
 * @param deadHeatInfo - Dead heat information (if applicable)
 * @returns Human-readable description for journal entry
 */
export function buildSettlementDescription(
  outcome: 'WIN' | 'LOSS' | 'VOID' | 'DEAD_HEAT',
  totalLegs: number,
  activeLegs: number,
  scratchedLegs: number,
  combinedOdds: number,
  losingLeg?: LegSummary,
  deadHeatInfo?: { factor: number; legs: LegSummary[] }
): string {
  switch (outcome) {
    case 'WIN':
      if (scratchedLegs > 0) {
        return `Multi WIN (${activeLegs}/${totalLegs} legs, ${scratchedLegs} scratched) @ ${combinedOdds.toFixed(2)}`
      }
      return `Multi WIN (${totalLegs}/${totalLegs} legs) @ ${combinedOdds.toFixed(2)}`

    case 'LOSS':
      if (losingLeg) {
        const legDesc = losingLeg.horseName
          ? `${losingLeg.horseName}`
          : `Leg ${losingLeg.legNumber}`
        return `Multi LOSS (${legDesc} lost)`
      }
      return `Multi LOSS`

    case 'VOID':
      return `Multi VOID (all ${totalLegs} legs scratched)`

    case 'DEAD_HEAT':
      if (deadHeatInfo) {
        const dhLegs = deadHeatInfo.legs
          .map((l) => `Leg ${l.legNumber} DH 1/${l.deadHeatDivisor}`)
          .join(', ')
        return `Multi DEAD_HEAT (${dhLegs}) @ ${combinedOdds.toFixed(2)}`
      }
      return `Multi DEAD_HEAT @ ${combinedOdds.toFixed(2)}`
  }
}

/**
 * Check if a multi-leg bet can be settled early (loss detected)
 *
 * Multi-leg bets can settle immediately if any leg loses,
 * without waiting for remaining legs to complete.
 *
 * @param legs - Array of leg summaries
 * @returns True if early settlement possible (a leg has lost)
 */
export function canSettleEarly(legs: LegSummary[]): boolean {
  return legs.some((l) => l.outcome === 'LOSS')
}

/**
 * Check if all legs are resolved (no pending)
 *
 * @param legs - Array of leg summaries
 * @returns True if all legs have final outcomes
 */
export function areAllLegsResolved(legs: LegSummary[]): boolean {
  return legs.every((l) => l.outcome !== 'PENDING')
}
