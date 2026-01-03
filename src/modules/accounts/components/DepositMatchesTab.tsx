'use client'

import { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Stack,
  Chip,
  Skeleton,
  Alert,
} from '@mui/material'
import { DataGridPremium, GridColDef, GridRenderCellParams } from '@mui/x-data-grid-premium'
import { Plus, Trash2, Gift, RefreshCw } from 'lucide-react'
import { useDepositMatches } from '../hooks/useDepositMatches'
import type { DepositMatchRecord } from '../api/db/depositMatchDb.server'
import { DepositMatchDialog } from './DepositMatchDialog'

// ============================================================================
// Component
// ============================================================================

export function DepositMatchesTab() {
  const [dialogOpen, setDialogOpen] = useState(false)

  const {
    depositMatches,
    isLoading,
    error,
    addDepositMatch,
    removeDepositMatch,
    getGrandTotal,
    bookieSummaries,
    refresh,
  } = useDepositMatches()

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Handle add
  const handleAdd = async (data: {
    bookieId: number
    bookieName: string
    amount: number
    date: string
    notes?: string
  }) => {
    await addDepositMatch(data)
    setDialogOpen(false)
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    await removeDepositMatch(id)
  }

  // Column definitions for credits table
  const columns: GridColDef[] = [
    {
      field: 'bookieName',
      headerName: 'Bookie',
      flex: 1,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams<DepositMatchRecord>) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'date',
      headerName: 'Date',
      width: 120,
      renderCell: (params: GridRenderCellParams<DepositMatchRecord>) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(params.value as string)}
        </Typography>
      ),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 110,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params: GridRenderCellParams<DepositMatchRecord>) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
          +${(params.value as number).toFixed(2)}
        </Typography>
      ),
    },
    {
      field: 'notes',
      headerName: 'Notes',
      flex: 1.5,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams<DepositMatchRecord>) => (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
          {params.value || '-'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: (params: GridRenderCellParams<DepositMatchRecord>) => (
        <IconButton
          size="small"
          onClick={() => handleDelete(params.row.id)}
          sx={{ color: 'error.main', '&:hover': { backgroundColor: '#ffebee' } }}
        >
          <Trash2 size={16} />
        </IconButton>
      ),
    },
  ]

  // Loading state
  if (isLoading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Skeleton width={200} height={32} />
            <Skeleton width={300} height={20} />
          </Box>
          <Skeleton width={120} height={40} />
        </Box>
        <Skeleton height={200} />
      </Box>
    )
  }

  // Error state
  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={refresh} startIcon={<RefreshCw size={16} />}>
          Retry
        </Button>
      </Box>
    )
  }

  const grandTotal = getGrandTotal()

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            Deposit Match Bonuses
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track sign-up offers, deposit matches, and reload bonuses per bookie
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Grand Total */}
          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              gap: 0.75,
              px: 1.5,
              py: 0.75,
              backgroundColor: '#e8f5e9',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Total Received
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, color: 'success.main' }}>
              ${grandTotal.toFixed(2)}
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={<Plus size={18} />}
            onClick={() => setDialogOpen(true)}
          >
            Add Bonus
          </Button>
        </Box>
      </Box>

      {/* Mobile Total */}
      <Paper
        sx={{
          display: { xs: 'block', sm: 'none' },
          p: 2,
          mb: 2,
          backgroundColor: '#e8f5e9',
          textAlign: 'center',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Total Received
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
          ${grandTotal.toFixed(2)}
        </Typography>
      </Paper>

      {/* Per-Bookie Summary Cards */}
      {bookieSummaries.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
            By Bookie
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            {bookieSummaries.map((summary) => (
              <Paper
                key={summary.bookieId}
                sx={{
                  px: 2,
                  py: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Gift size={16} style={{ color: '#0288d1' }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {summary.bookieName}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                    ${summary.totalAmount.toFixed(2)}
                  </Typography>
                </Box>
                <Chip label={summary.count} size="small" sx={{ height: 20 }} />
              </Paper>
            ))}
          </Box>
        </Box>
      )}

      {/* Empty State */}
      {depositMatches.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: '#fafafa' }}>
          <Gift size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            No deposit match bonuses recorded
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add sign-up bonuses, deposit matches, and reload offers to track their value
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => setDialogOpen(true)}
          >
            Add First Bonus
          </Button>
        </Paper>
      ) : (
        <>
          {/* Mobile: Cards */}
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            <Stack spacing={1.5}>
              {depositMatches.map((match) => (
                <Paper
                  key={match.id}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {match.bookieName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(match.date)}
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: 'success.main', mb: 0.5 }}>
                        +${match.amount.toFixed(2)}
                      </Typography>
                      {match.notes && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                          {match.notes}
                        </Typography>
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(match.id)}
                      sx={{ color: 'error.main', '&:hover': { backgroundColor: '#ffebee' } }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </Box>
                </Paper>
              ))}
            </Stack>
          </Box>

          {/* Desktop: Data Grid */}
          <Box sx={{ display: { xs: 'none', md: 'block' }, height: 400 }}>
            <DataGridPremium
              rows={depositMatches}
              columns={columns}
              getRowId={(row) => row.id}
              disableRowSelectionOnClick
              hideFooter={depositMatches.length <= 25}
              initialState={{
                sorting: {
                  sortModel: [{ field: 'date', sort: 'desc' }],
                },
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

      {/* Add Deposit Match Dialog */}
      <DepositMatchDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={handleAdd}
      />
    </Box>
  )
}
