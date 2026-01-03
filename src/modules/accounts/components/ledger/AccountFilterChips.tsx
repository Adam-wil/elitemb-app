/**
 * Account Filter Chips
 *
 * Toggle between All/Bookies/Exchange/Attention accounts.
 * Attention filter shows accounts needing reconciliation (variance detected).
 */

import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { Users, Diamond } from 'lucide-react'
import type { AccountFilter } from '../../types/ledger'

// ============================================================================
// Types
// ============================================================================

interface AccountFilterChipsProps {
  /** Current filter value */
  value: AccountFilter
  /** Change handler */
  onChange: (filter: AccountFilter) => void
  /** Counts for each filter */
  counts?: {
    all: number
    bookies: number
    exchange: number
    attention: number      // Total accounts with any variance (shown when filter active)
    largeVariance: number  // Only accounts with $500+ variance (shown as badge)
  }
  /** Balances for display on chips */
  balances?: {
    bookies: number        // Total balance across all bookies
    exchange: number       // Total balance across exchanges
  }
}

// ============================================================================
// Component
// ============================================================================

// Format currency for chip display
const formatChipBalance = (amount: number): string => {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`
  }
  return `$${Math.round(amount)}`
}

export function AccountFilterChips({
  value,
  onChange,
  counts = { all: 0, bookies: 0, exchange: 0, attention: 0, largeVariance: 0 },
  balances = { bookies: 0, exchange: 0 },
}: AccountFilterChipsProps) {
  const handleChange = (
    _event: React.MouseEvent<HTMLElement>,
    newValue: AccountFilter | null
  ) => {
    if (newValue !== null) {
      onChange(newValue)
    }
  }

  return (
    <Box
      sx={{
        mb: 2,
        width: '100%',
      }}
    >
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={handleChange}
        size="small"
        fullWidth
        sx={{
          display: 'flex',
          flexWrap: 'nowrap',
          backgroundColor: '#f5f5f5',
          borderRadius: 2.5,
          p: 0.5,
          '& .MuiToggleButton-root': {
            flex: 1,
            border: 'none',
            borderRadius: '16px !important',
            px: { xs: 0.5, sm: 2 },
            py: { xs: 0.5, sm: 0.75 },
            textTransform: 'none',
            color: '#6b7280',
            fontSize: { xs: '0.7rem', sm: '0.875rem' },
            whiteSpace: 'nowrap',
            minWidth: 'auto',
            '&.Mui-selected': {
              backgroundColor: 'white',
              color: '#1a1a2e',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              '&:hover': {
                backgroundColor: 'white',
              },
            },
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.04)',
            },
          },
        }}
      >
        <ToggleButton value="all">
          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 'inherit' }}>
            All
          </Typography>
          {counts.all > 0 && (
            <Typography
              component="span"
              sx={{
                ml: 0.5,
                fontSize: '0.7rem',
                color: value === 'all' ? '#6b7280' : '#9e9e9e',
              }}
            >
              {counts.all}
            </Typography>
          )}
        </ToggleButton>

        <ToggleButton value="bookies">
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline-flex' }, mr: 0.5 }}>
            <Users size={14} />
          </Box>
          <Typography component="span" sx={{ display: { xs: 'none', sm: 'inline' }, fontWeight: 500, fontSize: 'inherit' }}>
            Performance
          </Typography>
          <Typography component="span" sx={{ display: { xs: 'inline', sm: 'none' }, fontWeight: 500, fontSize: 'inherit' }}>
            P&L
          </Typography>
          {balances.bookies !== 0 && (
            <Typography
              component="span"
              sx={{
                ml: 0.5,
                fontSize: '0.65rem',
                color: value === 'bookies' ? '#6b7280' : '#9e9e9e',
                display: { xs: 'none', sm: 'inline' },
              }}
            >
              {formatChipBalance(balances.bookies)}
            </Typography>
          )}
        </ToggleButton>

        <ToggleButton value="exchange">
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline-flex' }, mr: 0.5 }}>
            <Diamond size={14} />
          </Box>
          <Typography component="span" sx={{ display: { xs: 'none', sm: 'inline' }, fontWeight: 500, fontSize: 'inherit' }}>
            Exchange
          </Typography>
          <Typography component="span" sx={{ display: { xs: 'inline', sm: 'none' }, fontWeight: 500, fontSize: 'inherit' }}>
            Exch
          </Typography>
          {balances.exchange !== 0 && (
            <Typography
              component="span"
              sx={{
                ml: 0.5,
                fontSize: '0.65rem',
                color: value === 'exchange' ? '#6b7280' : '#9e9e9e',
                display: { xs: 'none', sm: 'inline' },
              }}
            >
              {formatChipBalance(balances.exchange)}
            </Typography>
          )}
        </ToggleButton>

        {/* Reconcile Filter - for checking balances */}
        <ToggleButton value="attention">
          <Typography component="span" sx={{ display: { xs: 'none', sm: 'inline' }, fontWeight: 500, fontSize: 'inherit' }}>
            Reconcile
          </Typography>
          <Typography component="span" sx={{ display: { xs: 'inline', sm: 'none' }, fontWeight: 500, fontSize: 'inherit' }}>
            Recon
          </Typography>
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  )
}
