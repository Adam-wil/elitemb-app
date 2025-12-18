'use client'

import { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import { DataGridPremium, GridColDef, GridRenderCellParams } from '@mui/x-data-grid-premium'
import {
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  CircleDot,
} from 'lucide-react'
import type { BookiePLRow, BonusCredit } from '../types'
import { BonusCreditDialog } from './BonusCreditDialog'
import { ManualOverrideDialog } from './ManualOverrideDialog'

// ============================================================================
// Types
// ============================================================================

interface RacingPLTabProps {
  plRows: BookiePLRow[]
  totalProfit: number
  totalBalance: number
  totalBonusBalance: number
  bonusCredits: BonusCredit[]
  onAddBonusCredit: (credit: {
    bookieId: string
    bookieName: string
    amount: number
    date: string
    notes: string
  }) => void
  onRemoveBonusCredit: (id: string) => void
  onSetOverride: (bookieId: string, value: number, reason?: string) => void
  onClearOverride: (bookieId: string) => void
}

// ============================================================================
// Component
// ============================================================================

export function RacingPLTab({
  plRows,
  totalProfit,
  totalBalance,
  totalBonusBalance,
  bonusCredits,
  onAddBonusCredit,
  onRemoveBonusCredit,
  onSetOverride,
  onClearOverride,
}: RacingPLTabProps) {
  const [bonusDialogOpen, setBonusDialogOpen] = useState(false)
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false)
  const [selectedBookie, setSelectedBookie] = useState<BookiePLRow | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; row: BookiePLRow } | null>(null)

  // Row menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, row: BookiePLRow) => {
    event.stopPropagation()
    setMenuAnchor({ el: event.currentTarget, row })
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
  }

  const handleOverrideClick = () => {
    if (menuAnchor) {
      setSelectedBookie(menuAnchor.row)
      setOverrideDialogOpen(true)
    }
    handleMenuClose()
  }

  const handleClearOverrideClick = () => {
    if (menuAnchor) {
      onClearOverride(menuAnchor.row.bookieId)
    }
    handleMenuClose()
  }

  // Column definitions
  const columns: GridColDef[] = [
    {
      field: 'bookieName',
      headerName: 'Bookie',
      flex: 1,
      minWidth: 140,
      renderCell: (params: GridRenderCellParams<BookiePLRow>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircleDot
            size={12}
            fill={params.row.isProfitable ? '#2e7d32' : '#c62828'}
            color={params.row.isProfitable ? '#2e7d32' : '#c62828'}
          />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'balance',
      headerName: 'Balance',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<BookiePLRow>) => {
        const hasOverride = params.row.manualOverride !== null
        const displayValue = hasOverride ? params.row.manualOverride : params.value

        return (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              color: displayValue >= 0 ? 'success.main' : 'error.main',
              fontStyle: hasOverride ? 'italic' : 'normal',
            }}
          >
            ${(displayValue as number).toFixed(2)}
            {hasOverride && ' *'}
          </Typography>
        )
      },
    },
    {
      field: 'manualOverride',
      headerName: 'Override',
      width: 110,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<BookiePLRow>) => {
        if (params.value === null) {
          return (
            <Typography variant="body2" color="text.secondary">
              -
            </Typography>
          )
        }
        return (
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            ${(params.value as number).toFixed(2)}
          </Typography>
        )
      },
    },
    {
      field: 'bonusBalance',
      headerName: 'Bonus Bal',
      width: 110,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="info.main">
          ${(params.value as number).toFixed(2)}
        </Typography>
      ),
    },
    {
      field: 'depositCount',
      headerName: '# Dep',
      width: 80,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'depositAmount',
      headerName: 'Amt Dep',
      width: 110,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">${(params.value as number).toFixed(2)}</Typography>
      ),
    },
    {
      field: 'withdrawalCount',
      headerName: '# With',
      width: 80,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'withdrawalAmount',
      headerName: 'Amt With',
      width: 110,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">${(params.value as number).toFixed(2)}</Typography>
      ),
    },
    {
      field: 'netCash',
      headerName: 'Net Cash',
      width: 110,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: (params.value as number) >= 0 ? 'success.main' : 'error.main',
          }}
        >
          ${(params.value as number).toFixed(2)}
        </Typography>
      ),
    },
    {
      field: 'netBonus',
      headerName: 'Net Bonus',
      width: 110,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: (params.value as number) >= 0 ? 'info.main' : 'error.main',
          }}
        >
          ${(params.value as number).toFixed(2)}
        </Typography>
      ),
    },
    {
      field: 'totalProfit',
      headerName: 'Total P&L',
      width: 130,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<BookiePLRow>) => {
        const value = params.value as number
        const isPositive = value > 0
        const isNegative = value < 0

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {isPositive && <TrendingUp size={14} color="#2e7d32" />}
            {isNegative && <TrendingDown size={14} color="#c62828" />}
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                color: isPositive ? 'success.main' : isNegative ? 'error.main' : 'text.primary',
              }}
            >
              {isPositive ? '+' : ''}${value.toFixed(2)}
            </Typography>
          </Box>
        )
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: (params: GridRenderCellParams<BookiePLRow>) => (
        <IconButton size="small" onClick={e => handleMenuOpen(e, params.row)}>
          <MoreVertical size={16} />
        </IconButton>
      ),
    },
  ]

  // Get row ID
  const getRowId = (row: BookiePLRow) => row.bookieId


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
            Racing P&L Statement
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bookmaker balances and profit/loss tracking - automatically calculated from bet tracker
            results
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Total P&L Display */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1.5,
              py: 0.75,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Total P&L
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                color: 'text.primary',
              }}
            >
              {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
            </Typography>
          </Box>

          {/* Add Bonus Credit Button */}
          <Button
            variant="outlined"
            startIcon={<Plus size={18} />}
            onClick={() => setBonusDialogOpen(true)}
          >
            Add Bonus Credit
          </Button>
        </Box>
      </Box>

      {/* Data Grid */}
      <Box sx={{ height: 500, width: '100%' }}>
        <DataGridPremium
          rows={plRows}
          columns={columns}
          getRowId={getRowId}
          disableRowSelectionOnClick
          hideFooter={plRows.length <= 25}
          sx={{
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
            '& .MuiDataGrid-cell[data-field="bookieName"]': {
              justifyContent: 'flex-start',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#fafafa',
              borderBottom: '2px solid #e0e0e0',
            },
          }}
        />
      </Box>

      {/* Totals Row */}
      <Paper sx={{ mt: 2, p: 2, backgroundColor: '#fafafa' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            TOTALS
          </Typography>
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary">
                Balance
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                ${totalBalance.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary">
                Bonus Balance
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, color: 'info.main' }}>
                ${totalBonusBalance.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary">
                Total Profit
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 700,
                  color: totalProfit >= 0 ? 'success.main' : 'error.main',
                }}
              >
                {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Legend */}
      <Box sx={{ mt: 2, display: 'flex', gap: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircleDot size={12} fill="#2e7d32" color="#2e7d32" />
          <Typography variant="caption" color="text.secondary">
            Profit
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircleDot size={12} fill="#c62828" color="#c62828" />
          <Typography variant="caption" color="text.secondary">
            Loss
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            * Manual Override Active
          </Typography>
        </Box>
      </Box>

      {/* Row Menu */}
      <Menu anchorEl={menuAnchor?.el} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={handleOverrideClick}>
          <ListItemIcon>
            <Edit2 size={16} />
          </ListItemIcon>
          <ListItemText>Set Balance Override</ListItemText>
        </MenuItem>
        {menuAnchor?.row.manualOverride !== null && (
          <MenuItem onClick={handleClearOverrideClick}>
            <ListItemIcon>
              <Trash2 size={16} />
            </ListItemIcon>
            <ListItemText>Clear Override</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Bonus Credit Dialog */}
      <BonusCreditDialog
        open={bonusDialogOpen}
        onClose={() => setBonusDialogOpen(false)}
        onAdd={onAddBonusCredit}
      />

      {/* Manual Override Dialog */}
      {selectedBookie && (
        <ManualOverrideDialog
          open={overrideDialogOpen}
          onClose={() => {
            setOverrideDialogOpen(false)
            setSelectedBookie(null)
          }}
          bookieName={selectedBookie.bookieName}
          currentBalance={selectedBookie.balance}
          currentOverride={selectedBookie.manualOverride}
          onSave={(value, reason) => {
            onSetOverride(selectedBookie.bookieId, value, reason)
            setOverrideDialogOpen(false)
            setSelectedBookie(null)
          }}
        />
      )}
    </Box>
  )
}
