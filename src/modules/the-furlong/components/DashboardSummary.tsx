'use client'

import { Box, Grid, useTheme, useMediaQuery } from '@mui/material'
import {
  TrendingUp,
  DollarSign,
  Gift,
  CreditCard,
  Target,
  Trophy,
} from 'lucide-react'
import { MetricCard } from './MetricCard'
import type { DashboardMetrics } from '../types'
import { formatCurrency, formatPercentage } from '../hooks/useDashboardData'

interface DashboardSummaryProps {
  metrics: DashboardMetrics
  loading?: boolean
}

export function DashboardSummary({ metrics, loading }: DashboardSummaryProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  if (loading) {
    return (
      <Box sx={{ opacity: 0.5 }}>
        <Grid container spacing={isMobile ? 1 : 2}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid size={{ xs: 6, sm: 4, md: 4 }} key={i}>
              <Box
                sx={{
                  height: isMobile ? 80 : 100,
                  backgroundColor: '#f9fafb',
                  borderRadius: 2,
                  border: '1px solid #e5e7eb',
                }}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  // Use neutral gray for icons, only color the profit/loss values
  const cards = [
    {
      title: 'Gross Profit',
      value: formatCurrency(metrics.grossProfit),
      subtitle: `From ${metrics.wins} winning bets`,
      icon: TrendingUp,
      iconColor: '#6b7280',
      iconBgColor: '#f3f4f6',
      valueColor: metrics.grossProfit >= 0 ? '#2e7d32' : '#c62828',
    },
    {
      title: 'Net Profit',
      value: formatCurrency(metrics.netProfit),
      subtitle: `After ${metrics.losses} losses`,
      icon: DollarSign,
      iconColor: '#6b7280',
      iconBgColor: '#f3f4f6',
      valueColor: metrics.netProfit >= 0 ? '#2e7d32' : '#c62828',
    },
    {
      title: 'Bonuses Earned',
      value: formatCurrency(metrics.bonusesEarned),
      subtitle: `${metrics.bonusCount} bonus${metrics.bonusCount !== 1 ? 'es' : ''} received`,
      icon: Gift,
      iconColor: '#6b7280',
      iconBgColor: '#f3f4f6',
    },
    {
      title: 'Total Outlay',
      value: formatCurrency(metrics.totalOutlay),
      subtitle: `Across ${metrics.totalRaces + metrics.pending} races`,
      icon: CreditCard,
      iconColor: '#6b7280',
      iconBgColor: '#f3f4f6',
    },
    {
      title: 'Win Rate',
      value: formatPercentage(metrics.winRate),
      subtitle: `${metrics.wins} wins / ${metrics.totalRaces} races`,
      icon: Target,
      iconColor: '#6b7280',
      iconBgColor: '#f3f4f6',
    },
    {
      title: 'Races Completed',
      value: metrics.totalRaces.toString(),
      subtitle: `${metrics.pending} pending`,
      icon: Trophy,
      iconColor: '#6b7280',
      iconBgColor: '#f3f4f6',
    },
  ]

  return (
    <Grid container spacing={isMobile ? 1 : 2}>
      {cards.map((card) => (
        <Grid size={{ xs: 6, sm: 4, md: 4 }} key={card.title}>
          <MetricCard {...card} compact={isMobile} />
        </Grid>
      ))}
    </Grid>
  )
}
