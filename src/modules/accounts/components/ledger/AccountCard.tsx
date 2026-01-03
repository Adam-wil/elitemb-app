/**
 * Account Card
 *
 * Per-bookie card showing balance and P&L with cash/bonus split.
 * Tappable to open account details.
 */

import { Box, Paper, Typography, Chip } from '@mui/material'
import { TrendingUp, TrendingDown, CircleDot, Diamond, ChevronRight } from 'lucide-react'
import type { AccountBalance, BookieAccountData } from '../../types/ledger'
import { formatLedgerCurrency } from '../../types/ledger'

// Format bookie name to title case (e.g., "POINTSBET" -> "Pointsbet", "SPORTSBET" -> "Sportsbet")
const formatBookieName = (name: string): string => {
  if (!name) return name
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

// ============================================================================
// Types
// ============================================================================

interface AccountCardProps {
  /** Account balance data (legacy) */
  account?: AccountBalance
  /** Enhanced bookie account data with cash/bonus split */
  bookieData?: BookieAccountData
  /** Click handler for opening details */
  onClick?: () => void
  /** Display mode: 'performance' shows P&L, 'reconcile' shows centered balance only */
  mode?: 'performance' | 'reconcile'
}

// ============================================================================
// Component
// ============================================================================

export function AccountCard({ account, bookieData, onClick, mode = 'performance' }: AccountCardProps) {
  // Support both legacy AccountBalance and new BookieAccountData
  const data = bookieData || (account ? {
    bookieName: account.bookieName,
    bookieId: account.bookieId ?? null,
    isExchange: account.isExchange,
    cashBalance: account.currentBalance,
    bonusBalance: 0,
    totalBalance: (account.isOverridden && typeof account.overrideValue === 'number')
      ? account.overrideValue
      : account.currentBalance,
    totalPL: account.totalPL,
    hasVariance: account.isOverridden,
    needsAttention: account.isOverridden,
  } : null)

  if (!data) {
    return null
  }

  const {
    bookieName,
    isExchange,
    cashBalance,
    bonusBalance,
    totalBalance,
    totalPL,
  } = data

  // Show cash/bonus split only for bookies with bonus (performance mode only)
  const showBonusSplit = mode === 'performance' && !isExchange && bonusBalance > 0

  // P&L color
  const plColor = totalPL >= 0 ? '#2e7d32' : '#c62828'
  const plBgColor = totalPL >= 0 ? '#e8f5e9' : '#ffebee'

  // Balance color
  const balanceColor = totalBalance >= 0 ? '#1a1a2e' : '#c62828'

  // Reconcile mode: simplified layout with balance on right
  if (mode === 'reconcile') {
    return (
      <Paper
        onClick={onClick}
        sx={{
          p: { xs: 1.5, sm: 2 },
          minHeight: { xs: 56, sm: 72 },
          width: '100%',
          borderRadius: 2,
          cursor: onClick ? 'pointer' : 'default',
          border: '1px solid',
          borderColor: 'divider',
          transition: 'all 0.2s ease',
          backgroundColor: 'background.paper',
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, width: '100%' }}>
          {/* Left: Icon and Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, minWidth: 0, flex: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: { xs: 32, sm: 36 },
                height: { xs: 32, sm: 36 },
                borderRadius: '50%',
                backgroundColor: isExchange ? '#e3f2fd' : '#f3e5f5',
                color: isExchange ? '#1565c0' : '#7b1fa2',
                flexShrink: 0,
              }}
            >
              {isExchange ? <Diamond size={16} /> : <CircleDot size={16} />}
            </Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '0.9rem', sm: '1rem' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {formatBookieName(bookieName)}
            </Typography>
          </Box>

          {/* Right: Balance and Chevron */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <Typography
              sx={{
                fontWeight: 700,
                color: balanceColor,
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                textAlign: 'right',
              }}
            >
              {formatLedgerCurrency(totalBalance)}
            </Typography>
            {onClick && (
              <ChevronRight size={18} style={{ color: '#9e9e9e', flexShrink: 0 }} />
            )}
          </Box>
        </Box>
      </Paper>
    )
  }

  // Performance mode: full layout with P&L
  return (
    <Paper
      onClick={onClick}
      sx={{
        p: { xs: 1.5, sm: 2 },
        minHeight: { xs: 56, sm: 72 },
        width: '100%',
        borderRadius: 2,
        cursor: onClick ? 'pointer' : 'default',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s ease',
        backgroundColor: 'background.paper',
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
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        {/* Left: Account Info */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1, sm: 1.5 }, flex: 1, minWidth: 0 }}>
          {/* Account Type Icon */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: { xs: 32, sm: 40 },
              height: { xs: 32, sm: 40 },
              borderRadius: '50%',
              backgroundColor: isExchange ? '#e3f2fd' : '#f3e5f5',
              color: isExchange ? '#1565c0' : '#7b1fa2',
              flexShrink: 0,
              mt: 0.25,
            }}
          >
            {isExchange ? <Diamond size={16} /> : <CircleDot size={16} />}
          </Box>

          {/* Name, Status, and Balances */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Header row with name and badges */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatBookieName(bookieName)}
              </Typography>
              {isExchange && (
                <Chip
                  label="Exch"
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: '0.6rem',
                    backgroundColor: '#e3f2fd',
                    color: '#1565c0',
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              )}
            </Box>

            {/* Cash/Bonus breakdown - stacks on mobile */}
            {showBonusSplit && (
              <Box sx={{ mt: 0.25, display: 'flex', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                  Cash: <strong>{formatLedgerCurrency(cashBalance)}</strong>
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                  Bonus: <strong style={{ color: '#7b1fa2' }}>{formatLedgerCurrency(bonusBalance)}</strong>
                </Typography>
              </Box>
            )}

            {/* P&L Indicator */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.25,
                mt: 0.5,
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                backgroundColor: plBgColor,
                color: plColor,
              }}
            >
              {totalPL >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              <Typography sx={{ fontWeight: 500, fontSize: '0.7rem' }}>
                {totalPL >= 0 ? '+' : ''}{formatLedgerCurrency(totalPL)}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Right: Total Balance and Chevron */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, alignSelf: 'center' }}>
          <Typography
            sx={{
              fontWeight: 700,
              color: balanceColor,
              fontSize: { xs: '1rem', sm: '1.15rem' },
              textAlign: 'right',
            }}
          >
            {formatLedgerCurrency(totalBalance)}
          </Typography>
          {onClick && (
            <ChevronRight size={18} style={{ color: '#9e9e9e', flexShrink: 0 }} />
          )}
        </Box>
      </Box>
    </Paper>
  )
}
