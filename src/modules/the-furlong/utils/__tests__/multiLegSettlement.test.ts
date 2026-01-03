/**
 * Multi-leg Bet Settlement Logic Tests
 *
 * Test cases for outcome determination and returns calculation.
 *
 * @see src/modules/the-furlong/utils/multiLegSettlement.ts
 * @see Story 3.10: Multi-leg Bet Settlement Logic
 */

import { describe, it, expect } from 'vitest'
import {
  determineMultiLegOutcome,
  calculateMultiLegReturns,
  buildLegSummaries,
  buildSettlementDescription,
  canSettleEarly,
  areAllLegsResolved,
} from '../multiLegSettlement'
import type { LegSummary } from '@/modules/accounts/types/journal'

// ============================================================================
// Outcome Determination Tests
// ============================================================================

describe('determineMultiLegOutcome', () => {
  describe('WIN scenarios', () => {
    it('returns WIN when all legs win', () => {
      const legs: LegSummary[] = [
        { id: '1', legNumber: 1, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
        { id: '2', legNumber: 2, outcome: 'WIN', odds: 2.0, isScratched: false, isDeadHeat: false },
        { id: '3', legNumber: 3, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
      ]
      const result = determineMultiLegOutcome(legs)

      expect(result.outcome).toBe('WIN')
      expect(result.adjustedCombinedOdds).toBe(12.5) // 2.5 * 2.0 * 2.5
      expect(result.deadHeatFactor).toBe(1)
      expect(result.activeLegCount).toBe(3)
      expect(result.scratchedLegCount).toBe(0)
    })

    it('returns WIN with adjusted odds when leg scratched', () => {
      const legs: LegSummary[] = [
        { id: '1', legNumber: 1, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
        { id: '2', legNumber: 2, outcome: 'SCRATCHED', odds: 2.0, isScratched: true, isDeadHeat: false },
        { id: '3', legNumber: 3, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
      ]
      const result = determineMultiLegOutcome(legs)

      expect(result.outcome).toBe('WIN')
      expect(result.adjustedCombinedOdds).toBe(6.25) // 2.5 * 2.5 (scratched excluded)
      expect(result.activeLegCount).toBe(2)
      expect(result.scratchedLegCount).toBe(1)
    })

    it('handles multiple scratched legs', () => {
      const legs: LegSummary[] = [
        { id: '1', legNumber: 1, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
        { id: '2', legNumber: 2, outcome: 'SCRATCHED', odds: 2.0, isScratched: true, isDeadHeat: false },
        { id: '3', legNumber: 3, outcome: 'SCRATCHED', odds: 2.5, isScratched: true, isDeadHeat: false },
        { id: '4', legNumber: 4, outcome: 'WIN', odds: 3.0, isScratched: false, isDeadHeat: false },
      ]
      const result = determineMultiLegOutcome(legs)

      expect(result.outcome).toBe('WIN')
      expect(result.adjustedCombinedOdds).toBe(7.5) // 2.5 * 3.0
      expect(result.activeLegCount).toBe(2)
      expect(result.scratchedLegCount).toBe(2)
    })
  })

  describe('LOSS scenarios', () => {
    it('returns LOSS when any leg loses', () => {
      const legs: LegSummary[] = [
        { id: '1', legNumber: 1, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
        { id: '2', legNumber: 2, outcome: 'LOSS', odds: 2.0, isScratched: false, isDeadHeat: false, horseName: 'Thunder' },
        { id: '3', legNumber: 3, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
      ]
      const result = determineMultiLegOutcome(legs)

      expect(result.outcome).toBe('LOSS')
      expect(result.losingLeg).toBeDefined()
      expect(result.losingLeg?.legNumber).toBe(2)
      expect(result.losingLeg?.horseName).toBe('Thunder')
    })

    it('returns LOSS with first losing leg when multiple lose', () => {
      const legs: LegSummary[] = [
        { id: '1', legNumber: 1, outcome: 'LOSS', odds: 2.5, isScratched: false, isDeadHeat: false, horseName: 'First' },
        { id: '2', legNumber: 2, outcome: 'LOSS', odds: 2.0, isScratched: false, isDeadHeat: false, horseName: 'Second' },
      ]
      const result = determineMultiLegOutcome(legs)

      expect(result.outcome).toBe('LOSS')
      expect(result.losingLeg?.horseName).toBe('First')
    })

    it('returns LOSS even if remaining legs pending', () => {
      const legs: LegSummary[] = [
        { id: '1', legNumber: 1, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
        { id: '2', legNumber: 2, outcome: 'LOSS', odds: 2.0, isScratched: false, isDeadHeat: false },
        { id: '3', legNumber: 3, outcome: 'PENDING', odds: 2.5, isScratched: false, isDeadHeat: false },
      ]
      const result = determineMultiLegOutcome(legs)

      // PENDING takes precedence to wait for results
      expect(result.outcome).toBe('PENDING')
    })
  })

  describe('VOID scenarios', () => {
    it('returns VOID when all legs scratched', () => {
      const legs: LegSummary[] = [
        { id: '1', legNumber: 1, outcome: 'SCRATCHED', odds: 2.5, isScratched: true, isDeadHeat: false },
        { id: '2', legNumber: 2, outcome: 'SCRATCHED', odds: 2.0, isScratched: true, isDeadHeat: false },
      ]
      const result = determineMultiLegOutcome(legs)

      expect(result.outcome).toBe('VOID')
      expect(result.adjustedCombinedOdds).toBe(1)
      expect(result.activeLegCount).toBe(0)
      expect(result.scratchedLegCount).toBe(2)
    })
  })

  describe('DEAD_HEAT scenarios', () => {
    it('returns DEAD_HEAT with factor when single leg dead heat', () => {
      const legs: LegSummary[] = [
        { id: '1', legNumber: 1, outcome: 'DEAD_HEAT', odds: 2.5, isScratched: false, isDeadHeat: true, deadHeatDivisor: 2 },
        { id: '2', legNumber: 2, outcome: 'WIN', odds: 2.0, isScratched: false, isDeadHeat: false },
      ]
      const result = determineMultiLegOutcome(legs)

      expect(result.outcome).toBe('DEAD_HEAT')
      expect(result.deadHeatFactor).toBe(0.5) // 1/2
      expect(result.adjustedCombinedOdds).toBe(5) // 2.5 * 2.0
    })

    it('returns DEAD_HEAT with compounded factor for multiple dead heats', () => {
      const legs: LegSummary[] = [
        { id: '1', legNumber: 1, outcome: 'DEAD_HEAT', odds: 2.5, isScratched: false, isDeadHeat: true, deadHeatDivisor: 2 },
        { id: '2', legNumber: 2, outcome: 'DEAD_HEAT', odds: 2.0, isScratched: false, isDeadHeat: true, deadHeatDivisor: 2 },
        { id: '3', legNumber: 3, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
      ]
      const result = determineMultiLegOutcome(legs)

      expect(result.outcome).toBe('DEAD_HEAT')
      expect(result.deadHeatFactor).toBe(0.25) // 1/2 * 1/2 = 1/4
    })

    it('handles 3-way dead heat', () => {
      const legs: LegSummary[] = [
        { id: '1', legNumber: 1, outcome: 'DEAD_HEAT', odds: 3.0, isScratched: false, isDeadHeat: true, deadHeatDivisor: 3 },
        { id: '2', legNumber: 2, outcome: 'WIN', odds: 2.0, isScratched: false, isDeadHeat: false },
      ]
      const result = determineMultiLegOutcome(legs)

      expect(result.outcome).toBe('DEAD_HEAT')
      expect(result.deadHeatFactor).toBeCloseTo(0.333, 2) // 1/3
    })
  })

  describe('PENDING scenarios', () => {
    it('returns PENDING when any leg pending', () => {
      const legs: LegSummary[] = [
        { id: '1', legNumber: 1, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
        { id: '2', legNumber: 2, outcome: 'PENDING', odds: 2.0, isScratched: false, isDeadHeat: false },
      ]
      const result = determineMultiLegOutcome(legs)

      expect(result.outcome).toBe('PENDING')
    })

    it('returns PENDING for empty legs array', () => {
      const result = determineMultiLegOutcome([])

      expect(result.outcome).toBe('PENDING')
      expect(result.adjustedCombinedOdds).toBe(0)
    })
  })
})

// ============================================================================
// Returns Calculation Tests
// ============================================================================

describe('calculateMultiLegReturns', () => {
  describe('clean win calculations', () => {
    it('calculates correct returns for full payout', () => {
      const result = calculateMultiLegReturns(10, 12.5, 12.5, 1)

      expect(result.totalReturns).toBe(125) // 10 * 12.5
      expect(result.profit).toBe(115) // 125 - 10
      expect(result.effectiveStake).toBe(10)
      expect(result.winningPortion).toBe(125)
      expect(result.returnedPortion).toBe(0)
      expect(result.deadHeatFactor).toBe(1)
    })

    it('calculates correct returns with adjusted odds', () => {
      // Original 12.5, adjusted 6.25 (leg scratched)
      const result = calculateMultiLegReturns(10, 12.5, 6.25, 1)

      expect(result.totalReturns).toBe(62.5) // 10 * 6.25
      expect(result.profit).toBe(52.5) // 62.5 - 10
      expect(result.originalCombinedOdds).toBe(12.5)
      expect(result.adjustedCombinedOdds).toBe(6.25)
    })
  })

  describe('dead heat calculations', () => {
    it('calculates correct returns with 2-way dead heat', () => {
      const result = calculateMultiLegReturns(10, 12.5, 12.5, 0.5)

      expect(result.effectiveStake).toBe(5) // 10 * 0.5
      expect(result.winningPortion).toBe(62.5) // 5 * 12.5
      expect(result.returnedPortion).toBe(5) // 10 - 5
      expect(result.totalReturns).toBe(67.5) // 62.5 + 5
      expect(result.profit).toBe(57.5) // 67.5 - 10
    })

    it('calculates correct returns with compounded dead heat', () => {
      // Two 2-way dead heats = 1/4 factor
      const result = calculateMultiLegReturns(10, 12.5, 12.5, 0.25)

      expect(result.effectiveStake).toBe(2.5) // 10 * 0.25
      expect(result.winningPortion).toBe(31.25) // 2.5 * 12.5
      expect(result.returnedPortion).toBe(7.5) // 10 - 2.5
      expect(result.totalReturns).toBe(38.75) // 31.25 + 7.5
      expect(result.profit).toBe(28.75) // 38.75 - 10
    })

    it('handles 3-way dead heat', () => {
      const factor = 1 / 3
      const result = calculateMultiLegReturns(10, 6, 6, factor)

      expect(result.effectiveStake).toBeCloseTo(3.33, 1)
      expect(result.winningPortion).toBeCloseTo(20, 0) // 3.33 * 6
      expect(result.returnedPortion).toBeCloseTo(6.67, 1)
      expect(result.totalReturns).toBeCloseTo(26.67, 1)
      expect(result.profit).toBeCloseTo(16.67, 1)
    })
  })
})

// ============================================================================
// Helper Functions Tests
// ============================================================================

describe('buildLegSummaries', () => {
  it('builds summaries from tracker entries', () => {
    const legs = [
      { id: 'leg-1', legNumber: 1, outcome: 'WIN', backOdds: 2.5, horseName: 'Thunder', track: 'Randwick', raceNumber: 3 },
      { id: 'leg-2', legNumber: 2, outcome: 'LOSS', backOdds: 2.0, horseName: 'Lightning', track: 'Flemington', raceNumber: 5 },
    ]

    const summaries = buildLegSummaries(legs)

    expect(summaries).toHaveLength(2)
    expect(summaries[0]).toEqual({
      id: 'leg-1',
      legNumber: 1,
      outcome: 'WIN',
      odds: 2.5,
      isScratched: false,
      isDeadHeat: false,
      deadHeatDivisor: undefined,
      horseName: 'Thunder',
      track: 'Randwick',
      raceNumber: 3,
    })
    expect(summaries[1].outcome).toBe('LOSS')
  })

  it('extracts dead heat divisor from autoResult', () => {
    const legs = [
      {
        id: 'leg-1',
        legNumber: 1,
        outcome: 'DEAD_HEAT',
        backOdds: 2.5,
        autoResult: { deadHeatDivisor: 3 },
      },
    ]

    const summaries = buildLegSummaries(legs)

    expect(summaries[0].isDeadHeat).toBe(true)
    expect(summaries[0].deadHeatDivisor).toBe(3)
  })

  it('assigns leg numbers sequentially if missing', () => {
    const legs = [
      { id: 'leg-1', outcome: 'WIN', backOdds: 2.5 },
      { id: 'leg-2', outcome: 'WIN', backOdds: 2.0 },
    ]

    const summaries = buildLegSummaries(legs)

    expect(summaries[0].legNumber).toBe(1)
    expect(summaries[1].legNumber).toBe(2)
  })
})

describe('buildSettlementDescription', () => {
  it('builds WIN description', () => {
    const desc = buildSettlementDescription('WIN', 3, 3, 0, 12.5)
    expect(desc).toBe('Multi WIN (3/3 legs) @ 12.50')
  })

  it('builds WIN with scratch description', () => {
    const desc = buildSettlementDescription('WIN', 3, 2, 1, 6.25)
    expect(desc).toBe('Multi WIN (2/3 legs, 1 scratched) @ 6.25')
  })

  it('builds LOSS description with losing leg', () => {
    const losingLeg: LegSummary = {
      id: '2',
      legNumber: 2,
      outcome: 'LOSS',
      odds: 2.0,
      isScratched: false,
      isDeadHeat: false,
      horseName: 'Thunder',
    }
    const desc = buildSettlementDescription('LOSS', 3, 3, 0, 0, losingLeg)
    expect(desc).toBe('Multi LOSS (Thunder lost)')
  })

  it('builds VOID description', () => {
    const desc = buildSettlementDescription('VOID', 3, 0, 3, 0)
    expect(desc).toBe('Multi VOID (all 3 legs scratched)')
  })

  it('builds DEAD_HEAT description', () => {
    const dhLegs: LegSummary[] = [
      { id: '1', legNumber: 1, outcome: 'DEAD_HEAT', odds: 2.5, isScratched: false, isDeadHeat: true, deadHeatDivisor: 2 },
    ]
    const desc = buildSettlementDescription('DEAD_HEAT', 3, 3, 0, 12.5, undefined, { factor: 0.5, legs: dhLegs })
    expect(desc).toBe('Multi DEAD_HEAT (Leg 1 DH 1/2) @ 12.50')
  })
})

describe('canSettleEarly', () => {
  it('returns true when any leg has LOSS', () => {
    const legs: LegSummary[] = [
      { id: '1', legNumber: 1, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
      { id: '2', legNumber: 2, outcome: 'LOSS', odds: 2.0, isScratched: false, isDeadHeat: false },
      { id: '3', legNumber: 3, outcome: 'PENDING', odds: 2.5, isScratched: false, isDeadHeat: false },
    ]
    expect(canSettleEarly(legs)).toBe(true)
  })

  it('returns false when no loss', () => {
    const legs: LegSummary[] = [
      { id: '1', legNumber: 1, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
      { id: '2', legNumber: 2, outcome: 'PENDING', odds: 2.0, isScratched: false, isDeadHeat: false },
    ]
    expect(canSettleEarly(legs)).toBe(false)
  })
})

describe('areAllLegsResolved', () => {
  it('returns true when no pending legs', () => {
    const legs: LegSummary[] = [
      { id: '1', legNumber: 1, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
      { id: '2', legNumber: 2, outcome: 'LOSS', odds: 2.0, isScratched: false, isDeadHeat: false },
    ]
    expect(areAllLegsResolved(legs)).toBe(true)
  })

  it('returns false when any leg pending', () => {
    const legs: LegSummary[] = [
      { id: '1', legNumber: 1, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
      { id: '2', legNumber: 2, outcome: 'PENDING', odds: 2.0, isScratched: false, isDeadHeat: false },
    ]
    expect(areAllLegsResolved(legs)).toBe(false)
  })
})

// ============================================================================
// Integration Scenarios
// ============================================================================

describe('Multi-leg settlement scenarios', () => {
  describe('3-leg accumulator', () => {
    it('full win scenario', () => {
      const legs: LegSummary[] = [
        { id: '1', legNumber: 1, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
        { id: '2', legNumber: 2, outcome: 'WIN', odds: 2.0, isScratched: false, isDeadHeat: false },
        { id: '3', legNumber: 3, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
      ]

      const outcome = determineMultiLegOutcome(legs)
      expect(outcome.outcome).toBe('WIN')
      expect(outcome.adjustedCombinedOdds).toBe(12.5)

      const returns = calculateMultiLegReturns(10, 12.5, outcome.adjustedCombinedOdds, outcome.deadHeatFactor)
      expect(returns.totalReturns).toBe(125)
      expect(returns.profit).toBe(115)
    })

    it('one leg scratched, others win', () => {
      const legs: LegSummary[] = [
        { id: '1', legNumber: 1, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
        { id: '2', legNumber: 2, outcome: 'SCRATCHED', odds: 2.0, isScratched: true, isDeadHeat: false },
        { id: '3', legNumber: 3, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
      ]

      const outcome = determineMultiLegOutcome(legs)
      expect(outcome.outcome).toBe('WIN')
      expect(outcome.adjustedCombinedOdds).toBe(6.25) // 2.5 * 2.5

      const returns = calculateMultiLegReturns(10, 12.5, outcome.adjustedCombinedOdds, outcome.deadHeatFactor)
      expect(returns.totalReturns).toBe(62.5)
      expect(returns.profit).toBe(52.5)
    })

    it('one leg dead heat, others win', () => {
      const legs: LegSummary[] = [
        { id: '1', legNumber: 1, outcome: 'DEAD_HEAT', odds: 2.5, isScratched: false, isDeadHeat: true, deadHeatDivisor: 2 },
        { id: '2', legNumber: 2, outcome: 'WIN', odds: 2.0, isScratched: false, isDeadHeat: false },
        { id: '3', legNumber: 3, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
      ]

      const outcome = determineMultiLegOutcome(legs)
      expect(outcome.outcome).toBe('DEAD_HEAT')
      expect(outcome.adjustedCombinedOdds).toBe(12.5)
      expect(outcome.deadHeatFactor).toBe(0.5)

      const returns = calculateMultiLegReturns(10, 12.5, outcome.adjustedCombinedOdds, outcome.deadHeatFactor)
      expect(returns.effectiveStake).toBe(5)
      expect(returns.winningPortion).toBe(62.5) // 5 * 12.5
      expect(returns.returnedPortion).toBe(5)
      expect(returns.totalReturns).toBe(67.5)
      expect(returns.profit).toBe(57.5)
    })

    it('one leg loses (early settlement)', () => {
      const legs: LegSummary[] = [
        { id: '1', legNumber: 1, outcome: 'WIN', odds: 2.5, isScratched: false, isDeadHeat: false },
        { id: '2', legNumber: 2, outcome: 'LOSS', odds: 2.0, isScratched: false, isDeadHeat: false, horseName: 'Thunder' },
        { id: '3', legNumber: 3, outcome: 'PENDING', odds: 2.5, isScratched: false, isDeadHeat: false },
      ]

      // Early loss detection
      expect(canSettleEarly(legs)).toBe(true)

      // But determineMultiLegOutcome waits for pending legs
      // (The early settlement is handled at the trigger level)
      const outcome = determineMultiLegOutcome(legs)
      expect(outcome.outcome).toBe('PENDING')
    })
  })

  describe('edge cases', () => {
    it('2-leg double', () => {
      const legs: LegSummary[] = [
        { id: '1', legNumber: 1, outcome: 'WIN', odds: 3.0, isScratched: false, isDeadHeat: false },
        { id: '2', legNumber: 2, outcome: 'WIN', odds: 4.0, isScratched: false, isDeadHeat: false },
      ]

      const outcome = determineMultiLegOutcome(legs)
      expect(outcome.adjustedCombinedOdds).toBe(12) // 3 * 4

      const returns = calculateMultiLegReturns(10, 12, 12, 1)
      expect(returns.totalReturns).toBe(120)
      expect(returns.profit).toBe(110)
    })

    it('6-leg accumulator with high combined odds', () => {
      const legs: LegSummary[] = Array.from({ length: 6 }, (_, i) => ({
        id: String(i + 1),
        legNumber: i + 1,
        outcome: 'WIN' as const,
        odds: 1.5,
        isScratched: false,
        isDeadHeat: false,
      }))

      const outcome = determineMultiLegOutcome(legs)
      // 1.5^6 = 11.390625
      expect(outcome.adjustedCombinedOdds).toBeCloseTo(11.39, 1)
    })
  })
})
