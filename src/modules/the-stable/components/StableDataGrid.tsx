/**
 * The Stable DataGrid Component
 * Main bonus list with actions for turnover, expiry management
 */

import { useState, useMemo, useCallback } from 'react'
import {
  Box,
  Stack,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material'
import {
  DataGridPremium,
  GridColDef,
  GridRenderCellParams,
  GridRowParams,
  GridToolbar,
  GridActionsCellItem,
} from '@mui/x-data-grid-premium'
import {
  Check,
  X,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  Split,
} from 'lucide-react'
import dayjs from 'dayjs'
import type { Bonus, BonusStatus } from '../types'
import { BONUS_STATUS_CONFIG, BOOKIE_EXPIRY_DEFAULTS } from '../types'

interface StableDataGridProps {
  bonuses: Bonus[]
  onMarkTurnedOver: (id: string, profit?: number) => void
  onMarkExpired: (id: string) => void
  onMarkCancelled: (id: string) => void
  onUpdateBonus: (id: string, updates: Partial<Bonus>) => void
  onDeleteBonus: (id: string) => void
  onAddBonus: (params: {
    bookie: string
    amount: number
    dateEarned?: string
    expiryDate?: string
    notes?: string
  }) => void
  onSplitBonus?: (id: string, splitAmount: number) => void
}

export function StableDataGrid({
  bonuses,
  onMarkTurnedOver,
  onMarkExpired,
  onMarkCancelled,
  onUpdateBonus,
  onDeleteBonus,
  onAddBonus,
  onSplitBonus,
}: StableDataGridProps) {
  // Dialog states
  const [turnoverDialogOpen, setTurnoverDialogOpen] = useState(false)
  const [turnoverBonusId, setTurnoverBonusId] = useState<string | null>(null)
  const [turnoverProfit, setTurnoverProfit] = useState('')

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newBookie, setNewBookie] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newExpiryDate, setNewExpiryDate] = useState('')
  const [newNotes, setNewNotes] = useState('')

  // Split dialog state
  const [splitDialogOpen, setSplitDialogOpen] = useState(false)
  const [splitBonus, setSplitBonus] = useState<Bonus | null>(null)
  const [splitAmount, setSplitAmount] = useState('')

  // Filter state
  const [statusFilter, setStatusFilter] = useState<BonusStatus | 'all'>('pending')

  // Filtered bonuses
  const filteredBonuses = useMemo(() => {
    if (statusFilter === 'all') return bonuses
    return bonuses.filter((b) => b.status === statusFilter)
  }, [bonuses, statusFilter])

  // Handle turnover dialog
  const handleOpenTurnoverDialog = useCallback((bonusId: string) => {
    setTurnoverBonusId(bonusId)
    setTurnoverProfit('')
    setTurnoverDialogOpen(true)
  }, [])

  const handleConfirmTurnover = useCallback(() => {
    if (turnoverBonusId) {
      const profit = turnoverProfit ? parseFloat(turnoverProfit) : undefined
      onMarkTurnedOver(turnoverBonusId, profit)
    }
    setTurnoverDialogOpen(false)
    setTurnoverBonusId(null)
  }, [turnoverBonusId, turnoverProfit, onMarkTurnedOver])

  // Handle add dialog
  const handleOpenAddDialog = useCallback(() => {
    setNewBookie('')
    setNewAmount('')
    setNewExpiryDate('')
    setNewNotes('')
    setAddDialogOpen(true)
  }, [])

  const handleConfirmAdd = useCallback(() => {
    if (newBookie && newAmount) {
      onAddBonus({
        bookie: newBookie,
        amount: parseFloat(newAmount),
        expiryDate: newExpiryDate || undefined,
        notes: newNotes || undefined,
      })
    }
    setAddDialogOpen(false)
  }, [newBookie, newAmount, newExpiryDate, newNotes, onAddBonus])

  // Handle split dialog
  const handleOpenSplitDialog = useCallback((bonus: Bonus) => {
    setSplitBonus(bonus)
    setSplitAmount('10') // Default split amount
    setSplitDialogOpen(true)
  }, [])

  const handleConfirmSplit = useCallback(() => {
    if (splitBonus && splitAmount && onSplitBonus) {
      const amount = parseFloat(splitAmount)
      if (amount > 0 && amount < splitBonus.amount) {
        onSplitBonus(splitBonus.id, amount)
      }
    }
    setSplitDialogOpen(false)
    setSplitBonus(null)
  }, [splitBonus, splitAmount, onSplitBonus])

  // Calculate how many splits will be created
  const splitPreview = useMemo(() => {
    if (!splitBonus || !splitAmount) return null
    const amount = parseFloat(splitAmount)
    if (amount <= 0 || amount >= splitBonus.amount) return null

    const numSplits = Math.floor(splitBonus.amount / amount)
    const remainder = splitBonus.amount % amount

    return { numSplits, remainder, splitAmount: amount }
  }, [splitBonus, splitAmount])

  // Calculate days until expiry for display
  const getDaysUntilExpiry = (expiryDate: string): number => {
    return dayjs(expiryDate).diff(dayjs(), 'day')
  }

  // Column definitions
  const columns: GridColDef[] = [
    {
      field: 'bookie',
      headerName: 'Bookie',
      flex: 1,
      minWidth: 120,
      editable: true,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 100,
      type: 'number',
      editable: true,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontWeight: 600 }}>${params.value?.toFixed(0) || 0}</Typography>
      ),
    },
    {
      field: 'dateEarned',
      headerName: 'Earned',
      width: 100,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params: GridRenderCellParams) =>
        params.value ? dayjs(params.value).format('DD MMM') : '-',
    },
    {
      field: 'expiryDate',
      headerName: 'Expires',
      width: 140,
      editable: true,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params: GridRenderCellParams) => {
        if (!params.value) return '-'
        const daysLeft = getDaysUntilExpiry(params.value)
        const isUrgent = daysLeft <= 1
        const isWarning = daysLeft <= 3

        return (
          <Tooltip title={`${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                color: isUrgent ? 'error.main' : isWarning ? 'warning.main' : 'text.primary',
              }}
            >
              {isUrgent && <AlertTriangle size={14} />}
              <span>{dayjs(params.value).format('DD MMM')}</span>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                ({daysLeft}d)
              </Typography>
            </Box>
          </Tooltip>
        )
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params: GridRenderCellParams<Bonus>) => {
        const config = BONUS_STATUS_CONFIG[params.value as BonusStatus]
        return (
          <Chip
            label={config?.label || params.value}
            size="small"
            sx={{
              backgroundColor: config?.bgColor,
              color: config?.color,
              fontWeight: 500,
            }}
          />
        )
      },
    },
    {
      field: 'bonusTurnoverProfit',
      headerName: 'Bonus Profit',
      width: 110,
      type: 'number',
      headerAlign: 'center',
      align: 'center',
      renderCell: (params: GridRenderCellParams) => {
        if (params.row.status !== 'turned_over' || params.value === undefined) return '-'
        const profit = params.value as number
        return (
          <Typography
            sx={{
              color: profit >= 0 ? 'success.main' : 'error.main',
              fontWeight: 600,
            }}
          >
            {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
          </Typography>
        )
      },
    },
    {
      field: 'notes',
      headerName: 'Notes',
      flex: 1.5,
      minWidth: 180,
      editable: true,
      headerAlign: 'center',
      align: 'left',
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip title={params.value || ''}>
          <Typography
            variant="body2"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
              pl: 1,
            }}
          >
            {params.value || '-'}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      headerAlign: 'center',
      getActions: (params: GridRowParams<Bonus>) => {
        const bonus = params.row
        const actions = []

        if (bonus.status === 'pending') {
          actions.push(
            <GridActionsCellItem
              key="turnover"
              icon={
                <Tooltip title="Mark as Turned Over">
                  <Check size={18} />
                </Tooltip>
              }
              label="Turn Over"
              onClick={() => handleOpenTurnoverDialog(bonus.id)}
              color="success"
            />,
            <GridActionsCellItem
              key="split"
              icon={
                <Tooltip title="Split Bonus">
                  <Split size={18} />
                </Tooltip>
              }
              label="Split"
              onClick={() => handleOpenSplitDialog(bonus)}
              color="primary"
              disabled={bonus.amount < 10}
            />,
            <GridActionsCellItem
              key="expired"
              icon={
                <Tooltip title="Mark as Expired">
                  <X size={18} />
                </Tooltip>
              }
              label="Expired"
              onClick={() => onMarkExpired(bonus.id)}
              color="error"
            />,
            <GridActionsCellItem
              key="cancel"
              icon={
                <Tooltip title="Cancel Bonus">
                  <Trash2 size={18} />
                </Tooltip>
              }
              label="Cancel"
              onClick={() => onMarkCancelled(bonus.id)}
              color="warning"
            />
          )
        }

        actions.push(
          <GridActionsCellItem
            key="delete"
            icon={
              <Tooltip title="Delete">
                <Trash2 size={18} />
              </Tooltip>
            }
            label="Delete"
            onClick={() => onDeleteBonus(bonus.id)}
            color="error"
          />
        )

        return actions
      },
    },
  ]

  // Handle cell edit
  const handleProcessRowUpdate = useCallback(
    (newRow: Bonus, oldRow: Bonus) => {
      const updates: Partial<Bonus> = {}
      if (newRow.bookie !== oldRow.bookie) updates.bookie = newRow.bookie
      if (newRow.amount !== oldRow.amount) updates.amount = newRow.amount
      if (newRow.expiryDate !== oldRow.expiryDate) updates.expiryDate = newRow.expiryDate
      if (newRow.notes !== oldRow.notes) updates.notes = newRow.notes

      if (Object.keys(updates).length > 0) {
        onUpdateBonus(newRow.id, updates)
      }
      return newRow
    },
    [onUpdateBonus]
  )

  return (
    <Box>
      {/* Toolbar */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value as BonusStatus | 'all')}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="turned_over">Turned Over</MenuItem>
            <MenuItem value="expired">Expired</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        <Button variant="contained" startIcon={<Plus size={18} />} onClick={handleOpenAddDialog}>
          Add Bonus
        </Button>
      </Stack>

      {/* Data Grid */}
      <DataGridPremium
        rows={filteredBonuses}
        columns={columns}
        processRowUpdate={handleProcessRowUpdate}
        autoHeight
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50]}
        rowHeight={48}
        columnHeaderHeight={48}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
          sorting: {
            sortModel: [{ field: 'expiryDate', sort: 'asc' }],
          },
        }}
        sx={{
          border: 'none',
          borderRadius: 2,
          backgroundColor: '#fff',
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '0.875rem',

          // Header styling
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 600,
            fontSize: '0.75rem',
            color: '#374151',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
          '& .MuiDataGrid-columnSeparator': {
            display: 'none',
          },

          // Row styling
          '& .MuiDataGrid-row': {
            borderBottom: '1px solid #f3f4f6',
            '&:hover': {
              backgroundColor: '#f9fafb',
            },
          },

          // Cell styling
          '& .MuiDataGrid-cell': {
            borderBottom: 'none',
            fontSize: '0.875rem',
            color: '#1f2937',
            '&:focus': {
              outline: '2px solid #3b82f6',
              outlineOffset: '-2px',
            },
          },

          // Footer styling
          '& .MuiDataGrid-footerContainer': {
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
          },

          // Remove focus ring on column header
          '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
            outline: 'none',
          },
        }}
      />

      {/* Turnover Dialog */}
      <Dialog open={turnoverDialogOpen} onClose={() => setTurnoverDialogOpen(false)}>
        <DialogTitle>Mark Bonus as Turned Over</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Bonus Profit"
            type="number"
            fullWidth
            value={turnoverProfit}
            onChange={(e) => setTurnoverProfit(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
            helperText="Net profit after Betfair commission and any losses"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTurnoverDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmTurnover} variant="contained" color="success">
            Confirm Turnover
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Bonus Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Manual Bonus</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Bookie</InputLabel>
              <Select
                value={newBookie}
                label="Bookie"
                onChange={(e) => setNewBookie(e.target.value)}
              >
                {Object.keys(BOOKIE_EXPIRY_DEFAULTS).map((bookie) => (
                  <MenuItem key={bookie} value={bookie}>
                    {bookie}
                  </MenuItem>
                ))}
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>

            {newBookie === 'Other' && (
              <TextField
                label="Bookie Name"
                fullWidth
                value={newBookie === 'Other' ? '' : newBookie}
                onChange={(e) => setNewBookie(e.target.value)}
              />
            )}

            <TextField
              label="Bonus Amount"
              type="number"
              fullWidth
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />

            <TextField
              label="Expiry Date"
              type="date"
              fullWidth
              value={newExpiryDate}
              onChange={(e) => setNewExpiryDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText={
                newBookie && newBookie !== 'Other'
                  ? `Default: ${BOOKIE_EXPIRY_DEFAULTS[newBookie] || 7} days from today`
                  : ''
              }
            />

            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={2}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmAdd}
            variant="contained"
            disabled={!newBookie || !newAmount}
          >
            Add Bonus
          </Button>
        </DialogActions>
      </Dialog>

      {/* Split Bonus Dialog */}
      <Dialog open={splitDialogOpen} onClose={() => setSplitDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Split Bonus</DialogTitle>
        <DialogContent>
          {splitBonus && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box sx={{ p: 2, backgroundColor: '#f9fafb', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Current bonus
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {splitBonus.bookie} - ${splitBonus.amount}
                </Typography>
              </Box>

              <TextField
                label="Split into amounts of"
                type="number"
                fullWidth
                value={splitAmount}
                onChange={(e) => setSplitAmount(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                helperText="Enter the amount for each split bonus"
              />

              {splitPreview && (
                <Box sx={{ p: 2, backgroundColor: '#eff6ff', borderRadius: 1, border: '1px solid #bfdbfe' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e40af', mb: 1 }}>
                    Preview
                  </Typography>
                  <Typography variant="body2">
                    This will create <strong>{splitPreview.numSplits}</strong> bonus{splitPreview.numSplits !== 1 ? 'es' : ''} of{' '}
                    <strong>${splitPreview.splitAmount}</strong> each
                    {splitPreview.remainder > 0 && (
                      <> + <strong>1</strong> bonus of <strong>${splitPreview.remainder.toFixed(2)}</strong></>
                    )}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Total: ${(splitPreview.numSplits * splitPreview.splitAmount + splitPreview.remainder).toFixed(2)}
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSplitDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmSplit}
            variant="contained"
            disabled={!splitPreview}
            startIcon={<Split size={18} />}
          >
            Split Bonus
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
