'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Chip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Switch,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Collapse,
  useTheme,
  useMediaQuery,
  InputAdornment,
} from '@mui/material'
import { Edit2, Save, X, Info, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { DataGridPro, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid-pro'
import {
  getAllBookiesWithHealth,
  upsertRatioConfig,
  updateBookieStatus,
} from '@/modules/the-furlong/api/db/bookieHealthDb.server'
import type {
  RatioTimeWindow,
  BookieAccountStatus,
} from '@/modules/the-furlong/types/bookieHealth'
import {
  BOOKIE_STATUS_CONFIG,
  TIME_WINDOW_CONFIG,
} from '@/modules/the-furlong/types/bookieHealth'

// ============================================================================
// Types
// ============================================================================

interface BookieWithHealth {
  id: number
  name: string
  promoVolume: string | null
  banRisk: string | null
  statDecRisk: string | null
  ratioConfig: {
    id: string
    promoRatio: number
    nonPromoRatio: number
    timeWindow: string
    status: string
    statusNotes: string | null
    statusChangedAt: string | null
    warningThreshold: number
    exceededThreshold: number
    isEnabled: boolean
  } | null
}

// ============================================================================
// Status Dialog Component
// ============================================================================

interface StatusDialogProps {
  open: boolean
  bookie: BookieWithHealth | null
  onClose: () => void
  onSave: (bookieId: number, status: BookieAccountStatus, notes?: string) => Promise<void>
}

function BookieStatusDialog({ open, bookie, onClose, onSave }: StatusDialogProps) {
  const [status, setStatus] = useState<BookieAccountStatus>('PROMO_ELIGIBLE')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (bookie?.ratioConfig) {
      setStatus(bookie.ratioConfig.status as BookieAccountStatus)
      setNotes(bookie.ratioConfig.statusNotes || '')
    } else {
      setStatus('PROMO_ELIGIBLE')
      setNotes('')
    }
  }, [bookie])

  const handleSave = async () => {
    if (!bookie) return
    setSaving(true)
    try {
      await onSave(bookie.id, status, notes || undefined)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Update Status: {bookie?.name}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Account Status</InputLabel>
            <Select
              value={status}
              label="Account Status"
              onChange={(e) => setStatus(e.target.value as BookieAccountStatus)}
            >
              {Object.entries(BOOKIE_STATUS_CONFIG).map(([key, config]) => (
                <MenuItem key={key} value={key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={config.label}
                      size="small"
                      color={config.color}
                      sx={{ minWidth: 100 }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                      {config.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Notes"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this account status..."
            fullWidth
          />

          {bookie?.ratioConfig?.statusChangedAt && (
            <Typography variant="caption" color="text.secondary">
              Last changed: {new Date(bookie.ratioConfig.statusChangedAt).toLocaleString()}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ============================================================================
// Mobile Card Component
// ============================================================================

interface BookieCardProps {
  bookie: BookieWithHealth
  onRatioUpdate: (bookieId: number, promoRatio: number, nonPromoRatio: number) => void
  onTimeWindowUpdate: (bookieId: number, timeWindow: RatioTimeWindow) => void
  onEnabledToggle: (bookieId: number, isEnabled: boolean) => void
  onStatusClick: (bookie: BookieWithHealth) => void
}

function BookieCard({
  bookie,
  onRatioUpdate,
  onTimeWindowUpdate,
  onEnabledToggle,
  onStatusClick,
}: BookieCardProps) {
  const [expanded, setExpanded] = useState(false)
  const config = bookie.ratioConfig
  const status = (config?.status || 'PROMO_ELIGIBLE') as BookieAccountStatus
  const statusConfig = BOOKIE_STATUS_CONFIG[status]
  const isEnabled = config?.isEnabled ?? true

  return (
    <Card
      sx={{
        mb: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
        opacity: isEnabled ? 1 : 0.6,
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header Row */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {bookie.name}
            </Typography>
            <Chip
              label={statusConfig.label}
              size="small"
              color={statusConfig.color}
              onClick={() => onStatusClick(bookie)}
              sx={{ cursor: 'pointer' }}
            />
          </Box>
          <Switch
            checked={isEnabled}
            onChange={(e) => onEnabledToggle(bookie.id, e.target.checked)}
            size="small"
          />
        </Box>

        {/* Main Controls Row */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Ratio Editor */}
          <Box sx={{ flex: '1 1 auto', minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Ratio (Promo : Non-Promo)
            </Typography>
            <MobileRatioEditor
              promoRatio={config?.promoRatio || 1}
              nonPromoRatio={config?.nonPromoRatio || 3}
              onSave={(p, n) => onRatioUpdate(bookie.id, p, n)}
            />
          </Box>

          {/* Time Window */}
          <Box sx={{ flex: '1 1 auto', minWidth: 120 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Time Window
            </Typography>
            <Select
              value={(config?.timeWindow || 'WEEKLY') as RatioTimeWindow}
              size="small"
              onChange={(e) => onTimeWindowUpdate(bookie.id, e.target.value as RatioTimeWindow)}
              fullWidth
              sx={{ fontSize: '0.875rem' }}
            >
              {Object.entries(TIME_WINDOW_CONFIG).map(([key, cfg]) => (
                <MenuItem key={key} value={key}>
                  {cfg.label}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </Box>

        {/* Expand Button */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mt: 1.5,
            pt: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            cursor: 'pointer',
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
            {expanded ? 'Less' : 'More details'}
          </Typography>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Box>

        {/* Expanded Details */}
        <Collapse in={expanded}>
          <Box sx={{ mt: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Promo Volume</Typography>
                <Typography variant="body2" sx={{ color: getVolumeColor(bookie.promoVolume) }}>
                  {bookie.promoVolume || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Ban Risk</Typography>
                <Typography variant="body2" sx={{ color: getRiskColor(bookie.banRisk) }}>
                  {bookie.banRisk || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Stat Dec Risk</Typography>
                <Typography variant="body2" sx={{ color: getRiskColor(bookie.statDecRisk) }}>
                  {bookie.statDecRisk || '-'}
                </Typography>
              </Box>
            </Box>
            {config?.statusNotes && (
              <Box>
                <Typography variant="caption" color="text.secondary">Notes</Typography>
                <Typography variant="body2">{config.statusNotes}</Typography>
              </Box>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  )
}

// Helper functions for colors
function getVolumeColor(volume: string | null): string {
  const colorMap: Record<string, string> = {
    HIGH: '#2e7d32',
    MEDIUM: '#ed6c02',
    LOW: '#9e9e9e',
  }
  return colorMap[volume || ''] || '#616161'
}

function getRiskColor(risk: string | null): string {
  const colorMap: Record<string, string> = {
    HIGH: '#c62828',
    MEDIUM: '#ed6c02',
    LOW: '#2e7d32',
  }
  return colorMap[risk || ''] || '#616161'
}

// ============================================================================
// Mobile Ratio Editor
// ============================================================================

interface MobileRatioEditorProps {
  promoRatio: number
  nonPromoRatio: number
  onSave: (promoRatio: number, nonPromoRatio: number) => void
}

function MobileRatioEditor({ promoRatio, nonPromoRatio, onSave }: MobileRatioEditorProps) {
  const [editing, setEditing] = useState(false)
  const [promo, setPromo] = useState(promoRatio)
  const [nonPromo, setNonPromo] = useState(nonPromoRatio)

  const handleSave = () => {
    onSave(promo, nonPromo)
    setEditing(false)
  }

  const handleCancel = () => {
    setPromo(promoRatio)
    setNonPromo(nonPromoRatio)
    setEditing(false)
  }

  if (editing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          type="number"
          value={promo}
          onChange={(e) => setPromo(parseInt(e.target.value) || 1)}
          size="small"
          sx={{ width: 60 }}
          inputProps={{ min: 1, style: { textAlign: 'center', padding: '8px' } }}
        />
        <Typography variant="body1" fontWeight={600}>:</Typography>
        <TextField
          type="number"
          value={nonPromo}
          onChange={(e) => setNonPromo(parseInt(e.target.value) || 1)}
          size="small"
          sx={{ width: 60 }}
          inputProps={{ min: 1, style: { textAlign: 'center', padding: '8px' } }}
        />
        <IconButton size="small" onClick={handleSave} color="primary">
          <Save size={18} />
        </IconButton>
        <IconButton size="small" onClick={handleCancel}>
          <X size={18} />
        </IconButton>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        cursor: 'pointer',
        bgcolor: 'grey.100',
        px: 2,
        py: 1,
        borderRadius: 1,
        '&:hover': { bgcolor: 'grey.200' },
      }}
      onClick={() => setEditing(true)}
    >
      <Typography variant="body1" fontWeight={600}>
        {promoRatio} : {nonPromoRatio}
      </Typography>
      <Edit2 size={16} color="#666" />
    </Box>
  )
}

// ============================================================================
// Desktop Ratio Editor (wider fields)
// ============================================================================

interface RatioEditorProps {
  promoRatio: number
  nonPromoRatio: number
  onSave: (promoRatio: number, nonPromoRatio: number) => void
}

function RatioEditor({ promoRatio, nonPromoRatio, onSave }: RatioEditorProps) {
  const [editing, setEditing] = useState(false)
  const [promo, setPromo] = useState(promoRatio)
  const [nonPromo, setNonPromo] = useState(nonPromoRatio)

  const handleSave = () => {
    onSave(promo, nonPromo)
    setEditing(false)
  }

  const handleCancel = () => {
    setPromo(promoRatio)
    setNonPromo(nonPromoRatio)
    setEditing(false)
  }

  if (editing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <TextField
          type="number"
          value={promo}
          onChange={(e) => setPromo(parseInt(e.target.value) || 1)}
          size="small"
          sx={{ width: 56 }}
          inputProps={{ min: 1, style: { textAlign: 'center', padding: '6px 4px', fontSize: '0.875rem' } }}
        />
        <Typography variant="body2" fontWeight={600}>:</Typography>
        <TextField
          type="number"
          value={nonPromo}
          onChange={(e) => setNonPromo(parseInt(e.target.value) || 1)}
          size="small"
          sx={{ width: 56 }}
          inputProps={{ min: 1, style: { textAlign: 'center', padding: '6px 4px', fontSize: '0.875rem' } }}
        />
        <IconButton size="small" onClick={handleSave} color="primary">
          <Save size={16} />
        </IconButton>
        <IconButton size="small" onClick={handleCancel}>
          <X size={16} />
        </IconButton>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' },
        px: 1,
        py: 0.5,
        borderRadius: 1,
      }}
      onClick={() => setEditing(true)}
    >
      <Typography variant="body2" fontWeight={500}>
        {promoRatio}:{nonPromoRatio}
      </Typography>
      <Edit2 size={12} color="#9e9e9e" />
    </Box>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function BookieHealthTab() {
  const [bookies, setBookies] = useState<BookieWithHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [selectedBookie, setSelectedBookie] = useState<BookieWithHealth | null>(null)

  // Mobile detection
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // Load bookies with health data
  const loadBookies = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getAllBookiesWithHealth()
      setBookies(result.bookies)
    } catch (err) {
      setError('Failed to load bookies')
      console.error('Load bookies error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBookies()
  }, [loadBookies])

  // Handle ratio update
  const handleRatioUpdate = async (
    bookieId: number,
    promoRatio: number,
    nonPromoRatio: number
  ) => {
    try {
      await upsertRatioConfig({
        data: { bookieId, promoRatio, nonPromoRatio },
      })
      await loadBookies()
    } catch (err) {
      console.error('Update ratio error:', err)
    }
  }

  // Handle time window update
  const handleTimeWindowUpdate = async (
    bookieId: number,
    timeWindow: RatioTimeWindow
  ) => {
    try {
      await upsertRatioConfig({
        data: { bookieId, timeWindow },
      })
      await loadBookies()
    } catch (err) {
      console.error('Update time window error:', err)
    }
  }

  // Handle enabled toggle
  const handleEnabledToggle = async (bookieId: number, isEnabled: boolean) => {
    try {
      await upsertRatioConfig({
        data: { bookieId, isEnabled },
      })
      await loadBookies()
    } catch (err) {
      console.error('Toggle enabled error:', err)
    }
  }

  // Handle status update
  const handleStatusUpdate = async (
    bookieId: number,
    status: BookieAccountStatus,
    notes?: string
  ) => {
    await updateBookieStatus({
      data: { bookieId, status, notes },
    })
    await loadBookies()
  }

  // Open status dialog
  const openStatusDialog = (bookie: BookieWithHealth) => {
    setSelectedBookie(bookie)
    setStatusDialogOpen(true)
  }

  // Filter bookies
  const filteredBookies = bookies.filter((bookie) => {
    // Search filter
    if (searchQuery && !bookie.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    // Status filter
    if (statusFilter !== 'all') {
      const status = bookie.ratioConfig?.status || 'PROMO_ELIGIBLE'
      if (status !== statusFilter) {
        return false
      }
    }
    return true
  })

  // Column definitions for desktop
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Bookie',
      width: 150,
      renderCell: (params: GridRenderCellParams<BookieWithHealth>) => (
        <Typography variant="body2" fontWeight={500}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params: GridRenderCellParams<BookieWithHealth>) => {
        const status = (params.row.ratioConfig?.status || 'PROMO_ELIGIBLE') as BookieAccountStatus
        const config = BOOKIE_STATUS_CONFIG[status]
        return (
          <Tooltip title="Click to change status">
            <Chip
              label={config.label}
              size="small"
              color={config.color}
              onClick={() => openStatusDialog(params.row)}
              sx={{ cursor: 'pointer' }}
            />
          </Tooltip>
        )
      },
    },
    {
      field: 'ratio',
      headerName: 'Ratio',
      width: 160,
      renderCell: (params: GridRenderCellParams<BookieWithHealth>) => {
        const config = params.row.ratioConfig
        const promoRatio = config?.promoRatio || 1
        const nonPromoRatio = config?.nonPromoRatio || 3
        return (
          <RatioEditor
            promoRatio={promoRatio}
            nonPromoRatio={nonPromoRatio}
            onSave={(p, n) => handleRatioUpdate(params.row.id, p, n)}
          />
        )
      },
    },
    {
      field: 'timeWindow',
      headerName: 'Time Window',
      width: 130,
      renderCell: (params: GridRenderCellParams<BookieWithHealth>) => {
        const config = params.row.ratioConfig
        const timeWindow = (config?.timeWindow || 'WEEKLY') as RatioTimeWindow
        return (
          <Select
            value={timeWindow}
            size="small"
            onChange={(e) =>
              handleTimeWindowUpdate(params.row.id, e.target.value as RatioTimeWindow)
            }
            sx={{ minWidth: 100, fontSize: '0.8rem' }}
          >
            {Object.entries(TIME_WINDOW_CONFIG).map(([key, cfg]) => (
              <MenuItem key={key} value={key}>
                {cfg.label}
              </MenuItem>
            ))}
          </Select>
        )
      },
    },
    {
      field: 'promoVolume',
      headerName: 'Promo Vol.',
      width: 100,
      renderCell: (params: GridRenderCellParams<BookieWithHealth>) => {
        const volume = params.value as string | null
        return volume ? (
          <Typography variant="body2" sx={{ color: getVolumeColor(volume) }}>
            {volume}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            -
          </Typography>
        )
      },
    },
    {
      field: 'banRisk',
      headerName: 'Ban Risk',
      width: 90,
      renderCell: (params: GridRenderCellParams<BookieWithHealth>) => {
        const risk = params.value as string | null
        return risk ? (
          <Typography variant="body2" sx={{ color: getRiskColor(risk) }}>
            {risk}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            -
          </Typography>
        )
      },
    },
    {
      field: 'statusNotes',
      headerName: 'Notes',
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams<BookieWithHealth>) => {
        const notes = params.row.ratioConfig?.statusNotes
        return notes ? (
          <Tooltip title={notes}>
            <Typography
              variant="body2"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {notes}
            </Typography>
          </Tooltip>
        ) : (
          <Typography variant="body2" color="text.secondary">
            -
          </Typography>
        )
      },
    },
    {
      field: 'isEnabled',
      headerName: 'Tracking',
      width: 100,
      renderCell: (params: GridRenderCellParams<BookieWithHealth>) => {
        const isEnabled = params.row.ratioConfig?.isEnabled ?? true
        return (
          <Switch
            checked={isEnabled}
            onChange={(e) => handleEnabledToggle(params.row.id, e.target.checked)}
            size="small"
          />
        )
      },
    },
  ]

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
          Bookie Health
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure promo:non-promo ratios to avoid being gubbed.
        </Typography>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
        <TextField
          size="small"
          placeholder="Search bookies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flex: { xs: 1, sm: 'none' }, width: { sm: 200 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} color="#9e9e9e" />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            {Object.entries(BOOKIE_STATUS_CONFIG).map(([key, config]) => (
              <MenuItem key={key} value={key}>
                {config.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Info Alert */}
      <Alert
        severity="info"
        icon={<Info size={18} />}
        sx={{
          mb: 2,
          backgroundColor: 'transparent',
          border: '1px solid',
          borderColor: 'divider',
          py: 0.5,
          '& .MuiAlert-message': { fontSize: '0.875rem' },
        }}
      >
        Ratio 1:3 = 1 promo bet per 3 non-promo bets. Chips show dots when limits are reached.
      </Alert>

      {/* Mobile Card View */}
      {isMobile ? (
        <Box sx={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
          {filteredBookies.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No bookies found
            </Typography>
          ) : (
            filteredBookies.map((bookie) => (
              <BookieCard
                key={bookie.id}
                bookie={bookie}
                onRatioUpdate={handleRatioUpdate}
                onTimeWindowUpdate={handleTimeWindowUpdate}
                onEnabledToggle={handleEnabledToggle}
                onStatusClick={openStatusDialog}
              />
            ))
          )}
        </Box>
      ) : (
        /* Desktop Data Grid */
        <Box sx={{ height: 500, width: '100%' }}>
          <DataGridPro
            rows={filteredBookies}
            columns={columns}
            disableRowSelectionOnClick
            hideFooterSelectedRowCount
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
              sorting: { sortModel: [{ field: 'name', sort: 'asc' }] },
            }}
            pageSizeOptions={[25, 50, 100]}
            sx={{
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'grey.100',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          />
        </Box>
      )}

      {/* Status Dialog */}
      <BookieStatusDialog
        open={statusDialogOpen}
        bookie={selectedBookie}
        onClose={() => setStatusDialogOpen(false)}
        onSave={handleStatusUpdate}
      />
    </Box>
  )
}
