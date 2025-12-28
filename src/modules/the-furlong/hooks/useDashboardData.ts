/**
 * The Furlong - Dashboard Data Hook
 * Aggregates tracker data and bonus data for financial dashboard
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import isoWeek from 'dayjs/plugin/isoWeek'
import type {
  TimePeriod,
  DashboardMetrics,
  PeriodData,
  DateRange,
  DashboardData,
} from '../types'
import { createDefaultMetrics } from '../types'
import type { TrackedRaceEntry, DailyTrackerData } from '../types'
import { getTrackerData, getDatesWithTrackerData, getArchivedTrackerDays } from '../utils/trackerStorage'
import { calculateProfitLoss } from '../utils/outcomeLogic'
import { getAllBonuses } from '../../the-stable/utils/bonusStorage'
import type { Bonus } from '../../the-stable/types'

// Extend dayjs with plugins
dayjs.extend(quarterOfYear)
dayjs.extend(isoWeek)

/**
 * Get date range for a time period
 */
function getDateRangeForPeriod(period: TimePeriod): DateRange {
  const now = dayjs()

  switch (period) {
    case 'week':
      return {
        start: now.startOf('isoWeek').format('YYYY-MM-DD'),
        end: now.endOf('isoWeek').format('YYYY-MM-DD'),
      }
    case 'month':
      return {
        start: now.startOf('month').format('YYYY-MM-DD'),
        end: now.endOf('month').format('YYYY-MM-DD'),
      }
    case 'quarter':
      return {
        start: now.startOf('quarter').format('YYYY-MM-DD'),
        end: now.endOf('quarter').format('YYYY-MM-DD'),
      }
    case 'year':
      return {
        start: now.startOf('year').format('YYYY-MM-DD'),
        end: now.endOf('year').format('YYYY-MM-DD'),
      }
    case 'all':
      // Very wide range to capture all data
      return {
        start: '2020-01-01',
        end: '2099-12-31',
      }
  }
}

/**
 * Check if a date is within a range
 */
function isDateInRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end
}

/**
 * Get all tracker entries within a date range
 */
function getEntriesInRange(range: DateRange): TrackedRaceEntry[] {
  const entries: TrackedRaceEntry[] = []

  // Get active tracker dates
  const activeDates = getDatesWithTrackerData()
  for (const date of activeDates) {
    if (isDateInRange(date, range)) {
      const data = getTrackerData(date)
      if (data) {
        entries.push(...data.entries)
      }
    }
  }

  // Get archived tracker data
  const archives = getArchivedTrackerDays()
  for (const archive of archives) {
    if (isDateInRange(archive.date, range)) {
      entries.push(...archive.data.entries)
    }
  }

  return entries
}

/**
 * Get bonuses earned within a date range
 */
function getBonusesInRange(range: DateRange): Bonus[] {
  const allBonuses = getAllBonuses()
  return allBonuses.filter((bonus) => isDateInRange(bonus.dateEarned, range))
}

/**
 * Calculate metrics from entries and bonuses
 */
function calculateMetrics(entries: TrackedRaceEntry[], bonuses: Bonus[]): DashboardMetrics {
  const metrics = createDefaultMetrics()

  // Filter completed entries (not pending or scratched)
  const completed = entries.filter(
    (e) => e.outcome !== 'Pending' && e.outcome !== 'Scratched'
  )

  // Calculate profit metrics (recalculate P&L to ensure latest logic is used)
  for (const entry of completed) {
    // Recalculate P&L on the fly instead of using stored value
    const pnl = calculateProfitLoss(entry)
    if (pnl > 0) {
      metrics.grossProfit += pnl
    }
    metrics.netProfit += pnl
  }

  // Calculate total outlay from all entries (back bet stakes)
  for (const entry of entries) {
    metrics.totalOutlay += entry.backBet?.stake || 0
  }

  // Calculate outcome counts
  for (const entry of entries) {
    switch (entry.outcome) {
      case '1/W':
        metrics.wins++
        break
      case '2/L':
        metrics.losses++
        break
      case 'Pending':
        metrics.pending++
        break
      case 'Refund':
        metrics.refunds++
        break
      case 'Dead Heat':
        metrics.deadHeats++
        break
      case 'Middle':
        metrics.middles++
        break
      case 'Scratched':
        metrics.scratched++
        break
    }
  }

  // Calculate total races (completed only)
  metrics.totalRaces = completed.length

  // Calculate win rate
  if (completed.length > 0) {
    metrics.winRate = (metrics.wins / completed.length) * 100
  }

  // Calculate bonus metrics
  metrics.bonusCount = bonuses.length
  metrics.bonusesEarned = bonuses.reduce((sum, b) => sum + b.amount, 0)

  // Bonus turnover profit from turned over bonuses
  const turnedOver = bonuses.filter((b) => b.status === 'turned_over')
  metrics.bonusTurnoverProfit = turnedOver.reduce(
    (sum, b) => sum + (b.bonusTurnoverProfit || 0),
    0
  )

  return metrics
}

/**
 * Generate chart data based on time period
 */
function generateChartData(
  entries: TrackedRaceEntry[],
  period: TimePeriod,
  range: DateRange
): PeriodData[] {
  const data: PeriodData[] = []

  switch (period) {
    case 'week': {
      // Daily breakdown for week
      let current = dayjs(range.start)
      const end = dayjs(range.end)

      while (current.isBefore(end) || current.isSame(end, 'day')) {
        const dateStr = current.format('YYYY-MM-DD')
        const dayEntries = entries.filter((e) => e.date === dateStr)
        const completed = dayEntries.filter(
          (e) => e.outcome !== 'Pending' && e.outcome !== 'Scratched'
        )

        data.push({
          label: current.format('ddd'),
          profit: completed.reduce((sum, e) => sum + calculateProfitLoss(e), 0),
          outlay: dayEntries.reduce((sum, e) => sum + (e.backBet?.stake || 0), 0),
          races: completed.length,
          startDate: dateStr,
          endDate: dateStr,
        })

        current = current.add(1, 'day')
      }
      break
    }

    case 'month': {
      // Weekly breakdown for month
      let weekStart = dayjs(range.start).startOf('isoWeek')
      const monthEnd = dayjs(range.end)
      let weekNum = 1

      while (weekStart.isBefore(monthEnd) || weekStart.isSame(monthEnd, 'day')) {
        const weekEnd = weekStart.endOf('isoWeek')
        const startStr = weekStart.format('YYYY-MM-DD')
        const endStr = weekEnd.format('YYYY-MM-DD')

        const weekEntries = entries.filter(
          (e) => e.date >= startStr && e.date <= endStr
        )
        const completed = weekEntries.filter(
          (e) => e.outcome !== 'Pending' && e.outcome !== 'Scratched'
        )

        // Only include weeks that overlap with the month
        if (weekEnd.format('YYYY-MM-DD') >= range.start) {
          data.push({
            label: `W${weekNum}`,
            profit: completed.reduce((sum, e) => sum + calculateProfitLoss(e), 0),
            outlay: weekEntries.reduce((sum, e) => sum + (e.backBet?.stake || 0), 0),
            races: completed.length,
            startDate: startStr,
            endDate: endStr,
          })
        }

        weekStart = weekStart.add(1, 'week')
        weekNum++

        // Stop if we've passed the month end
        if (weekStart.isAfter(monthEnd)) break
      }
      break
    }

    case 'quarter': {
      // Monthly breakdown for quarter
      let monthStart = dayjs(range.start)
      const quarterEnd = dayjs(range.end)

      while (monthStart.isBefore(quarterEnd) || monthStart.isSame(quarterEnd, 'month')) {
        const monthEnd = monthStart.endOf('month')
        const startStr = monthStart.format('YYYY-MM-DD')
        const endStr = monthEnd.format('YYYY-MM-DD')

        const monthEntries = entries.filter(
          (e) => e.date >= startStr && e.date <= endStr
        )
        const completed = monthEntries.filter(
          (e) => e.outcome !== 'Pending' && e.outcome !== 'Scratched'
        )

        data.push({
          label: monthStart.format('MMM'),
          profit: completed.reduce((sum, e) => sum + calculateProfitLoss(e), 0),
          outlay: monthEntries.reduce((sum, e) => sum + (e.backBet?.stake || 0), 0),
          races: completed.length,
          startDate: startStr,
          endDate: endStr,
        })

        monthStart = monthStart.add(1, 'month').startOf('month')
      }
      break
    }

    case 'year': {
      // Monthly breakdown for year
      let monthStart = dayjs(range.start)
      const yearEnd = dayjs(range.end)

      while (monthStart.isBefore(yearEnd) || monthStart.isSame(yearEnd, 'month')) {
        const monthEnd = monthStart.endOf('month')
        const startStr = monthStart.format('YYYY-MM-DD')
        const endStr = monthEnd.format('YYYY-MM-DD')

        const monthEntries = entries.filter(
          (e) => e.date >= startStr && e.date <= endStr
        )
        const completed = monthEntries.filter(
          (e) => e.outcome !== 'Pending' && e.outcome !== 'Scratched'
        )

        data.push({
          label: monthStart.format('MMM'),
          profit: completed.reduce((sum, e) => sum + calculateProfitLoss(e), 0),
          outlay: monthEntries.reduce((sum, e) => sum + (e.backBet?.stake || 0), 0),
          races: completed.length,
          startDate: startStr,
          endDate: endStr,
        })

        monthStart = monthStart.add(1, 'month').startOf('month')
      }
      break
    }

    case 'all': {
      // Monthly breakdown for all time - only include months with data
      if (entries.length === 0) break

      // Find the date range from actual entries
      const sortedDates = entries.map((e) => e.date).sort()
      const firstDate = dayjs(sortedDates[0]).startOf('month')
      const lastDate = dayjs(sortedDates[sortedDates.length - 1]).endOf('month')

      let monthStart = firstDate

      while (monthStart.isBefore(lastDate) || monthStart.isSame(lastDate, 'month')) {
        const monthEnd = monthStart.endOf('month')
        const startStr = monthStart.format('YYYY-MM-DD')
        const endStr = monthEnd.format('YYYY-MM-DD')

        const monthEntries = entries.filter(
          (e) => e.date >= startStr && e.date <= endStr
        )

        // Only include months that have entries
        if (monthEntries.length > 0) {
          const completed = monthEntries.filter(
            (e) => e.outcome !== 'Pending' && e.outcome !== 'Scratched'
          )

          data.push({
            label: monthStart.format("MMM 'YY"),
            profit: completed.reduce((sum, e) => sum + calculateProfitLoss(e), 0),
            outlay: monthEntries.reduce((sum, e) => sum + (e.backBet?.stake || 0), 0),
            races: completed.length,
            startDate: startStr,
            endDate: endStr,
          })
        }

        monthStart = monthStart.add(1, 'month').startOf('month')
      }
      break
    }
  }

  return data
}

/**
 * Hook to fetch and aggregate dashboard data
 */
export function useDashboardData(period: TimePeriod): DashboardData {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculate date range
  const dateRange = useMemo(() => getDateRangeForPeriod(period), [period])

  // Fetch data
  const [entries, setEntries] = useState<TrackedRaceEntry[]>([])
  const [bonuses, setBonuses] = useState<Bonus[]>([])

  useEffect(() => {
    setLoading(true)
    setError(null)

    try {
      const trackerEntries = getEntriesInRange(dateRange)
      const bonusData = getBonusesInRange(dateRange)

      setEntries(trackerEntries)
      setBonuses(bonusData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  // Calculate metrics
  const metrics = useMemo(
    () => calculateMetrics(entries, bonuses),
    [entries, bonuses]
  )

  // Generate chart data
  const chartData = useMemo(
    () => generateChartData(entries, period, dateRange),
    [entries, period, dateRange]
  )

  return {
    metrics,
    chartData,
    dateRange,
    loading,
    error,
  }
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  const isNegative = value < 0
  const absValue = Math.abs(value)
  const formatted = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absValue)

  return isNegative ? `-${formatted}` : formatted
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}
