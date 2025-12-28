/**
 * Balance Summary Card
 *
 * Hero card showing total balance with trend indicator and P&L summary.
 * Mobile-first design with large touch targets.
 */

import { Box, Paper, Typography, Skeleton } from '@mui/material'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatLedgerCurrency } from '../../types/ledger'

// ============================================================================
// Types
// ============================================================================

interface BalanceSummaryCardProps {
  /** Total balance across all accounts */
  totalBalance: number
  /** Total P&L */
  totalPL: number
  /** Change from previous period */
  periodChange?: number
  /** Period label (e.g., "this week", "this month") */
  periodLabel?: string
  /** Is data loading? */
  isLoading?: boolean
}

// ============================================================================
// Component
// ============================================================================

export function BalanceSummaryCard({
  totalBalance,
  totalPL,
  periodChange = 0,
  periodLabel = 'this week',
  isLoading = false,
}: BalanceSummaryCardProps) {
  // Determine trend
  const isPositive = periodChange > 0
  const isNegative = periodChange < 0
  const isNeutral = periodChange === 0

  // Colors
  const trendColor = isPositive ? '#2e7d32' : isNegative ? '#c62828' : '#6b7280'
  const plColor = totalPL >= 0 ? '#2e7d32' : '#c62828'

  // Trend icon
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus

  if (isLoading) {
    return (
      <Paper
        sx={{
          p: 3,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: 'white',
          borderRadius: 3,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Skeleton variant="text" width={120} height={24} sx={{ mx: 'auto', bgcolor: 'rgba(255,255,255,0.1)' }} />
          <Skeleton variant="text" width={180} height={56} sx={{ mx: 'auto', bgcolor: 'rgba(255,255,255,0.1)' }} />
          <Skeleton variant="text" width={140} height={20} sx={{ mx: 'auto', bgcolor: 'rgba(255,255,255,0.1)' }} />
        </Box>
        <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1, bgcolor: 'rgba(255,255,255,0.1)' }} />
      </Paper>
    )
  }

  return (
    <Paper
      sx={{
        p: 3,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: 'white',
        borderRadius: 3,
        transition: 'transform 0.2s ease',
        '&:active': {
          transform: 'scale(0.99)',
        },
      }}
    >
      {/* Main Balance Section */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 500,
            letterSpacing: 1,
            textTransform: 'uppercase',
            mb: 0.5,
          }}
        >
          Total Balance
        </Typography>

        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            letterSpacing: -1,
            mb: 0.5,
          }}
        >
          {formatLedgerCurrency(totalBalance)}
        </Typography>

        {/* Trend Indicator */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1.5,
            py: 0.5,
            borderRadius: 10,
            backgroundColor: `${trendColor}22`,
            color: isNeutral ? 'rgba(255,255,255,0.6)' : trendColor,
          }}
        >
          <TrendIcon size={14} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {isNeutral ? 'No change' : `${isPositive ? '+' : ''}${formatLedgerCurrency(periodChange)}`}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {periodLabel}
          </Typography>
        </Box>
      </Box>

      {/* P&L Summary Bar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          py: 1.5,
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            P&L:
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600, color: plColor }}>
            {totalPL >= 0 ? '+' : ''}{formatLedgerCurrency(totalPL)}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: plColor,
          }}
        >
          {totalPL >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        </Box>
      </Box>
    </Paper>
  )
}
