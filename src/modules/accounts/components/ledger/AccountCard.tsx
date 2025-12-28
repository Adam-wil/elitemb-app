/**
 * Account Card
 *
 * Per-bookie card showing balance and P&L.
 * Tappable to open account details.
 */

import { Box, Paper, Typography, Chip } from '@mui/material'
import { TrendingUp, TrendingDown, CircleDot, Diamond, ChevronRight } from 'lucide-react'
import type { AccountBalance } from '../../types/ledger'
import { formatLedgerCurrency } from '../../types/ledger'

// ============================================================================
// Types
// ============================================================================

interface AccountCardProps {
  /** Account balance data */
  account: AccountBalance
  /** Click handler for opening details */
  onClick?: () => void
}

// ============================================================================
// Component
// ============================================================================

export function AccountCard({ account, onClick }: AccountCardProps) {
  const {
    bookieName,
    isExchange,
    currentBalance,
    totalPL,
    isOverridden,
    overrideValue,
  } = account

  // Use override value if set, defaulting to currentBalance
  const displayBalance: number = (isOverridden && typeof overrideValue === 'number') ? overrideValue : currentBalance

  // P&L color
  const plColor = totalPL >= 0 ? '#2e7d32' : '#c62828'
  const plBgColor = totalPL >= 0 ? '#e8f5e9' : '#ffebee'

  // Balance color
  const balanceColor = displayBalance >= 0 ? '#1a1a2e' : '#c62828'

  return (
    <Paper
      onClick={onClick}
      sx={{
        p: 2,
        borderRadius: 2,
        cursor: onClick ? 'pointer' : 'default',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s ease',
        '&:hover': onClick
          ? {
              borderColor: 'primary.main',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }
          : {},
        '&:active': onClick
          ? {
              transform: 'scale(0.99)',
            }
          : {},
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left: Account Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
          {/* Account Type Icon */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: isExchange ? '#e3f2fd' : '#f3e5f5',
              color: isExchange ? '#1565c0' : '#7b1fa2',
              flexShrink: 0,
            }}
          >
            {isExchange ? <Diamond size={18} /> : <CircleDot size={18} />}
          </Box>

          {/* Name and Status */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {bookieName}
              </Typography>
              {isExchange && (
                <Chip
                  label="Exchange"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    backgroundColor: '#e3f2fd',
                    color: '#1565c0',
                  }}
                />
              )}
              {isOverridden && (
                <Chip
                  label="Override"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    backgroundColor: '#fff3e0',
                    color: '#e65100',
                  }}
                />
              )}
            </Box>

            {/* P&L Indicator */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                mt: 0.5,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                backgroundColor: plBgColor,
                color: plColor,
              }}
            >
              {totalPL >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                {totalPL >= 0 ? '+' : ''}{formatLedgerCurrency(totalPL)} P&L
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Right: Balance and Chevron */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: balanceColor,
            }}
          >
            {formatLedgerCurrency(displayBalance)}
          </Typography>
          {onClick && (
            <ChevronRight size={20} style={{ color: '#9e9e9e' }} />
          )}
        </Box>
      </Box>
    </Paper>
  )
}
