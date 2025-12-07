import type { RaceOutcome, RaceResultData, TrackedRaceEntry, BetSide } from '../types'

/**
 * Determine outcome by comparing user selection with API result
 * Primary validation: selection number (hard to mess up)
 * Secondary validation: selection name (as confirmation)
 */
export function determineOutcome(
  selectionName: string,
  selectionNumber: number,
  result: RaceResultData
): RaceOutcome {
  // Check if horse was scratched first
  if (result.scratched.includes(selectionNumber)) {
    return 'Scratched'
  }

  // Check for dead heat (if our selection was part of dead heat)
  if (result.deadHeat && result.winnerNumber === selectionNumber) {
    return 'Dead Heat'
  }

  // Primary check: Compare selection NUMBER with winner number
  // This is the most reliable as numbers are hard to mess up
  const numberMatches = result.winnerNumber === selectionNumber

  if (numberMatches) {
    // Double-check with name if provided (optional confirmation)
    if (selectionName) {
      const nameMatches = normalizeHorseName(result.winnerName) === normalizeHorseName(selectionName)
      if (!nameMatches) {
        console.warn(
          `[Outcome] Number matches (#${selectionNumber}) but name differs: "${selectionName}" vs "${result.winnerName}". Using number as primary.`
        )
      }
    }
    return '1/W'
  }

  return '2/L'
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
 */
export function calculateProfitLoss(entry: TrackedRaceEntry): number {
  const { backBet, layBet, outcome } = entry

  // Validate bet data
  if (!backBet.stake || !backBet.odds || !layBet.stake || !layBet.odds) {
    return 0
  }

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
