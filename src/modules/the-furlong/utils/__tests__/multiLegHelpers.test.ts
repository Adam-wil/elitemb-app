/**
 * Multi-leg Bet Helper Functions Tests
 *
 * Test cases for multi-leg detection and utility functions.
 *
 * @see src/modules/the-furlong/utils/multiLegHelpers.ts
 */

import { describe, it, expect } from 'vitest'
import {
  isMultiLegParent,
  isMultiLegChild,
  isSingleBet,
  shouldCreateJournalEntry,
  calculateCombinedOdds,
  recalculateCombinedOdds,
} from '../multiLegHelpers'

// ============================================================================
// Detection Functions
// ============================================================================

describe('isMultiLegParent', () => {
  it('returns true for parent entry (isMultiLeg=true, parentBetId=null)', () => {
    const parent = { isMultiLeg: true, parentBetId: null }
    expect(isMultiLegParent(parent)).toBe(true)
  })

  it('returns false for child entry (has parentBetId)', () => {
    const child = { isMultiLeg: false, parentBetId: 'parent-123' }
    expect(isMultiLegParent(child)).toBe(false)
  })

  it('returns false for single bet (isMultiLeg=false, parentBetId=null)', () => {
    const single = { isMultiLeg: false, parentBetId: null }
    expect(isMultiLegParent(single)).toBe(false)
  })

  it('returns false for child with isMultiLeg=true but has parentBetId', () => {
    // Edge case: child marked as multi-leg but has parent reference
    const childWithFlag = { isMultiLeg: true, parentBetId: 'parent-123' }
    expect(isMultiLegParent(childWithFlag)).toBe(false)
  })
})

describe('isMultiLegChild', () => {
  it('returns true for child entry (has parentBetId)', () => {
    const child = { isMultiLeg: false, parentBetId: 'parent-123' }
    expect(isMultiLegChild(child)).toBe(true)
  })

  it('returns false for parent entry (parentBetId=null)', () => {
    const parent = { isMultiLeg: true, parentBetId: null }
    expect(isMultiLegChild(parent)).toBe(false)
  })

  it('returns false for single bet (parentBetId=null)', () => {
    const single = { isMultiLeg: false, parentBetId: null }
    expect(isMultiLegChild(single)).toBe(false)
  })
})

describe('isSingleBet', () => {
  it('returns true for single bet (isMultiLeg=false, parentBetId=null)', () => {
    const single = { isMultiLeg: false, parentBetId: null }
    expect(isSingleBet(single)).toBe(true)
  })

  it('returns false for multi-leg parent', () => {
    const parent = { isMultiLeg: true, parentBetId: null }
    expect(isSingleBet(parent)).toBe(false)
  })

  it('returns false for multi-leg child', () => {
    const child = { isMultiLeg: false, parentBetId: 'parent-123' }
    expect(isSingleBet(child)).toBe(false)
  })
})

describe('shouldCreateJournalEntry', () => {
  it('returns true for single bet', () => {
    const single = { isMultiLeg: false, parentBetId: null }
    expect(shouldCreateJournalEntry(single)).toBe(true)
  })

  it('returns true for multi-leg parent', () => {
    const parent = { isMultiLeg: true, parentBetId: null }
    expect(shouldCreateJournalEntry(parent)).toBe(true)
  })

  it('returns false for multi-leg child', () => {
    const child = { isMultiLeg: false, parentBetId: 'parent-123' }
    expect(shouldCreateJournalEntry(child)).toBe(false)
  })

  it('returns false for child even with isMultiLeg=true', () => {
    const childWithFlag = { isMultiLeg: true, parentBetId: 'parent-123' }
    expect(shouldCreateJournalEntry(childWithFlag)).toBe(false)
  })
})

// ============================================================================
// Calculation Functions
// ============================================================================

describe('calculateCombinedOdds', () => {
  it('calculates product of all leg odds', () => {
    const legs = [{ backOdds: 2.5 }, { backOdds: 2.0 }, { backOdds: 2.5 }]
    expect(calculateCombinedOdds(legs)).toBe(12.5) // 2.5 * 2.0 * 2.5
  })

  it('returns 1 for empty legs array', () => {
    expect(calculateCombinedOdds([])).toBe(1)
  })

  it('returns same odds for single leg', () => {
    const legs = [{ backOdds: 3.5 }]
    expect(calculateCombinedOdds(legs)).toBe(3.5)
  })

  it('handles decimal odds correctly', () => {
    const legs = [{ backOdds: 1.5 }, { backOdds: 1.8 }]
    expect(calculateCombinedOdds(legs)).toBeCloseTo(2.7, 2) // 1.5 * 1.8
  })

  it('handles many legs', () => {
    const legs = [
      { backOdds: 2.0 },
      { backOdds: 2.0 },
      { backOdds: 2.0 },
      { backOdds: 2.0 },
    ]
    expect(calculateCombinedOdds(legs)).toBe(16) // 2^4
  })

  it('handles high odds correctly', () => {
    const legs = [{ backOdds: 10.0 }, { backOdds: 5.0 }]
    expect(calculateCombinedOdds(legs)).toBe(50) // 10 * 5
  })
})

describe('recalculateCombinedOdds', () => {
  it('excludes scratched legs from calculation', () => {
    const legs = [
      { backOdds: 2.5, outcome: 'WIN' as const },
      { backOdds: 2.0, outcome: 'SCRATCHED' as const },
      { backOdds: 2.5, outcome: 'WIN' as const },
    ]
    // Only 2.5 and 2.5 (scratched excluded)
    expect(recalculateCombinedOdds(legs)).toBe(6.25) // 2.5 * 2.5
  })

  it('includes all non-scratched outcomes', () => {
    const legs = [
      { backOdds: 2.0, outcome: 'WIN' as const },
      { backOdds: 3.0, outcome: 'PENDING' as const },
      { backOdds: 1.5, outcome: 'LOSS' as const },
    ]
    // All included (none scratched)
    expect(recalculateCombinedOdds(legs)).toBe(9) // 2 * 3 * 1.5
  })

  it('returns 1 if all legs scratched', () => {
    const legs = [
      { backOdds: 2.0, outcome: 'SCRATCHED' as const },
      { backOdds: 3.0, outcome: 'SCRATCHED' as const },
    ]
    expect(recalculateCombinedOdds(legs)).toBe(1)
  })

  it('handles single remaining leg after scratches', () => {
    const legs = [
      { backOdds: 2.5, outcome: 'WIN' as const },
      { backOdds: 2.0, outcome: 'SCRATCHED' as const },
      { backOdds: 3.0, outcome: 'SCRATCHED' as const },
    ]
    expect(recalculateCombinedOdds(legs)).toBe(2.5)
  })
})

// ============================================================================
// Integration Scenarios
// ============================================================================

describe('Multi-leg bet scenarios', () => {
  describe('3-leg accumulator', () => {
    it('parent creates journal, children do not', () => {
      const parent = { isMultiLeg: true, parentBetId: null }
      const leg1 = { isMultiLeg: false, parentBetId: 'parent-id' }
      const leg2 = { isMultiLeg: false, parentBetId: 'parent-id' }
      const leg3 = { isMultiLeg: false, parentBetId: 'parent-id' }

      expect(shouldCreateJournalEntry(parent)).toBe(true)
      expect(shouldCreateJournalEntry(leg1)).toBe(false)
      expect(shouldCreateJournalEntry(leg2)).toBe(false)
      expect(shouldCreateJournalEntry(leg3)).toBe(false)
    })

    it('calculates combined odds correctly', () => {
      const legs = [
        { backOdds: 2.5 }, // Randwick R3
        { backOdds: 2.0 }, // Flemington R5
        { backOdds: 2.5 }, // Caulfield R7
      ]
      const combinedOdds = calculateCombinedOdds(legs)
      expect(combinedOdds).toBe(12.5)

      // Potential return: $10 stake * 12.5 = $125
      const stake = 10
      const potentialReturn = stake * combinedOdds
      expect(potentialReturn).toBe(125)
    })
  })

  describe('Multi with scratched leg', () => {
    it('recalculates combined odds excluding scratch', () => {
      const legs = [
        { backOdds: 2.5, outcome: 'WIN' as const },
        { backOdds: 2.0, outcome: 'SCRATCHED' as const }, // Scratched
        { backOdds: 2.5, outcome: 'WIN' as const },
      ]

      const originalOdds = calculateCombinedOdds(legs.map((l) => ({ backOdds: l.backOdds })))
      const adjustedOdds = recalculateCombinedOdds(legs)

      expect(originalOdds).toBe(12.5) // 2.5 * 2.0 * 2.5
      expect(adjustedOdds).toBe(6.25) // 2.5 * 2.5 (scratched excluded)
    })
  })

  describe('Edge cases', () => {
    it('handles 2-leg double', () => {
      const legs = [{ backOdds: 3.0 }, { backOdds: 4.0 }]
      expect(calculateCombinedOdds(legs)).toBe(12) // 3 * 4
    })

    it('handles 6-leg accumulator', () => {
      const legs = [
        { backOdds: 1.5 },
        { backOdds: 1.5 },
        { backOdds: 1.5 },
        { backOdds: 1.5 },
        { backOdds: 1.5 },
        { backOdds: 1.5 },
      ]
      // 1.5^6 = 11.390625
      expect(calculateCombinedOdds(legs)).toBeCloseTo(11.39, 1)
    })
  })
})
