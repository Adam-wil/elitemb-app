'use client'

import { useMemo } from 'react'
import { Box, Typography, Paper, useTheme, useMediaQuery } from '@mui/material'
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import type { PeriodData, TimePeriod } from '../types'
import { formatCurrency } from '../hooks/useDashboardData'

interface ProfitChartProps {
  data: PeriodData[]
  loading?: boolean
  period?: TimePeriod
}

interface CumulativeData extends PeriodData {
  cumulative: number
}

export function ProfitChart({ data, loading, period = 'month' }: ProfitChartProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // Calculate cumulative data for 'all' period
  const cumulativeData = useMemo<CumulativeData[]>(() => {
    if (period !== 'all') return []

    let runningTotal = 0
    return data.map((d) => {
      runningTotal += d.profit
      return {
        ...d,
        cumulative: runningTotal,
      }
    })
  }, [data, period])

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          height: isMobile ? 200 : 280,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #e5e7eb',
          borderRadius: 2,
        }}
      >
        <Typography color="text.secondary">Loading chart...</Typography>
      </Paper>
    )
  }

  if (data.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          height: isMobile ? 200 : 280,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #e5e7eb',
          borderRadius: 2,
        }}
      >
        <Typography color="text.secondary">No data for this period</Typography>
      </Paper>
    )
  }

  // Calculate max absolute value for symmetric Y axis
  const maxAbsProfit = Math.max(...data.map((d) => Math.abs(d.profit)), 0)

  // Dynamic scaling: use nice round numbers
  let yMax: number
  if (maxAbsProfit <= 0) {
    yMax = 1000 // Default range when no data
  } else if (maxAbsProfit <= 500) {
    yMax = Math.ceil(maxAbsProfit / 100) * 100 || 500
  } else if (maxAbsProfit <= 2000) {
    yMax = Math.ceil(maxAbsProfit / 500) * 500
  } else if (maxAbsProfit <= 10000) {
    yMax = Math.ceil(maxAbsProfit / 1000) * 1000
  } else {
    yMax = Math.ceil(maxAbsProfit / 5000) * 5000
  }

  // Add 10% padding
  yMax = Math.round(yMax * 1.1)
  const yAxisDomain = [-yMax, yMax]

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ value: number; payload: PeriodData }>
    label?: string
  }) => {
    if (!active || !payload || !payload.length) return null

    const periodData = payload[0].payload
    const profit = periodData.profit

    return (
      <Paper
        elevation={2}
        sx={{
          p: 1.5,
          border: '1px solid #e5e7eb',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
          {label}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: profit >= 0 ? '#2e7d32' : '#c62828',
            fontWeight: 600,
          }}
        >
          {formatCurrency(profit)}
        </Typography>
        <Typography variant="caption" sx={{ color: '#6b7280' }}>
          {periodData.races} race{periodData.races !== 1 ? 's' : ''}
        </Typography>
      </Paper>
    )
  }

  // Custom tooltip for cumulative chart
  const CumulativeTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ value: number; payload: CumulativeData }>
    label?: string
  }) => {
    if (!active || !payload || !payload.length) return null

    const periodData = payload[0].payload
    const cumulative = periodData.cumulative
    const periodProfit = periodData.profit

    return (
      <Paper
        elevation={2}
        sx={{
          p: 1.5,
          border: '1px solid #e5e7eb',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
          {label}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: cumulative >= 0 ? '#2e7d32' : '#c62828',
            fontWeight: 600,
          }}
        >
          Total: {formatCurrency(cumulative)}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: periodProfit >= 0 ? '#2e7d32' : '#c62828',
            display: 'block',
          }}
        >
          This month: {formatCurrency(periodProfit)}
        </Typography>
        <Typography variant="caption" sx={{ color: '#6b7280' }}>
          {periodData.races} race{periodData.races !== 1 ? 's' : ''}
        </Typography>
      </Paper>
    )
  }

  // Render cumulative area chart for 'all' period
  if (period === 'all' && cumulativeData.length > 0) {
    // Calculate Y axis domain for cumulative data
    const maxCumulative = Math.max(...cumulativeData.map((d) => d.cumulative), 0)
    const minCumulative = Math.min(...cumulativeData.map((d) => d.cumulative), 0)

    // Nice round numbers for Y axis
    let yMax: number
    let yMin: number

    const absMax = Math.max(Math.abs(maxCumulative), Math.abs(minCumulative))
    if (absMax <= 0) {
      yMax = 1000
      yMin = 0
    } else if (absMax <= 500) {
      yMax = Math.ceil(maxCumulative / 100) * 100 || 500
      yMin = Math.floor(minCumulative / 100) * 100
    } else if (absMax <= 2000) {
      yMax = Math.ceil(maxCumulative / 500) * 500
      yMin = Math.floor(minCumulative / 500) * 500
    } else if (absMax <= 10000) {
      yMax = Math.ceil(maxCumulative / 1000) * 1000
      yMin = Math.floor(minCumulative / 1000) * 1000
    } else {
      yMax = Math.ceil(maxCumulative / 5000) * 5000
      yMin = Math.floor(minCumulative / 5000) * 5000
    }

    // Add 10% padding
    yMax = Math.round(yMax * 1.1)
    if (yMin < 0) yMin = Math.round(yMin * 1.1)

    const finalCumulative = cumulativeData[cumulativeData.length - 1]?.cumulative || 0
    const isPositive = finalCumulative >= 0

    return (
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          height: isMobile ? 200 : 280,
          border: '1px solid #e5e7eb',
          borderRadius: 2,
          p: isMobile ? 1.5 : 2,
          pt: isMobile ? 2 : 3,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={cumulativeData}
            margin={{
              top: 10,
              right: isMobile ? 10 : 20,
              left: isMobile ? -20 : 0,
              bottom: 5,
            }}
          >
            <defs>
              <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={isPositive ? '#2e7d32' : '#c62828'}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={isPositive ? '#2e7d32' : '#c62828'}
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: '#6b7280',
                fontSize: isMobile ? 10 : 12,
              }}
            />
            <YAxis
              domain={[yMin, yMax]}
              axisLine={false}
              tickLine={false}
              tick={{
                fill: '#6b7280',
                fontSize: isMobile ? 10 : 12,
              }}
              tickFormatter={(value) => {
                const absValue = Math.abs(Math.round(value))
                if (absValue >= 1000) {
                  return `${value < 0 ? '-' : ''}$${(absValue / 1000).toFixed(0)}k`
                }
                return `${value < 0 ? '-' : ''}$${absValue}`
              }}
              width={isMobile ? 50 : 65}
            />
            <Tooltip content={<CumulativeTooltip />} />
            <ReferenceLine
              y={0}
              stroke="#9ca3af"
              strokeWidth={1}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke={isPositive ? '#2e7d32' : '#c62828'}
              strokeWidth={2}
              fill="url(#cumulativeGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Paper>
    )
  }

  // Default bar chart for other periods
  return (
    <Paper
      elevation={0}
      sx={{
        width: '100%',
        height: isMobile ? 200 : 280,
        border: '1px solid #e5e7eb',
        borderRadius: 2,
        p: isMobile ? 1.5 : 2,
        pt: isMobile ? 2 : 3,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 10,
            right: isMobile ? 10 : 20,
            left: isMobile ? -20 : 0,
            bottom: 5,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{
              fill: '#6b7280',
              fontSize: isMobile ? 10 : 12,
            }}
          />
          <YAxis
            domain={yAxisDomain}
            axisLine={false}
            tickLine={false}
            tick={{
              fill: '#6b7280',
              fontSize: isMobile ? 10 : 12,
            }}
            tickFormatter={(value) => {
              const absValue = Math.abs(Math.round(value))
              if (absValue >= 1000) {
                return `$${(absValue / 1000).toFixed(0)}k`
              }
              return `$${absValue}`
            }}
            width={isMobile ? 50 : 65}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={0}
            stroke="#9ca3af"
            strokeWidth={1}
          />
          <Bar
            dataKey="profit"
            radius={[4, 4, 0, 0]}
            maxBarSize={isMobile ? 30 : 50}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.profit >= 0 ? '#2e7d32' : '#c62828'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  )
}
