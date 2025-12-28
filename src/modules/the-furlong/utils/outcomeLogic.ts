import type { RaceOutcome, RaceResultData, TrackedRaceEntry, BetSide, PromoType } from '../types'
import { PROMO_TYPE_CONFIG } from '../types'

/**
 * Get the placement position of a selection in the race result
 */
function getSelectionPlacement(
  selectionNumber: number,
  result: RaceResultData
): { position: number | null; deadHeat: boolean } {
  if (result.places.first?.number === selectionNumber) {
    return { position: 1, deadHeat: result.places.first.deadHeat || false }
  }
  if (result.places.second?.number === selectionNumber) {
    return { position: 2, deadHeat: result.places.second.deadHeat || false }
  }
  if (result.places.third?.number === selectionNumber) {
    return { position: 3, deadHeat: result.places.third.deadHeat || false }
  }
  return { position: null, deadHeat: false }
}

/**
 * Determine outcome by comparing user selection with API result
 * Primary validation: selection number (hard to mess up)
 * Secondary validation: selection name (as confirmation)
 * Promo-aware: checks 2nd/3rd place for bonus eligibility based on promo type
 */
export function determineOutcome(
  selectionName: string,
  selectionNumber: number,
  result: RaceResultData,
  promoType: PromoType = 'none'
): RaceOutcome {
  // Check if horse was scratched first
  if (result.scratched.includes(selectionNumber)) {
    return 'Scratched'
  }

  // Get placement using the new places structure
  const placement = getSelectionPlacement(selectionNumber, result)

  // Check for dead heat at selection's position
  if (placement.position && placement.deadHeat) {
    return 'Dead Heat'
  }

  // 1st place is always a win
  if (placement.position === 1) {
    // Double-check with name if provided (optional confirmation)
    if (selectionName && result.places.first) {
      const nameMatches =
        normalizeHorseName(result.places.first.name) === normalizeHorseName(selectionName)
      if (!nameMatches) {
        console.warn(
          `[Outcome] Number matches (#${selectionNumber}) but name differs: "${selectionName}" vs "${result.places.first.name}". Using number as primary.`
        )
      }
    }
    return '1/W'
  }

  // Check if placement qualifies for bonus based on promo type
  const config = PROMO_TYPE_CONFIG[promoType]
  if (placement.position && config.bonusPlaces.includes(placement.position)) {
    console.log(
      `[Outcome] Selection #${selectionNumber} finished ${placement.position}${getOrdinalSuffix(placement.position)} - qualifies for bonus (promo: ${promoType})`
    )
    return 'Bonus'
  }

  return '2/L'
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

/**
 * Normalize horse name for comparison (lowercase, trim, remove common variations)
 */
function normalizeHorseName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['']/g, "'") // normalize apostrophes
    .replace(/\s+/g, ' ') // normalize spaces
}

/**
 * Calculate profit/loss for a tracked entry based on outcome
 * Supports both matched betting (with lay) and back-only betting
 */
export function calculateProfitLoss(entry: TrackedRaceEntry): number {
  const { backBet, layBet, outcome } = entry

  // Validate back bet data is present
  if (!backBet.stake || !backBet.odds) {
    return 0
  }

  // Check if this is a back-only bet (no lay data)
  const hasLayBet = layBet.stake && layBet.odds

  if (!hasLayBet) {
    // Back-only calculation (no lay bet)
    return calculateBackOnlyPL(backBet, outcome)
  }

  // Matched betting calculation (has both back and lay)
  switch (outcome) {
    case '1/W':
      return calculateWinPL(backBet, layBet)

    case '2/L':
      return calculateLossPL(backBet, layBet)

    case 'Dead Heat':
      return calculateDeadHeatPL(backBet, layBet)

    case 'Bonus':
      // Back loses but qualifies for bonus bet
      // Lay wins (collect lay stake minus commission)
      return calculateBonusPL(backBet, layBet)

    case 'Refund':
      // Back refunded, only lose exchange commission if lay matched
      return calculateRefundPL(layBet)

    case 'Middle':
      // Both back and lay win (rare but possible in dutch betting)
      return calculateMiddlePL(backBet, layBet)

    case 'Scratched':
      // Bets voided, may have small exchange costs
      return calculateScratchedPL(layBet)

    case 'Pending':
    default:
      return 0
  }
}

/**
 * Back-only profit/loss calculation (no lay bet)
 * Used for arb betting, promo betting without laying, etc.
 */
function calculateBackOnlyPL(backBet: BetSide, outcome: RaceOutcome): number {
  switch (outcome) {
    case '1/W':
      // Win: profit = stake × (odds - 1)
      return backBet.stake * (backBet.odds - 1)

    case '2/L':
      // Loss: lose the stake
      return -backBet.stake

    case 'Dead Heat':
      // Dead heat: half win
      return (backBet.stake * (backBet.odds - 1)) / 2

    case 'Bonus':
      // Lose stake but get bonus (bonus tracked separately)
      return -backBet.stake

    case 'Refund':
    case 'Scratched':
      // Stake returned
      return 0

    case 'Pending':
    default:
      return 0
  }
}

/**
 * Back wins scenario:
 * - Back profit = stake * (odds - 1)
 * - Lay loss = liability = lay_stake * (lay_odds - 1)
 * - Exchange commission on lay liability if applicable
 */
function calculateWinPL(backBet: BetSide, layBet: BetSide): number {
  const backProfit = backBet.stake * (backBet.odds - 1)
  const layLiability = layBet.stake * (layBet.odds - 1)

  // No commission on liability when you lose the lay
  return backProfit - layLiability
}

/**
 * Back loses scenario:
 * - Back loss = stake
 * - Lay win = lay stake (minus commission)
 */
function calculateLossPL(backBet: BetSide, layBet: BetSide): number {
  const backLoss = backBet.stake
  const layProfit = layBet.stake
  const commission = layProfit * ((layBet.commissionPercent || 0) / 100)

  return -backLoss + layProfit - commission
}

/**
 * Dead heat scenario:
 * - Back pays half profit
 * - Lay pays half liability
 */
function calculateDeadHeatPL(backBet: BetSide, layBet: BetSide): number {
  const backProfit = (backBet.stake * (backBet.odds - 1)) / 2
  const layLiability = (layBet.stake * (layBet.odds - 1)) / 2

  // Dead heat on back means half win
  // Dead heat on lay means half liability
  return backProfit - layLiability
}

/**
 * Bonus scenario:
 * - Back loses stake but qualifies for bonus bet (tracked separately)
 * - Lay wins stake minus commission
 */
function calculateBonusPL(backBet: BetSide, layBet: BetSide): number {
  const backLoss = backBet.stake
  const layProfit = layBet.stake
  const commission = layProfit * ((layBet.commissionPercent || 0) / 100)

  // The bonus bet value is not included here - tracked separately
  return -backLoss + layProfit - commission
}

/**
 * Refund scenario (Thankyou Neds or promo refund):
 * - Back refunded (no loss)
 * - Lay may still be active - if horse won, you owe liability
 * - If horse lost, you keep lay stake minus commission
 * For simplicity, assume the common case: horse didn't win but qualifies for refund
 */
function calculateRefundPL(layBet: BetSide): number {
  // Typically in refund scenarios, the lay has been settled
  // Assume lay won (horse didn't win), so you keep stake minus commission
  const layProfit = layBet.stake
  const commission = layProfit * ((layBet.commissionPercent || 0) / 100)

  return layProfit - commission
}

/**
 * Middle scenario:
 * - Both bets win (very rare, usually in specific dutch scenarios)
 */
function calculateMiddlePL(backBet: BetSide, layBet: BetSide): number {
  const backProfit = backBet.stake * (backBet.odds - 1)
  const layProfit = layBet.stake
  const commission = layProfit * ((layBet.commissionPercent || 0) / 100)

  return backProfit + layProfit - commission
}

/**
 * Scratched scenario:
 * - Bets voided, stakes returned
 * - May have small exchange fees if lay was partially matched
 */
function calculateScratchedPL(layBet: BetSide): number {
  // Assume minimal loss from exchange processing
  return 0
}

/**
 * Calculate the liability for a lay bet
 */
export function calculateLayLiability(stake: number, odds: number): number {
  return stake * (odds - 1)
}

/**
 * Calculate potential profit for a back bet
 */
export function calculateBackProfit(stake: number, odds: number): number {
  return stake * (odds - 1)
}

/**
 * Calculate the qualifying loss for a matched bet
 * (The loss you accept to unlock a bonus/promo)
 */
export function calculateQualifyingLoss(
  backStake: number,
  backOdds: number,
  layStake: number,
  layOdds: number,
  commissionPercent: number
): number {
  // If back wins: back profit - lay liability
  const backWinPL = backStake * (backOdds - 1) - layStake * (layOdds - 1)

  // If back loses: -back stake + lay profit - commission
  const backLosePL = -backStake + layStake * (1 - commissionPercent / 100)

  // Qualifying loss is the average expected loss
  // Simplified: just return the back loss scenario as that's the qualifying loss
  return backLosePL
}

/**
 * Calculate optimal lay stake to minimize qualifying loss
 * Based on matched betting formula: lay_stake = (back_stake * back_odds) / (lay_odds - commission_rate)
 */
export function calculateOptimalLayStake(
  backStake: number,
  backOdds: number,
  layOdds: number,
  commissionPercent: number
): number {
  const effectiveLayOdds = layOdds - commissionPercent / 100
  return (backStake * backOdds) / effectiveLayOdds
}
