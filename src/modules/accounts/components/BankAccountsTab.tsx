'use client'

import { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Stack,
  Skeleton,
} from '@mui/material'
import { DataGridPremium, GridColDef, GridRenderCellParams } from '@mui/x-data-grid-premium'
import {
  Search,
  RefreshCw,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  CircleDot,
  Diamond,
  ChevronRight,
} from 'lucide-react'
import type { NormalizedTransaction } from '../types'
import { DateRangeFilter } from './DateRangeFilter'

// ============================================================================
// Types
// ============================================================================

interface BankAccountsTabProps {
  transactions: NormalizedTransaction[]
  bookieTransactions: NormalizedTransaction[]
  exchangeTransactions: NormalizedTransaction[]
  isLoading: boolean
  lastFetchedAt: string | null
  dateRange: { from: string; to: string }
  onDateRangeChange: (range: { from: string; to: string }) => void
  onRefresh: () => void
}

type TransactionFilter = 'all' | 'bookies' | 'exchanges'

// ============================================================================
// Component
// ============================================================================

export function BankAccountsTab({
  transactions,
  bookieTransactions,
  exchangeTransactions,
  isLoading,
  dateRange,
  onDateRangeChange,
  onRefresh,
}: BankAccountsTabProps) {
  const [filter, setFilter] = useState<TransactionFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let data: NormalizedTransaction[]

    switch (filter) {
      case 'bookies':
        data = bookieTransactions
        break
      case 'exchanges':
        data = exchangeTransactions
        break
      default:
        data = transactions
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      data = data.filter(
        tx =>
          tx.description.toLowerCase().includes(query) ||
          tx.detectedBookie?.toLowerCase().includes(query)
      )
    }

    // Sort by date descending
    return [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, bookieTransactions, exchangeTransactions, filter, searchQuery])

  // Filter counts
  const filterCounts = {
    all: transactions.length,
    bookies: bookieTransactions.length,
    exchanges: exchangeTransactions.length,
  }

  // Column definitions for desktop DataGrid
  const columns: GridColDef[] = [
    {
      field: 'date',
      headerName: 'Date',
      width: 110,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">{formatDate(params.value)}</Typography>
      ),
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <Typography variant="body2" noWrap>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'detectedBookie',
      headerName: 'Bookie',
      width: 150,
      renderCell: (params: GridRenderCellParams<NormalizedTransaction>) => {
        const bookie = params.value
        const isExchange = params.row.isExchange

        if (!bookie) {
          return (
            <Chip
              label="Unknown"
              size="small"
              variant="outlined"
              sx={{ opacity: 0.5 }}
            />
          )
        }

        return (
          <Chip
            label={bookie}
            size="small"
            color={isExchange ? 'secondary' : 'primary'}
            variant="filled"
          />
        )
      },
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params: GridRenderCellParams<NormalizedTransaction>) => {
        const amount = params.value as number
        const direction = params.row.direction
        const isCredit = direction === 'credit'

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {isCredit ? (
              <ArrowDownLeft size={14} color="#2e7d32" />
            ) : (
              <ArrowUpRight size={14} color="#c62828" />
            )}
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: isCredit ? 'success.main' : 'error.main',
              }}
            >
              {isCredit ? '+' : '-'}${Math.abs(amount).toFixed(2)}
            </Typography>
          </Box>
        )
      },
    },
    {
      field: 'balance',
      headerName: 'Balance',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="text.secondary">
          ${(params.value as number).toFixed(2)}
        </Typography>
      ),
    },
    {
      field: 'bookieConfidence',
      headerName: 'Match',
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => {
        const confidence = params.value as number
        if (confidence === 0) return null

        const percentage = Math.round(confidence * 100)
        let color: 'success' | 'warning' | 'error' = 'success'
        if (percentage < 80) color = 'warning'
        if (percentage < 70) color = 'error'

        return (
          <Chip
            label={`${percentage}%`}
            size="small"
            color={color}
            variant="outlined"
            sx={{ minWidth: 50 }}
          />
        )
      },
    },
    {
      field: 'reconciliationStatus',
      headerName: 'Status',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => {
        const status = params.value as string
        const colorMap: Record<string, 'success' | 'warning' | 'default'> = {
          matched: 'success',
          pending: 'warning',
          unmatched: 'default',
        }

        return (
          <Chip
            label={status}
            size="small"
            color={colorMap[status] || 'default'}
            variant="outlined"
          />
        )
      },
    },
  ]

  return (
    <Box>
      {/* Mobile Filter Bar */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
        {/* Search - Full Width on Mobile */}
        <TextField
          size="small"
          placeholder="Search transactions..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1.5 }}
        />

        {/* Filter Chips and Actions Row */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
          }}
        >
          {/* Filter Chips */}
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', flex: 1 }}>
            <FilterChip
              label="All"
              count={filterCounts.all}
              selected={filter === 'all'}
              onClick={() => setFilter('all')}
            />
            <FilterChip
              label="Bookies"
              count={filterCounts.bookies}
              selected={filter === 'bookies'}
              onClick={() => setFilter('bookies')}
            />
            <FilterChip
              label="Exchange"
              count={filterCounts.exchanges}
              selected={filter === 'exchanges'}
              onClick={() => setFilter('exchanges')}
            />
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />
            <Tooltip title="Refresh">
              <IconButton onClick={onRefresh} disabled={isLoading} size="small">
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Desktop Filter Bar */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {/* Search */}
          <TextField
            size="small"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
            sx={{ width: 250 }}
          />

          {/* Filter Chips - Desktop */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <FilterChip
              label="All"
              count={filterCounts.all}
              selected={filter === 'all'}
              onClick={() => setFilter('all')}
            />
            <FilterChip
              label="Bookies"
              count={filterCounts.bookies}
              selected={filter === 'bookies'}
              onClick={() => setFilter('bookies')}
            />
            <FilterChip
              label="Exchanges"
              count={filterCounts.exchanges}
              selected={filter === 'exchanges'}
              onClick={() => setFilter('exchanges')}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />
          <Tooltip title="Refresh transactions">
            <IconButton onClick={onRefresh} disabled={isLoading}>
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Empty State */}
      {filteredTransactions.length === 0 && !isLoading ? (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            backgroundColor: '#fafafa',
          }}
        >
          <Building2 size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No transactions found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Connect your bank and transactions will appear here'}
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Mobile: Transaction Cards */}
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            {isLoading ? (
              <Stack spacing={1.5}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
                ))}
              </Stack>
            ) : (
              <Stack spacing={1.5}>
                {filteredTransactions.map((tx) => (
                  <TransactionCard key={tx.id} transaction={tx} />
                ))}
              </Stack>
            )}
          </Box>

          {/* Desktop: Data Grid */}
          <Box sx={{ display: { xs: 'none', md: 'block' }, height: 600, width: '100%' }}>
            <DataGridPremium
              rows={filteredTransactions}
              columns={columns}
              loading={isLoading}
              disableRowSelectionOnClick
              pagination
              pageSizeOptions={[25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 50 } },
                sorting: { sortModel: [{ field: 'date', sort: 'desc' }] },
              }}
              sx={{
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid #f0f0f0',
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: '#fafafa',
                  borderBottom: '2px solid #e0e0e0',
                },
              }}
            />
          </Box>
        </>
      )}
    </Box>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

interface FilterChipProps {
  label: string
  count: number
  selected: boolean
  onClick: () => void
}

function FilterChip({ label, count, selected, onClick }: FilterChipProps) {
  return (
    <Chip
      label={`${label} (${count})`}
      size="small"
      onClick={onClick}
      sx={{
        fontWeight: selected ? 600 : 400,
        backgroundColor: selected ? 'primary.main' : 'transparent',
        color: selected ? 'white' : 'text.secondary',
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        '&:hover': {
          backgroundColor: selected ? 'primary.dark' : 'action.hover',
        },
      }}
    />
  )
}

interface TransactionCardProps {
  transaction: NormalizedTransaction
}

function TransactionCard({ transaction }: TransactionCardProps) {
  const { date, description, detectedBookie, isExchange, amount, direction } = transaction
  const isCredit = direction === 'credit'

  // Colors
  const amountColor = isCredit ? '#2e7d32' : '#c62828'
  const amountBgColor = isCredit ? '#e8f5e9' : '#ffebee'

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {/* Left: Transaction Info */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flex: 1, minWidth: 0 }}>
          {/* Icon */}
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

          {/* Details */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Bookie Name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {detectedBookie || 'Unknown'}
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
            </Box>

            {/* Description */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                mb: 0.5,
              }}
            >
              {description}
            </Typography>

            {/* Date */}
            <Typography variant="caption" color="text.secondary">
              {formatDate(date)}
            </Typography>
          </Box>
        </Box>

        {/* Right: Amount */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1.5,
            py: 0.5,
            borderRadius: 1.5,
            backgroundColor: amountBgColor,
          }}
        >
          {isCredit ? (
            <ArrowDownLeft size={14} color={amountColor} />
          ) : (
            <ArrowUpRight size={14} color={amountColor} />
          )}
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              color: amountColor,
            }}
          >
            {isCredit ? '+' : '-'}${Math.abs(amount).toFixed(2)}
          </Typography>
        </Box>
      </Box>
    </Paper>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
