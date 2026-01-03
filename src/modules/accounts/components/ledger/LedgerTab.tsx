/**
 * Ledger Tab
 *
 * Main view for the Account Ledger feature.
 * Mobile-first design with hero balance card, filter chips, and account cards.
 */

import { useState, useMemo, useCallback } from 'react'
import { Box, Typography, Stack, Alert, Button, Skeleton, Snackbar, IconButton } from '@mui/material'
import { Plus, AlertCircle, X, Check } from 'lucide-react'
import { useLedger } from '../../hooks/useLedger'
import { useBalanceSummary } from '../../hooks/useBalanceSummary'
import { useBookieBalancesGrouped } from '../../hooks/useBookieBalancesGrouped'
import { useFilterPersistence } from '../../hooks/useFilterPersistence'
import type { AccountFilter, AccountBalance, BookieAccountData } from '../../types/ledger'
import { BalanceSummaryCard } from './BalanceSummaryCard'
import { AccountCard } from './AccountCard'
import { AccountFilterChips } from './AccountFilterChips'
import { AccountDetailSheet } from './AccountDetailSheet'
import { AddAccountDialog } from './AddAccountDialog'

// ============================================================================
// Component
// ============================================================================

export function LedgerTab() {
  // Persisted filter preference (stored in database)
  const {
    filter: accountFilter,
    setFilter: setAccountFilter,
    isLoading: filterLoading,
  } = useFilterPersistence('all')

  const [selectedAccount, setSelectedAccount] = useState<AccountBalance | null>(null)
  const [selectedBookieData, setSelectedBookieData] = useState<BookieAccountData | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [addAccountOpen, setAddAccountOpen] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  })

  // Fetch balance summary from AccountBalanceView (new double-entry system)
  const {
    totalBalance: calculatedBalance,
    isLoading: summaryLoading,
    error: summaryError,
    refresh: refreshSummary,
  } = useBalanceSummary()

  // Fetch grouped bookie balances with cash/bonus split (new double-entry system)
  const {
    filteredAccounts: groupedAccounts,
    bookieCount: groupedBookieCount,
    exchangeCount: groupedExchangeCount,
    bookieBalance: groupedBookieBalance,
    exchangeBalance: groupedExchangeBalance,
    totalPL: groupedTotalPL,
    isLoading: groupedLoading,
    error: groupedError,
    refresh: refreshGrouped,
  } = useBookieBalancesGrouped({ filter: accountFilter })

  // Fetch data using the ledger hook (for account details and legacy operations)
  const {
    balances,
    summary,
    totalBalance,
    totalPL,
    bookieCount,
    exchangeCount,
    selectedEntries,
    isLoading,
    error,
    selectAccount,
    adjustBalance,
    refresh,
  } = useLedger({ accountFilter })

  // Handle filter change
  const handleFilterChange = useCallback((newFilter: AccountFilter) => {
    setAccountFilter(newFilter)
  }, [setAccountFilter])

  // Combined refresh function
  const handleRefresh = useCallback(async () => {
    await Promise.all([refresh(), refreshSummary(), refreshGrouped()])
  }, [refresh, refreshSummary, refreshGrouped])

  // Use grouped accounts for display if available, fallback to legacy balances
  const displayAccounts = groupedAccounts.length > 0 ? groupedAccounts : null
  const displayLoading = groupedLoading || isLoading || filterLoading
  const displayError = groupedError || error

  // Filter counts - prefer grouped counts
  const filterCounts = useMemo(() => ({
    all: groupedBookieCount + groupedExchangeCount > 0
      ? groupedBookieCount + groupedExchangeCount
      : balances.length,
    bookies: groupedBookieCount > 0 ? groupedBookieCount : bookieCount,
    exchange: groupedExchangeCount > 0 ? groupedExchangeCount : exchangeCount,
    attention: 0,
    largeVariance: 0,
  }), [groupedBookieCount, groupedExchangeCount, balances.length, bookieCount, exchangeCount])

  // Handle account card click - supports both legacy and new data types
  const handleAccountClick = (account: AccountBalance) => {
    setSelectedAccount(account)
    selectAccount(account.bookieName)
    setSheetOpen(true)
  }

  // Handle bookie card click - for new BookieAccountData
  const handleBookieCardClick = (bookieData: BookieAccountData) => {
    setSelectedBookieData(bookieData)
    // Find matching legacy account for detail sheet
    const legacyAccount = balances.find((b) => b.bookieName === bookieData.bookieName)
    if (legacyAccount) {
      setSelectedAccount(legacyAccount)
    } else {
      // Create AccountBalance from BookieAccountData when no legacy account exists
      setSelectedAccount({
        id: '',
        profileId: '',
        bookieId: bookieData.bookieId,
        bookieName: bookieData.bookieName,
        isExchange: bookieData.isExchange,
        currentBalance: bookieData.totalBalance,
        totalPL: bookieData.totalPL,
        lastUpdated: new Date().toISOString(),
        isOverridden: bookieData.hasVariance,
      })
    }
    selectAccount(bookieData.bookieName)
    setSheetOpen(true)
  }

  // Handle sheet close
  const handleSheetClose = () => {
    setSheetOpen(false)
    setSelectedBookieData(null)
    selectAccount(null)
  }

  // Handle adjust balance
  const handleAdjustBalance = async (bookieName: string, newBalance: number, reason: string) => {
    const result = await adjustBalance(bookieName, newBalance, reason)
    await handleRefresh() // Refresh all data to show updated balance

    // Show success snackbar
    const adjustmentText = result.adjustmentAmount >= 0
      ? `+$${result.adjustmentAmount.toFixed(2)}`
      : `-$${Math.abs(result.adjustmentAmount).toFixed(2)}`
    setSnackbar({
      open: true,
      message: `${bookieName} adjusted by ${adjustmentText}`,
    })
  }

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  // Handle add account
  const handleAddAccount = useCallback(
    async (bookieName: string, balance: number, isExchange: boolean) => {
      // Use adjustBalance which creates an ADJUSTMENT entry
      // The reason will indicate this is an opening balance
      await adjustBalance(bookieName, balance, 'Opening balance')
      await refresh()
    },
    [adjustBalance, refresh]
  )

  // Get existing account names for validation
  const existingAccountNames = useMemo(
    () => balances.map((b) => b.bookieName),
    [balances]
  )

  // Error state (account list error - summary error is handled by the card)
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert
          severity="error"
          icon={<AlertCircle size={20} />}
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Hero Balance Card - uses calculated values from AccountBalanceView */}
      {/* Only show loading on initial fetch, not on filter changes */}
      <Box sx={{ mb: 3 }}>
        <BalanceSummaryCard
          totalBalance={calculatedBalance}
          totalPL={groupedTotalPL}
          isLoading={summaryLoading && calculatedBalance === 0}
          error={summaryError}
          onRetry={handleRefresh}
          mode={accountFilter === 'attention' ? 'reconcile' : 'performance'}
        />
      </Box>

      {/* Filter Chips */}
      <AccountFilterChips
        value={accountFilter}
        onChange={handleFilterChange}
        counts={filterCounts}
        balances={{
          bookies: groupedBookieBalance,
          exchange: groupedExchangeBalance,
        }}
      />

      {/* Account Cards */}
      {displayLoading ? (
        <LoadingCards />
      ) : displayAccounts && displayAccounts.length > 0 ? (
        <Stack spacing={1.5}>
          {displayAccounts.map((bookieData) => (
            <AccountCard
              key={bookieData.bookieName}
              bookieData={bookieData}
              onClick={() => handleBookieCardClick(bookieData)}
              mode={accountFilter === 'attention' ? 'reconcile' : 'performance'}
            />
          ))}
        </Stack>
      ) : (
        <EmptyState accountFilter={accountFilter} />
      )}

      {/* Add Account Button */}
      {!displayLoading && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="text"
            startIcon={<Plus size={18} />}
            onClick={() => setAddAccountOpen(true)}
            sx={{
              color: 'text.secondary',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.04)',
              },
            }}
          >
            Add Account
          </Button>
        </Box>
      )}

      {/* Account Detail Sheet */}
      <AccountDetailSheet
        open={sheetOpen}
        onClose={handleSheetClose}
        account={selectedAccount}
        isLoading={isLoading}
        onAdjustBalance={handleAdjustBalance}
        mode={accountFilter === 'attention' ? 'reconcile' : 'performance'}
      />

      {/* Add Account Dialog */}
      <AddAccountDialog
        open={addAccountOpen}
        onClose={() => setAddAccountOpen(false)}
        onConfirm={handleAddAccount}
        existingAccounts={existingAccountNames}
      />

      {/* Success Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        message={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Check size={16} />
            {snackbar.message}
          </Box>
        }
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleSnackbarClose}
          >
            <X size={16} />
          </IconButton>
        }
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

function LoadingCards() {
  return (
    <Stack spacing={1.5}>
      {[1, 2, 3].map((i) => (
        <Skeleton
          key={i}
          variant="rectangular"
          height={80}
          sx={{ borderRadius: 2 }}
        />
      ))}
    </Stack>
  )
}

function EmptyState({ accountFilter }: { accountFilter: AccountFilter }) {
  const getMessage = () => {
    switch (accountFilter) {
      case 'bookies':
        return 'No bookie accounts found'
      case 'exchange':
        return 'No exchange accounts found'
      case 'attention':
        return 'No accounts need attention'
      default:
        return 'No accounts found'
    }
  }

  const getSubtext = () => {
    if (accountFilter === 'attention') {
      return 'All accounts are reconciled. Nice work!'
    }
    return 'Accounts will appear here once transactions are synced from your bank or added manually.'
  }

  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 6,
        color: 'text.secondary',
      }}
    >
      <AlertCircle size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
      <Typography variant="body1" sx={{ mb: 1 }}>
        {getMessage()}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {getSubtext()}
      </Typography>
    </Box>
  )
}
