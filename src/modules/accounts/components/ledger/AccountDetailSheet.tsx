/**
 * Account Detail Sheet
 *
 * Bottom sheet showing account details, summary stats, and recent activity.
 */

import { useState } from 'react'
import {
  Drawer,
  Box,
  Typography,
  Button,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Skeleton,
} from '@mui/material'
import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  Gift,
  RefreshCw,
  Edit2,
  Percent,
  RotateCcw,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import type { AccountBalance, LedgerEntry, LedgerEntryType } from '../../types/ledger'
import { formatLedgerCurrency, LEDGER_ENTRY_CONFIG } from '../../types/ledger'
import { AdjustBalanceDialog } from './AdjustBalanceDialog'

// ============================================================================
// Types
// ============================================================================

interface AccountDetailSheetProps {
  /** Is sheet open? */
  open: boolean
  /** Close handler */
  onClose: () => void
  /** Account balance data */
  account: AccountBalance | null
  /** Recent ledger entries */
  entries: LedgerEntry[]
  /** Is loading? */
  isLoading?: boolean
  /** Adjust balance handler */
  onAdjustBalance: (bookieName: string, newBalance: number, reason: string) => Promise<void>
  /** View all activity handler */
  onViewAllActivity?: () => void
}

// ============================================================================
// Entry Icon Map
// ============================================================================

const entryIconMap: Record<LedgerEntryType, React.ReactNode> = {
  DEPOSIT: <ArrowUpRight size={16} />,
  WITHDRAWAL: <ArrowDownLeft size={16} />,
  BET_WIN: <TrendingUp size={16} />,
  BET_LOSS: <TrendingDown size={16} />,
  BONUS_CREDIT: <Gift size={16} />,
  BONUS_TURNOVER: <RefreshCw size={16} />,
  ADJUSTMENT: <Edit2 size={16} />,
  COMMISSION: <Percent size={16} />,
  REFUND: <RotateCcw size={16} />,
}

// ============================================================================
// Component
// ============================================================================

export function AccountDetailSheet({
  open,
  onClose,
  account,
  entries,
  isLoading = false,
  onAdjustBalance,
  onViewAllActivity,
}: AccountDetailSheetProps) {
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)

  if (!account) {
    return null
  }

  const displayBalance: number =
    (account.isOverridden && typeof account.overrideValue === 'number')
      ? account.overrideValue
      : account.currentBalance

  // Calculate summary stats from entries
  const stats = entries.reduce(
    (acc, entry) => {
      const amount = entry.direction === 'in' ? entry.amount : -entry.amount
      switch (entry.entryType) {
        case 'DEPOSIT':
          acc.deposits += entry.amount
          break
        case 'WITHDRAWAL':
          acc.withdrawals += entry.amount
          break
        case 'BET_WIN':
          acc.wins += entry.amount
          break
        case 'BET_LOSS':
          acc.losses += entry.amount
          break
      }
      return acc
    },
    { deposits: 0, withdrawals: 0, wins: 0, losses: 0 }
  )

  const handleAdjustConfirm = async (newBalance: number, reason: string) => {
    await onAdjustBalance(account.bookieName, newBalance, reason)
  }

  return (
    <>
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '90vh',
          },
        }}
      >
        {/* Handle bar */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            pt: 1,
            pb: 0.5,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: '#e0e0e0',
            }}
          />
        </Box>

        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1,
          }}
        >
          <IconButton onClick={onClose} size="small">
            <X size={20} />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {account.bookieName}
          </Typography>
          <Box sx={{ width: 32 }} /> {/* Spacer for centering */}
        </Box>

        <Divider />

        {/* Content */}
        <Box sx={{ p: 3, overflowY: 'auto' }}>
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <>
              {/* Balance Section */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Current Balance
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                    color: displayBalance >= 0 ? '#1a1a2e' : '#c62828',
                    my: 1,
                  }}
                >
                  {formatLedgerCurrency(displayBalance)}
                </Typography>
                {account.isOverridden && (
                  <Typography variant="caption" color="warning.main">
                    Manual override active
                  </Typography>
                )}
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setAdjustDialogOpen(true)}
                    sx={{ borderRadius: 2 }}
                  >
                    Adjust Balance
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Summary Stats */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <StatBox
                  label="Deposits"
                  value={formatLedgerCurrency(stats.deposits)}
                  color="#1565c0"
                />
                <StatBox
                  label="Withdrawals"
                  value={formatLedgerCurrency(stats.withdrawals)}
                  color="#2e7d32"
                />
                <StatBox
                  label="Wins"
                  value={`+${formatLedgerCurrency(stats.wins)}`}
                  color="#2e7d32"
                />
                <StatBox
                  label="Losses"
                  value={`-${formatLedgerCurrency(stats.losses)}`}
                  color="#c62828"
                />
              </Box>

              {/* Net P&L */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 2,
                  py: 1.5,
                  borderRadius: 2,
                  backgroundColor: account.totalPL >= 0 ? '#e8f5e9' : '#ffebee',
                  mb: 3,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Net P&L:
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: account.totalPL >= 0 ? '#2e7d32' : '#c62828',
                  }}
                >
                  {account.totalPL >= 0 ? '+' : ''}{formatLedgerCurrency(account.totalPL)}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Recent Activity */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Recent Activity
                </Typography>
              </Box>

              {entries.length === 0 ? (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 4,
                    color: 'text.secondary',
                  }}
                >
                  <AlertCircle size={32} style={{ opacity: 0.5, marginBottom: 8 }} />
                  <Typography variant="body2">No activity yet</Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {entries.slice(0, 5).map((entry) => (
                    <LedgerEntryRow key={entry.id} entry={entry} />
                  ))}
                </List>
              )}

              {entries.length > 5 && onViewAllActivity && (
                <Button
                  fullWidth
                  onClick={onViewAllActivity}
                  sx={{ mt: 2, borderRadius: 2 }}
                  endIcon={<ChevronRight size={16} />}
                >
                  View All Activity ({entries.length})
                </Button>
              )}
            </>
          )}
        </Box>
      </Drawer>

      <AdjustBalanceDialog
        open={adjustDialogOpen}
        onClose={() => setAdjustDialogOpen(false)}
        onConfirm={handleAdjustConfirm}
        bookieName={account.bookieName}
        currentBalance={displayBalance}
      />
    </>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Box
      sx={{
        textAlign: 'center',
        p: 1.5,
        borderRadius: 2,
        backgroundColor: '#f5f5f5',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color }}>
        {value}
      </Typography>
    </Box>
  )
}

function LedgerEntryRow({ entry }: { entry: LedgerEntry }) {
  const config = LEDGER_ENTRY_CONFIG[entry.entryType]
  const isPositive = entry.direction === 'in'

  return (
    <ListItem
      sx={{
        px: 0,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <ListItemIcon sx={{ minWidth: 40 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: `${config.color}22`,
            color: config.color,
          }}
        >
          {entryIconMap[entry.entryType]}
        </Box>
      </ListItemIcon>
      <ListItemText
        primary={
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {entry.description || config.label}
          </Typography>
        }
        secondary={
          <Typography variant="caption" color="text.secondary">
            {new Date(entry.date).toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Typography>
        }
      />
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          color: isPositive ? '#2e7d32' : '#c62828',
        }}
      >
        {isPositive ? '+' : '-'}{formatLedgerCurrency(entry.amount)}
      </Typography>
    </ListItem>
  )
}

function LoadingSkeleton() {
  return (
    <>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Skeleton variant="text" width={100} sx={{ mx: 'auto' }} />
        <Skeleton variant="text" width={150} height={60} sx={{ mx: 'auto' }} />
        <Skeleton variant="rectangular" width={120} height={36} sx={{ mx: 'auto', mt: 2, borderRadius: 2 }} />
      </Box>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rectangular" height={60} sx={{ borderRadius: 2 }} />
        ))}
      </Box>
    </>
  )
}
