'use client'

import { Box, Typography, Paper, Divider } from '@mui/material'
import { TrendingUp, TrendingDown, Award, RotateCcw } from 'lucide-react'
import type { TrackerSummary } from '../types'

interface ProfitSummaryProps {
  totalProfit: number
  summary: TrackerSummary
  compact?: boolean
}

export function ProfitSummary({ totalProfit, summary, compact = false }: ProfitSummaryProps) {
  const isPositive = totalProfit > 0
  const isNegative = totalProfit < 0

  if (compact) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 2,
          py: 1,
          backgroundColor: isPositive ? 'success.light' : isNegative ? 'error.light' : 'grey.100',
          borderRadius: 1,
        }}
      >
        {isPositive ? (
          <TrendingUp size={20} color="#2e7d32" />
        ) : isNegative ? (
          <TrendingDown size={20} color="#c62828" />
        ) : null}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: isPositive ? 'success.dark' : isNegative ? 'error.dark' : 'text.primary',
          }}
        >
          {isPositive ? '+' : ''}${totalProfit.toFixed(2)}
        </Typography>
        <Divider orientation="vertical" flexItem />
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <StatChip label="W" value={summary.wins} color="success" />
          <StatChip label="L" value={summary.losses} color="error" />
          <StatChip label="B" value={summary.bonuses} color="info" />
          <StatChip label="P" value={summary.pending} color="default" />
        </Box>
      </Box>
    )
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Main P/L */}
        <Box>
          <Typography variant="caption" color="text.secondary">
            Total Profit/Loss
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isPositive ? (
              <TrendingUp size={24} color="#2e7d32" />
            ) : isNegative ? (
              <TrendingDown size={24} color="#c62828" />
            ) : null}
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: isPositive ? 'success.main' : isNegative ? 'error.main' : 'text.primary',
              }}
            >
              {isPositive ? '+' : ''}${totalProfit.toFixed(2)}
            </Typography>
          </Box>
        </Box>

        {/* Stats Grid */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <StatBox label="Wins" value={summary.wins} icon={<Award size={16} />} color="success" />
          <StatBox label="Losses" value={summary.losses} color="error" />
          <StatBox label="Bonuses" value={summary.bonuses} color="info" />
          <StatBox label="Refunds" value={summary.refunds} icon={<RotateCcw size={16} />} color="default" />
          <StatBox label="Pending" value={summary.pending} color="warning" />
        </Box>
      </Box>

      {/* Additional stats row */}
      {(summary.deadHeats > 0 || summary.middles > 0 || summary.scratched > 0) && (
        <Box sx={{ display: 'flex', gap: 2, mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          {summary.deadHeats > 0 && (
            <Typography variant="caption" color="text.secondary">
              Dead Heats: {summary.deadHeats}
            </Typography>
          )}
          {summary.middles > 0 && (
            <Typography variant="caption" color="text.secondary">
              Middles: {summary.middles}
            </Typography>
          )}
          {summary.scratched > 0 && (
            <Typography variant="caption" color="text.secondary">
              Scratched: {summary.scratched}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  )
}

function StatChip({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'success' | 'error' | 'info' | 'warning' | 'default'
}) {
  const colorMap = {
    success: { bg: '#c8e6c9', text: '#2e7d32' },
    error: { bg: '#ffcdd2', text: '#c62828' },
    info: { bg: '#bbdefb', text: '#1565c0' },
    warning: { bg: '#fff3e0', text: '#e65100' },
    default: { bg: '#eeeeee', text: '#616161' },
  }

  const colors = colorMap[color]

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: 1,
        backgroundColor: colors.bg,
      }}
    >
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: colors.text }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: colors.text }}>
        {value}
      </Typography>
    </Box>
  )
}

function StatBox({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: number
  icon?: React.ReactNode
  color: 'success' | 'error' | 'info' | 'warning' | 'default'
}) {
  const colorMap = {
    success: 'success.main',
    error: 'error.main',
    info: 'info.main',
    warning: 'warning.main',
    default: 'text.secondary',
  }

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        {icon}
        <Typography variant="h5" sx={{ fontWeight: 600, color: colorMap[color] }}>
          {value}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  )
}
