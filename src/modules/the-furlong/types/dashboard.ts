/**
 * The Furlong - Dashboard Types
 * Types for financial metrics and KPI tracking
 */

/**
 * Time period options for dashboard filtering
 */
export type TimePeriod = 'week' | 'month' | 'quarter' | 'year'

/**
 * Configuration for time period display
 */
export const TIME_PERIOD_CONFIG: Record<TimePeriod, { label: string; shortLabel: string }> = {
  week: { label: 'This Week', shortLabel: 'Week' },
  month: { label: 'This Month', shortLabel: 'Month' },
  quarter: { label: 'This Quarter', shortLabel: 'Quarter' },
  year: { label: 'This Year', shortLabel: 'Year' },
}

/**
 * Aggregated metrics for the dashboard
 */
export interface DashboardMetrics {
  // Profit metrics
  grossProfit: number         // Sum of P&L where P&L > 0
  netProfit: number           // Sum of all P&L values
  totalOutlay: number         // Sum of all back bet stakes

  // Bonus metrics (from The Stable)
  bonusesEarned: number       // Sum of bonus amounts earned in period
  bonusTurnoverProfit: number // Sum of bonusTurnoverProfit for turned_over bonuses
  bonusCount: number          // Number of bonuses earned

  // Performance metrics
  winRate: number             // (Wins / Total completed) * 100
  totalRaces: number          // Count of completed entries in period
  wins: number                // Count of 1/W outcomes
  losses: number              // Count of 2/L outcomes
  pending: number             // Count of pending races

  // Additional breakdown
  refunds: number             // Count of refund outcomes
  deadHeats: number           // Count of dead heat outcomes
  middles: number             // Count of middle outcomes
  scratched: number           // Count of scratched outcomes
}

/**
 * Data point for chart visualization
 */
export interface PeriodData {
  label: string       // Display label (e.g., "Dec", "Week 1", "Q4")
  profit: number      // Net P&L for period
  outlay: number      // Total stakes for period
  races: number       // Number of races
  startDate: string   // Period start (YYYY-MM-DD)
  endDate: string     // Period end (YYYY-MM-DD)
}

/**
 * Date range for filtering
 */
export interface DateRange {
  start: string       // YYYY-MM-DD
  end: string         // YYYY-MM-DD
}

/**
 * Dashboard data returned by the hook
 */
export interface DashboardData {
  metrics: DashboardMetrics
  chartData: PeriodData[]
  dateRange: DateRange
  loading: boolean
  error: string | null
}

/**
 * Create default empty metrics
 */
export function createDefaultMetrics(): DashboardMetrics {
  return {
    grossProfit: 0,
    netProfit: 0,
    totalOutlay: 0,
    bonusesEarned: 0,
    bonusTurnoverProfit: 0,
    bonusCount: 0,
    winRate: 0,
    totalRaces: 0,
    wins: 0,
    losses: 0,
    pending: 0,
    refunds: 0,
    deadHeats: 0,
    middles: 0,
    scratched: 0,
  }
}
