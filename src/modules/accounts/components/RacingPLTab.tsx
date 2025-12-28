'use client'

import { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
  Chip,
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
  Gift,
  X,
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
  }) => void | Promise<unknown>
  onRemoveBonusCredit: (id: string) => void | Promise<boolean>
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
  const [manageBonusDialogOpen, setManageBonusDialogOpen] = useState(false)
  const [selectedBookie, setSelectedBookie] = useState<BookiePLRow | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; row: BookiePLRow } | null>(null)

  // Get bonus credits for selected bookie
  const selectedBookieBonusCredits = selectedBookie
    ? bonusCredits.filter(bc => bc.bookieId === selectedBookie.bookieId)
    : []

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

  const handleManageBonusClick = () => {
    if (menuAnchor) {
      setSelectedBookie(menuAnchor.row)
      setManageBonusDialogOpen(true)
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
      {/* Mobile Header */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
            Racing P&L
          </Typography>
          <IconButton
            size="small"
            onClick={() => setBonusDialogOpen(true)}
            sx={{ backgroundColor: 'action.hover' }}
          >
            <Plus size={18} />
          </IconButton>
        </Box>

        {/* Mobile Summary Cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
          }}
        >
          <Paper sx={{ p: 1.5, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Balance
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              ${totalBalance.toFixed(0)}
            </Typography>
          </Paper>
          <Paper sx={{ p: 1.5, textAlign: 'center', backgroundColor: '#e3f2fd' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Bonus
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'info.main' }}>
              ${totalBonusBalance.toFixed(0)}
            </Typography>
          </Paper>
          <Paper
            sx={{
              p: 1.5,
              textAlign: 'center',
              backgroundColor: totalProfit >= 0 ? '#e8f5e9' : '#ffebee',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              P&L
            </Typography>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, color: totalProfit >= 0 ? 'success.main' : 'error.main' }}
            >
              {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(0)}
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* Desktop Header */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
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

      {/* Mobile: Bookie P&L Cards */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        {plRows.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: '#fafafa' }}>
            <CircleDot size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <Typography variant="body1" color="text.secondary">
              No P&L data available
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Data will appear after syncing transactions
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {plRows.map((row) => (
              <BookiePLCard
                key={row.bookieId}
                row={row}
                onMenuOpen={handleMenuOpen}
              />
            ))}
          </Stack>
        )}
      </Box>

      {/* Desktop: Data Grid */}
      <Box sx={{ display: { xs: 'none', md: 'block' }, height: 500, width: '100%' }}>
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

      {/* Desktop Totals Row */}
      <Paper sx={{ display: { xs: 'none', md: 'block' }, mt: 2, p: 2, backgroundColor: '#fafafa' }}>
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

      {/* Desktop Legend */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, mt: 2, gap: 3 }}>
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
        <MenuItem onClick={handleManageBonusClick}>
          <ListItemIcon>
            <Gift size={16} />
          </ListItemIcon>
          <ListItemText>
            Manage Bonus Credits
            {menuAnchor?.row.bonusBalance ? (
              <Chip
                label={bonusCredits.filter(bc => bc.bookieId === menuAnchor.row.bookieId).length}
                size="small"
                sx={{ ml: 1, height: 18, fontSize: '0.7rem' }}
              />
            ) : null}
          </ListItemText>
        </MenuItem>
        <Divider />
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

      {/* Manage Bonus Credits Dialog */}
      <ManageBonusCreditsDialog
        open={manageBonusDialogOpen}
        onClose={() => {
          setManageBonusDialogOpen(false)
          setSelectedBookie(null)
        }}
        bookieName={selectedBookie?.bookieName ?? ''}
        bonusCredits={selectedBookieBonusCredits}
        onDelete={onRemoveBonusCredit}
      />
    </Box>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

interface BookiePLCardProps {
  row: BookiePLRow
  onMenuOpen: (event: React.MouseEvent<HTMLButtonElement>, row: BookiePLRow) => void
}

function BookiePLCard({ row, onMenuOpen }: BookiePLCardProps) {
  const {
    bookieName,
    balance,
    bonusBalance,
    totalProfit,
    isProfitable,
    manualOverride,
    depositCount,
    withdrawalCount,
  } = row

  const displayBalance = manualOverride !== null ? manualOverride : balance
  const hasOverride = manualOverride !== null

  // Colors
  const plColor = isProfitable ? '#2e7d32' : '#c62828'
  const plBgColor = isProfitable ? '#e8f5e9' : '#ffebee'

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Top Row: Bookie Name + Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircleDot
            size={12}
            fill={isProfitable ? '#2e7d32' : '#c62828'}
            color={isProfitable ? '#2e7d32' : '#c62828'}
          />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {bookieName}
          </Typography>
          {hasOverride && (
            <Typography variant="caption" color="warning.main" sx={{ fontStyle: 'italic' }}>
              *
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={(e) => onMenuOpen(e, row)}>
          <MoreVertical size={16} />
        </IconButton>
      </Box>

      {/* Middle Row: Key Metrics */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary">
            Balance
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: displayBalance >= 0 ? 'text.primary' : 'error.main',
              fontStyle: hasOverride ? 'italic' : 'normal',
            }}
          >
            ${displayBalance.toFixed(2)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Bonus
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500, color: 'info.main' }}>
            ${bonusBalance.toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary">
            Transactions
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {depositCount + withdrawalCount}
          </Typography>
        </Box>
      </Box>

      {/* Bottom Row: Total P&L Badge */}
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1.5,
          py: 0.5,
          borderRadius: 1.5,
          backgroundColor: plBgColor,
        }}
      >
        {isProfitable ? (
          <TrendingUp size={14} color={plColor} />
        ) : (
          <TrendingDown size={14} color={plColor} />
        )}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            color: plColor,
          }}
        >
          {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)} P&L
        </Typography>
      </Box>
    </Paper>
  )
}

// ============================================================================
// Manage Bonus Credits Dialog
// ============================================================================

interface ManageBonusCreditsDialogProps {
  open: boolean
  onClose: () => void
  bookieName: string
  bonusCredits: BonusCredit[]
  onDelete: (id: string) => void
}

function ManageBonusCreditsDialog({
  open,
  onClose,
  bookieName,
  bonusCredits,
  onDelete,
}: ManageBonusCreditsDialogProps) {
  const totalBonus = bonusCredits.reduce((sum, bc) => sum + bc.amount, 0)

  const handleDelete = (id: string) => {
    onDelete(id)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Gift size={20} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Bonus Credits
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {bookieName}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {bonusCredits.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Gift size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <Typography variant="body1" color="text.secondary">
              No bonus credits
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Add bonus credits using the + button
            </Typography>
          </Box>
        ) : (
          <>
            {/* Total Summary */}
            <Paper
              sx={{
                p: 2,
                mb: 2,
                backgroundColor: '#e3f2fd',
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Total Bonus Balance
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'info.main' }}>
                ${totalBonus.toFixed(2)}
              </Typography>
            </Paper>

            {/* Credit List */}
            <Stack spacing={1.5}>
              {bonusCredits.map((credit) => (
                <Paper
                  key={credit.id}
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
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'info.main' }}>
                          +${credit.amount.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(credit.date)}
                        </Typography>
                      </Box>
                      {credit.notes && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          {credit.notes}
                        </Typography>
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(credit.id)}
                      sx={{
                        color: 'error.main',
                        '&:hover': { backgroundColor: '#ffebee' },
                      }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </Box>
                </Paper>
              ))}
            </Stack>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
