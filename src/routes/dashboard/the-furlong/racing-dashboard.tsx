'use client'

import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material'
import type { TimePeriod } from '@/modules/the-furlong/types'
import { TIME_PERIOD_CONFIG } from '@/modules/the-furlong/types'
import { useDashboardData, formatCurrency } from '@/modules/the-furlong/hooks'
import {
  TimePeriodSelector,
  ProfitChart,
  DashboardSummary,
} from '@/modules/the-furlong/components'

export const Route = createFileRoute('/dashboard/the-furlong/racing-dashboard')({
  component: RacingDashboard,
})

function RacingDashboard() {
  const [period, setPeriod] = useState<TimePeriod>('month')
  const { metrics, chartData, loading } = useDashboardData(period)

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
            Racing Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
            {TIME_PERIOD_CONFIG[period].label} performance overview
          </Typography>
        </Box>

        <TimePeriodSelector value={period} onChange={setPeriod} />
      </Box>

      {/* Net Profit Summary */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="caption"
          sx={{
            color: '#6b7280',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Net Profit
        </Typography>
        <Typography
          variant={isMobile ? 'h4' : 'h3'}
          sx={{
            fontWeight: 700,
            color: metrics.netProfit >= 0 ? '#2e7d32' : '#c62828',
            lineHeight: 1.2,
          }}
        >
          {formatCurrency(metrics.netProfit)}
        </Typography>
      </Box>

      {/* Chart */}
      <Box sx={{ mb: 3 }}>
        <ProfitChart data={chartData} loading={loading} period={period} />
      </Box>

      {/* Metrics Cards */}
      <DashboardSummary metrics={metrics} loading={loading} />
    </Box>
  )
}
