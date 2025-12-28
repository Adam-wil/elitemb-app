/**
 * Account Filter Chips
 *
 * Toggle between All/Bookies/Exchange accounts.
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
  }
}

// ============================================================================
// Component
// ============================================================================

export function AccountFilterChips({
  value,
  onChange,
  counts = { all: 0, bookies: 0, exchange: 0 },
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
    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={handleChange}
        size="small"
        sx={{
          backgroundColor: '#f5f5f5',
          borderRadius: 10,
          '& .MuiToggleButton-root': {
            border: 'none',
            borderRadius: '20px !important',
            px: 2,
            py: 0.75,
            mx: 0.25,
            textTransform: 'none',
            color: '#6b7280',
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
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            All
          </Typography>
          {counts.all > 0 && (
            <Typography
              variant="caption"
              sx={{ ml: 0.75, color: value === 'all' ? '#6b7280' : '#9e9e9e' }}
            >
              {counts.all}
            </Typography>
          )}
        </ToggleButton>

        <ToggleButton value="bookies">
          <Users size={14} style={{ marginRight: 4 }} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Bookies
          </Typography>
          {counts.bookies > 0 && (
            <Typography
              variant="caption"
              sx={{ ml: 0.75, color: value === 'bookies' ? '#6b7280' : '#9e9e9e' }}
            >
              {counts.bookies}
            </Typography>
          )}
        </ToggleButton>

        <ToggleButton value="exchange">
          <Diamond size={14} style={{ marginRight: 4 }} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Exchange
          </Typography>
          {counts.exchange > 0 && (
            <Typography
              variant="caption"
              sx={{ ml: 0.75, color: value === 'exchange' ? '#6b7280' : '#9e9e9e' }}
            >
              {counts.exchange}
            </Typography>
          )}
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  )
}
