/**
 * Account Detail Sheet
 *
 * Bottom sheet showing account details, summary stats, and journal entry history.
 * Uses the double-entry accounting JournalEntryList for transaction display.
 */

import { useState, useEffect } from 'react'
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Skeleton,
  Divider,
} from '@mui/material'
import { X } from 'lucide-react'
import type { AccountBalance } from '../../types/ledger'
import { formatLedgerCurrency } from '../../types/ledger'
import { ActualBalanceInput } from './ActualBalanceInput'
import { JournalEntryList } from '../JournalEntryList'
import {
  getAccountByBookieName,
  getActualBalanceInfo,
  updateActualBalance,
  type ActualBalanceInfo,
} from '../../api/db/accountBalanceView.server'

// Format bookie name to title case (e.g., "POINTSBET" -> "Pointsbet")
const formatBookieName = (name: string): string => {
  if (!name) return name
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

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
  /** Is loading? */
  isLoading?: boolean
  /** Adjust balance handler */
  onAdjustBalance: (bookieName: string, newBalance: number, reason: string) => Promise<void>
  /** Profile ID for journal queries */
  profileId?: string
  /** View mode: 'reconcile' for balance fixing, 'performance' for P&L view */
  mode?: 'reconcile' | 'performance'
}

// ============================================================================
// Component
// ============================================================================

export function AccountDetailSheet({
  open,
  onClose,
  account,
  isLoading = false,
  onAdjustBalance,
  profileId,
  mode = 'performance',
}: AccountDetailSheetProps) {
  console.log('AccountDetailSheet mode:', mode)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [accountIdLoading, setAccountIdLoading] = useState(false)
  const [actualBalanceInfo, setActualBalanceInfo] = useState<ActualBalanceInfo | null>(null)

  // Fetch accountId and actualBalanceInfo when account changes
  useEffect(() => {
    if (!open || !account?.bookieName) {
      setAccountId(null)
      setActualBalanceInfo(null)
      return
    }

    const fetchAccountData = async () => {
      setAccountIdLoading(true)
      try {
        const result = await getAccountByBookieName({
          data: {
            bookieName: account.bookieName,
            profileId,
          },
        })
        const fetchedAccountId = result?.accountId ?? null
        setAccountId(fetchedAccountId)

        // Fetch actual balance info if we have an account
        if (fetchedAccountId) {
          const balanceInfo = await getActualBalanceInfo({
            data: { accountId: fetchedAccountId },
          })
          setActualBalanceInfo(balanceInfo)
        }
      } catch (err) {
        console.error('Failed to fetch account data:', err)
        setAccountId(null)
        setActualBalanceInfo(null)
      } finally {
        setAccountIdLoading(false)
      }
    }

    fetchAccountData()
  }, [open, account?.bookieName, profileId])

  // Handler for reconciliation - user enters what bookie shows, system auto-adjusts
  const handleSaveActualBalance = async (newActualBalance: number) => {
    console.log('handleSaveActualBalance called:', { newActualBalance, accountId, bookieName: account?.bookieName })

    if (!accountId || !account?.bookieName) {
      console.log('Missing accountId or bookieName, aborting')
      return
    }

    // Calculate the difference between what user says bookie shows vs what we calculated
    const calculatedBalance = actualBalanceInfo?.calculatedBalance ?? 0
    const difference = newActualBalance - calculatedBalance
    console.log('Reconciliation:', { calculatedBalance, newActualBalance, difference })

    // If there's a difference, create an adjustment entry to match
    if (Math.abs(difference) > 0.01) {
      console.log('Creating adjustment for difference:', difference)
      await onAdjustBalance(account.bookieName, newActualBalance, 'Balance reconciliation')
      console.log('Adjustment created')
    }

    // Update the actual balance record
    console.log('Updating actual balance record...')
    const result = await updateActualBalance({
      data: {
        accountId,
        actualBalance: newActualBalance,
        profileId,
      },
    })
    console.log('updateActualBalance result:', result)

    // Update local state - after adjustment, calculated should match actual
    setActualBalanceInfo({
      accountId: result.accountId,
      calculatedBalance: newActualBalance, // After adjustment, this matches
      actualBalance: result.actualBalance,
      actualBalanceAt: result.actualBalanceAt,
      variance: 0, // No variance after reconciliation
    })
    console.log('Reconciliation complete')
  }

  if (!account) {
    return null
  }

  const displayBalance: number =
    (account.isOverridden && typeof account.overrideValue === 'number')
      ? account.overrideValue
      : account.currentBalance

  return (
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
            {formatBookieName(account.bookieName)}
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
                  {mode === 'reconcile' ? 'System Balance' : 'Current Balance'}
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
              </Box>

              {/* Reconciliation Section - Only in reconcile mode */}
              {mode === 'reconcile' && (
                <Box
                  sx={{
                    mb: 3,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                    Reconcile with Bookie App
                  </Typography>
                  <ActualBalanceInput
                    calculatedBalance={actualBalanceInfo?.calculatedBalance ?? displayBalance}
                    actualBalance={actualBalanceInfo?.actualBalance ?? null}
                    actualBalanceAt={actualBalanceInfo?.actualBalanceAt ?? null}
                    onSave={handleSaveActualBalance}
                    isLoading={accountIdLoading}
                  />
                </Box>
              )}

              {/* Net P&L - Only in performance mode */}
              {mode === 'performance' && (
                <>
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

                  {/* Transaction History */}
                  {accountId && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                        Transaction History
                      </Typography>
                      <JournalEntryList
                        accountId={accountId}
                        profileId={profileId}
                        pageSize={10}
                      />
                    </Box>
                  )}
                </>
              )}
            </>
          )}
        </Box>
      </Drawer>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

function LoadingSkeleton() {
  return (
    <Box sx={{ textAlign: 'center', mb: 3 }}>
      <Skeleton variant="text" width={100} sx={{ mx: 'auto' }} />
      <Skeleton variant="text" width={150} height={60} sx={{ mx: 'auto' }} />
      <Skeleton variant="rectangular" width={120} height={36} sx={{ mx: 'auto', mt: 2, borderRadius: 2 }} />
    </Box>
  )
}
