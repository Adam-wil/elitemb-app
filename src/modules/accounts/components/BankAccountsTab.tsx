'use client'

import { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material'
import { DataGridPremium, GridColDef, GridRenderCellParams } from '@mui/x-data-grid-premium'
import { Search, RefreshCw, Calendar, Building2, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
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

    return data
  }, [transactions, bookieTransactions, exchangeTransactions, filter, searchQuery])

  // Column definitions
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
      {/* Filters Bar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          flexWrap: 'wrap',
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

          {/* Type Filter */}
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, value) => value && setFilter(value)}
            size="small"
          >
            <ToggleButton value="all">
              All ({transactions.length})
            </ToggleButton>
            <ToggleButton value="bookies">
              Bookies ({bookieTransactions.length})
            </ToggleButton>
            <ToggleButton value="exchanges">
              Exchanges ({exchangeTransactions.length})
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Date Range */}
          <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />

          {/* Refresh */}
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
        /* Data Grid */
        <Box sx={{ height: 600, width: '100%' }}>
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
      )}
    </Box>
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
