/**
 * Balance Summary Card
 *
 * Hero card showing total balance with trend indicator and P&L summary.
 * Mobile-first design with large touch targets.
 * Displays variance indicator when calculated balance differs from actual.
 */

import { Box, Paper, Typography, Skeleton, Button, Alert } from '@mui/material'
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { formatLedgerCurrency } from '../../types/ledger'

// ============================================================================
// Types
// ============================================================================

interface BalanceSummaryCardProps {
  /** Total balance across all accounts */
  totalBalance: number
  /** Total P&L */
  totalPL: number
  /** Is data loading? */
  isLoading?: boolean
  /** Error message (shows error state when set) */
  error?: string | null
  /** Callback for retry button in error state */
  onRetry?: () => void
  /** View mode: hide P&L in reconcile mode */
  mode?: 'performance' | 'reconcile'
}

// ============================================================================
// Component
// ============================================================================

export function BalanceSummaryCard({
  totalBalance,
  totalPL,
  isLoading = false,
  error = null,
  onRetry,
  mode = 'performance',
}: BalanceSummaryCardProps) {
  // Colors
  const plColor = totalPL >= 0 ? '#2e7d32' : '#c62828'

  // Error state
  if (error) {
    return (
      <Paper
        sx={{
          p: 3,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: 'white',
          borderRadius: 3,
        }}
      >
        <Alert
          severity="error"
          icon={<AlertTriangle size={20} />}
          sx={{
            backgroundColor: 'rgba(211, 47, 47, 0.15)',
            color: 'white',
            '& .MuiAlert-icon': { color: '#ff6b6b' },
          }}
          action={
            onRetry && (
              <Button
                color="inherit"
                size="small"
                onClick={onRetry}
                startIcon={<RefreshCw size={14} />}
                sx={{ color: 'white' }}
              >
                Retry
              </Button>
            )
          }
        >
          {error}
        </Alert>
      </Paper>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <Paper
        sx={{
          p: { xs: 2, sm: 3 },
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: 'white',
          borderRadius: 3,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 1.5 }}>
          <Skeleton variant="text" width={100} height={20} sx={{ mx: 'auto', bgcolor: 'rgba(255,255,255,0.1)' }} />
          <Skeleton variant="text" width={140} height={40} sx={{ mx: 'auto', bgcolor: 'rgba(255,255,255,0.1)' }} />
        </Box>
        <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 1, bgcolor: 'rgba(255,255,255,0.1)' }} />
      </Paper>
    )
  }

  return (
    <Paper
      sx={{
        p: { xs: 2, sm: 3 },
        width: '100%',
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
      <Box sx={{ textAlign: 'center', py: { xs: 0.5, sm: 1 } }}>
        <Typography
          sx={{
            color: 'rgba(255,255,255,0.6)',
            fontWeight: 500,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            fontSize: { xs: '0.7rem', sm: '0.875rem' },
            mb: 0.5,
          }}
        >
          Total Balance
        </Typography>

        <Typography
          sx={{
            fontWeight: 700,
            letterSpacing: -0.5,
            fontSize: { xs: '1.75rem', sm: '2.5rem' },
          }}
        >
          {formatLedgerCurrency(totalBalance)}
        </Typography>
      </Box>

      {/* P&L Summary Bar - Always rendered for consistent height, invisible in reconcile mode */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: { xs: 1.5, sm: 2 },
          py: { xs: 1, sm: 1.5 },
          mt: 1,
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.08)',
          visibility: mode === 'performance' ? 'visible' : 'hidden',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
            P&L:
          </Typography>
          <Typography sx={{ fontWeight: 600, color: plColor, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
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
