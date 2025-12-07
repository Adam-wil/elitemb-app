'use client'

import { Box, Paper, IconButton, Typography, Tooltip, Switch, Divider } from '@mui/material'
import { ChevronLeft, ChevronRight, BarChart3, TrendingUp, Calculator } from 'lucide-react'
import type { TrackerSummary } from '../types'

// Available aggregate columns that can be toggled
export interface AggregateColumn {
  id: string
  label: string
  description: string
  enabled: boolean
}

export const DEFAULT_AGGREGATE_COLUMNS: AggregateColumn[] = [
  { id: 'totalStake', label: 'Total Stake', description: 'Sum of all back stakes', enabled: false },
  { id: 'totalLiability', label: 'Total Liability', description: 'Sum of all lay liabilities', enabled: false },
  { id: 'avgOdds', label: 'Avg Odds', description: 'Average back odds', enabled: false },
  { id: 'winRate', label: 'Win Rate', description: 'Percentage of winning bets', enabled: false },
  { id: 'roi', label: 'ROI', description: 'Return on investment', enabled: false },
]

interface TrackerSidePanelProps {
  expanded: boolean
  onToggleExpand: () => void
  totalProfit: number
  summary: TrackerSummary
  aggregateColumns: AggregateColumn[]
  onToggleAggregate: (columnId: string) => void
}

export function TrackerSidePanel({
  expanded,
  onToggleExpand,
  totalProfit,
  summary,
  aggregateColumns,
  onToggleAggregate,
}: TrackerSidePanelProps) {
  const totalRaces = summary.wins + summary.losses + summary.bonuses + summary.deadHeats +
                     summary.middles + summary.refunds + summary.pending + summary.scratched
  const completedRaces = totalRaces - summary.pending
  const winRate = completedRaces > 0 ? ((summary.wins / completedRaces) * 100).toFixed(1) : '0.0'

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Toggle Button */}
      <Tooltip title={expanded ? 'Collapse panel' : 'Expand panel'} placement="left">
        <Paper
          onClick={onToggleExpand}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            cursor: 'pointer',
            borderRight: expanded ? '1px solid' : 'none',
            borderColor: 'divider',
            '&:hover': { backgroundColor: 'action.hover' },
          }}
        >
          <IconButton size="small" sx={{ p: 0.5 }}>
            {expanded ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </IconButton>
          {!expanded && (
            <Box
              sx={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                mt: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <BarChart3 size={16} />
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                Stats
              </Typography>
            </Box>
          )}
        </Paper>
      </Tooltip>

      {/* Panel Content */}
      <Paper
        sx={{
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s ease',
          width: expanded ? 280 : 0,
        }}
      >
        {expanded && (
          <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            {/* P/L Summary */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUp size={18} color="#6b7280" />
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>
                  P/L Summary
                </Typography>
              </Box>

              <Box sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: totalProfit >= 0 ? '#f0fdf4' : '#fef2f2',
                border: '1px solid',
                borderColor: totalProfit >= 0 ? '#bbf7d0' : '#fecaca',
                mb: 2,
              }}>
                <Typography sx={{ fontSize: '0.7rem', color: '#6b7280', mb: 0.5 }}>
                  Total Profit/Loss
                </Typography>
                <Typography sx={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: totalProfit > 0 ? '#16a34a' : totalProfit < 0 ? '#dc2626' : '#6b7280',
                  fontFeatureSettings: '"tnum"',
                }}>
                  {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
                </Typography>
              </Box>

              {/* Stats Grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <StatCard label="Wins" value={summary.wins} color="#16a34a" />
                <StatCard label="Losses" value={summary.losses} color="#dc2626" />
                <StatCard label="Pending" value={summary.pending} color="#f59e0b" />
                <StatCard label="Win Rate" value={`${winRate}%`} color="#3b82f6" />
              </Box>

              {/* Additional Stats */}
              {(summary.bonuses > 0 || summary.deadHeats > 0 || summary.refunds > 0 || summary.scratched > 0) && (
                <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {summary.bonuses > 0 && <MiniStat label="Bonus" value={summary.bonuses} />}
                  {summary.deadHeats > 0 && <MiniStat label="Dead Heat" value={summary.deadHeats} />}
                  {summary.refunds > 0 && <MiniStat label="Refund" value={summary.refunds} />}
                  {summary.scratched > 0 && <MiniStat label="Scratched" value={summary.scratched} />}
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Aggregate Columns Toggle */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Calculator size={18} color="#6b7280" />
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>
                  Aggregate Columns
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {aggregateColumns.map((col) => (
                  <Box
                    key={col.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: col.enabled ? '#eff6ff' : '#f9fafb',
                      border: '1px solid',
                      borderColor: col.enabled ? '#bfdbfe' : '#e5e7eb',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: '0.813rem', fontWeight: 500, color: '#1f2937' }}>
                        {col.label}
                      </Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: '#6b7280' }}>
                        {col.description}
                      </Typography>
                    </Box>
                    <Switch
                      size="small"
                      checked={col.enabled}
                      onChange={() => onToggleAggregate(col.id)}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  )
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Box sx={{
      p: 1.5,
      borderRadius: 1.5,
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
    }}>
      <Typography sx={{ fontSize: '0.7rem', color: '#6b7280', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color, fontFeatureSettings: '"tnum"' }}>
        {value}
      </Typography>
    </Box>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <Box sx={{
      px: 1.5,
      py: 0.5,
      borderRadius: 1,
      backgroundColor: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      gap: 0.5,
    }}>
      <Typography sx={{ fontSize: '0.7rem', color: '#6b7280' }}>
        {label}:
      </Typography>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>
        {value}
      </Typography>
    </Box>
  )
}
