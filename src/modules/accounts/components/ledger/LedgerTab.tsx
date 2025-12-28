/**
 * Ledger Tab
 *
 * Main view for the Account Ledger feature.
 * Mobile-first design with hero balance card, filter chips, and account cards.
 */

import { useState, useMemo, useCallback } from 'react'
import { Box, Typography, Stack, Alert, Button, Skeleton } from '@mui/material'
import { Plus, AlertCircle } from 'lucide-react'
import { useLedger } from '../../hooks/useLedger'
import type { AccountFilter, AccountBalance } from '../../types/ledger'
import { BalanceSummaryCard } from './BalanceSummaryCard'
import { AccountCard } from './AccountCard'
import { AccountFilterChips } from './AccountFilterChips'
import { AccountDetailSheet } from './AccountDetailSheet'
import { AddAccountDialog } from './AddAccountDialog'

// ============================================================================
// Component
// ============================================================================

export function LedgerTab() {
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all')
  const [selectedAccount, setSelectedAccount] = useState<AccountBalance | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [addAccountOpen, setAddAccountOpen] = useState(false)

  // Fetch data using the ledger hook
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

  // Filter balances based on account filter
  const filteredBalances = useMemo(() => {
    switch (accountFilter) {
      case 'bookies':
        return balances.filter((b) => !b.isExchange)
      case 'exchange':
        return balances.filter((b) => b.isExchange)
      default:
        return balances
    }
  }, [balances, accountFilter])

  // Filter counts
  const filterCounts = useMemo(() => ({
    all: balances.length,
    bookies: bookieCount,
    exchange: exchangeCount,
  }), [balances.length, bookieCount, exchangeCount])

  // Handle account card click
  const handleAccountClick = (account: AccountBalance) => {
    setSelectedAccount(account)
    selectAccount(account.bookieName)
    setSheetOpen(true)
  }

  // Handle sheet close
  const handleSheetClose = () => {
    setSheetOpen(false)
    selectAccount(null)
  }

  // Handle adjust balance
  const handleAdjustBalance = async (bookieName: string, newBalance: number, reason: string) => {
    await adjustBalance(bookieName, newBalance, reason)
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

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert
          severity="error"
          icon={<AlertCircle size={20} />}
          action={
            <Button color="inherit" size="small" onClick={refresh}>
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
      {/* Hero Balance Card */}
      <Box sx={{ mb: 3 }}>
        <BalanceSummaryCard
          totalBalance={totalBalance}
          totalPL={totalPL}
          periodChange={summary.netPL}
          periodLabel="all time"
          isLoading={isLoading}
        />
      </Box>

      {/* Filter Chips */}
      <AccountFilterChips
        value={accountFilter}
        onChange={setAccountFilter}
        counts={filterCounts}
      />

      {/* Account Cards */}
      {isLoading ? (
        <LoadingCards />
      ) : filteredBalances.length === 0 ? (
        <EmptyState accountFilter={accountFilter} />
      ) : (
        <Stack spacing={1.5}>
          {filteredBalances.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onClick={() => handleAccountClick(account)}
            />
          ))}
        </Stack>
      )}

      {/* Add Account Button */}
      {!isLoading && (
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
        entries={selectedEntries}
        isLoading={isLoading}
        onAdjustBalance={handleAdjustBalance}
      />

      {/* Add Account Dialog */}
      <AddAccountDialog
        open={addAccountOpen}
        onClose={() => setAddAccountOpen(false)}
        onConfirm={handleAddAccount}
        existingAccounts={existingAccountNames}
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
      default:
        return 'No accounts found'
    }
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
        Accounts will appear here once transactions are synced from your bank
        or added manually.
      </Typography>
    </Box>
  )
}
