'use client'

import { useState, useCallback } from 'react'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  IconButton,
  Tooltip,
  Paper,
  Chip,
  Alert,
} from '@mui/material'
import { RefreshCw, Settings, Wallet, TrendingUp, Building2, ArrowLeft, HeartPulse, BookOpen } from 'lucide-react'
import { useBasiqConnection } from '../hooks/useBasiqConnection'
import { useTransactions, getDefaultDateRange } from '../hooks/useTransactions'
import { useBonusCredits } from '../hooks/useBonusCredits'
import { useBookiePL } from '../hooks/useBookiePL'
import { BankAccountsTab } from './BankAccountsTab'
import { RacingPLTab } from './RacingPLTab'
import { ConnectionSetup } from './ConnectionSetup'
import { BookieHealthTab } from './BookieHealthTab'
import { LedgerTab } from './ledger'

// ============================================================================
// Types
// ============================================================================

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

// ============================================================================
// Components
// ============================================================================

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

export function AccountsDashboard() {
  const [tabValue, setTabValue] = useState(0)
  const [showSetup, setShowSetup] = useState(false)
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  // Hooks
  const {
    connectionStatus,
    isConnected,
    isLoading: connectionLoading,
    refreshAccounts,
    accounts,
  } = useBasiqConnection()

  const {
    transactions,
    bookieTransactions,
    exchangeTransactions,
    isLoading: transactionsLoading,
    refreshTransactions,
    lastFetchedAt,
  } = useTransactions({
    userId: connectionStatus?.userId ?? null,
    dateRange,
    autoFetch: isConnected,
  })

  const { bonusCredits, addCredit, removeCredit, getGrandTotal } = useBonusCredits()

  // P&L data from database (not calculated from transactions)
  const {
    plRows,
    totalProfit,
    totalBalance,
    totalBonusBalance,
    setOverride,
    clearOverride,
    refresh: refreshPL,
    isLoading: plLoading,
  } = useBookiePL()

  // Handlers
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refreshAccounts(),
      refreshTransactions(),
      refreshPL(),
    ])
  }, [refreshAccounts, refreshTransactions, refreshPL])

  const handleSetupComplete = useCallback(() => {
    setShowSetup(false)
    handleRefresh()
  }, [handleRefresh])

  const isLoading = connectionLoading || transactionsLoading || plLoading

  // Show setup wizard if requested
  if (showSetup) {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          variant="text"
          onClick={() => setShowSetup(false)}
          sx={{ mb: 2 }}
          startIcon={<ArrowLeft size={16} />}
        >
          Back to Accounts
        </Button>
        <ConnectionSetup onComplete={handleSetupComplete} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
            Accounts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track your betting transactions and balances
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh data">
            <IconButton onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Bank Connection Settings">
            <IconButton onClick={() => setShowSetup(true)}>
              <Settings size={20} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Connection Banner - hidden on mobile */}
      {!isConnected && (
        <Alert
          severity="info"
          sx={{
            mb: 3,
            display: { xs: 'none', sm: 'flex' },
            backgroundColor: 'transparent',
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.secondary',
            '& .MuiAlert-icon': {
              color: 'text.secondary',
            },
          }}
          action={
            <Button color="primary" size="small" onClick={() => setShowSetup(true)}>
              Connect Bank
            </Button>
          }
        >
          Connect your bank account to automatically import transactions and track balances.
        </Alert>
      )}

      {/* Summary Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <SummaryCard
          title="Total Profit"
          value={`$${totalProfit.toFixed(2)}`}
          icon={<TrendingUp size={20} />}
          color={totalProfit > 0 ? 'success' : totalProfit < 0 ? 'error' : 'default'}
        />
        <SummaryCard
          title="Balance"
          value={`$${totalBalance.toFixed(2)}`}
          icon={<Wallet size={20} />}
          color={totalBalance !== 0 ? 'primary' : 'default'}
        />
        <SummaryCard
          title="Bonus Credits"
          value={`$${totalBonusBalance.toFixed(2)}`}
          icon={<TrendingUp size={20} />}
          color={totalBonusBalance !== 0 ? 'info' : 'default'}
        />
        <SummaryCard
          title="Connected Accounts"
          value={accounts.length.toString()}
          icon={<Building2 size={20} />}
          color="default"
          subtitle={accounts.map(a => a.institution.name).join(', ')}
        />
      </Box>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              minHeight: { xs: 40, sm: 48 },
              '& .MuiTab-root': {
                minHeight: { xs: 40, sm: 48 },
                minWidth: 0,
                px: { xs: 0.5, sm: 2 },
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                textTransform: 'none',
                fontWeight: 500,
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            <Tab
              label={
                <>
                  <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
                    Bank Accounts
                    <Chip label={transactions.length} size="small" />
                  </Box>
                  <Box sx={{ display: { xs: 'block', sm: 'none' } }}>Bank</Box>
                </>
              }
            />
            <Tab label="Ledger" />
            <Tab
              label={
                <>
                  <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
                    Racing P&L
                    <Chip label={plRows.length} size="small" />
                  </Box>
                  <Box sx={{ display: { xs: 'block', sm: 'none' } }}>P&L</Box>
                </>
              }
            />
            <Tab
              label={
                <>
                  <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
                    <HeartPulse size={16} />
                    Bookie Health
                  </Box>
                  <Box sx={{ display: { xs: 'block', sm: 'none' } }}>Health</Box>
                </>
              }
            />
          </Tabs>
        </Box>

        <Box sx={{ p: 2 }}>
          <TabPanel value={tabValue} index={0}>
            <BankAccountsTab
              transactions={transactions}
              bookieTransactions={bookieTransactions}
              exchangeTransactions={exchangeTransactions}
              isLoading={isLoading}
              lastFetchedAt={lastFetchedAt}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onRefresh={refreshTransactions}
            />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <LedgerTab />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <RacingPLTab
              plRows={plRows}
              totalProfit={totalProfit}
              totalBalance={totalBalance}
              totalBonusBalance={totalBonusBalance}
              bonusCredits={bonusCredits}
              onAddBonusCredit={addCredit}
              onRemoveBonusCredit={removeCredit}
              onSetOverride={setOverride}
              onClearOverride={clearOverride}
            />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <BookieHealthTab />
          </TabPanel>
        </Box>
      </Paper>

      {/* Last Synced Footer */}
      {lastFetchedAt && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Last synced: {new Date(lastFetchedAt).toLocaleString()}
        </Typography>
      )}
    </Box>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

interface SummaryCardProps {
  title: string
  value: string
  icon: React.ReactNode
  color: 'success' | 'error' | 'primary' | 'info' | 'warning' | 'default'
  subtitle?: string
}

function SummaryCard({ title, value, icon, color, subtitle }: SummaryCardProps) {
  const colorMap = {
    success: { bg: '#e8f5e9', text: '#2e7d32', icon: '#2e7d32' },
    error: { bg: '#ffebee', text: '#c62828', icon: '#c62828' },
    primary: { bg: '#e3f2fd', text: '#1565c0', icon: '#1565c0' },
    info: { bg: '#e1f5fe', text: '#0277bd', icon: '#0277bd' },
    warning: { bg: '#fff3e0', text: '#e65100', icon: '#e65100' },
    default: { bg: '#f5f5f5', text: '#616161', icon: '#616161' },
  }

  const colors = colorMap[color]

  return (
    <Paper
      sx={{
        p: 2,
        backgroundColor: colors.bg,
        border: 'none',
        boxShadow: 'none',
        minWidth: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Box sx={{ color: colors.icon }}>{icon}</Box>
        <Typography variant="caption" sx={{ color: colors.text, fontWeight: 500 }}>
          {title}
        </Typography>
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 700, color: colors.text }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" sx={{ color: colors.text, opacity: 0.7 }}>
          {subtitle}
        </Typography>
      )}
    </Paper>
  )
}
