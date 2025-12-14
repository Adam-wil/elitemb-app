'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Box,
  Typography,
  CircularProgress,
  Tooltip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material'
import { RefreshCw, CheckCircle, Plus, Trash2, AlertTriangle, ArrowUp, ArrowDown, Copy, Scissors, Lock, LockOpen, Rows, ClipboardPaste } from 'lucide-react'
import type { GridColDef, GridRenderCellParams, GridValueGetter, GridValueSetter, GridRowId } from '@mui/x-data-grid-premium'
import type { TrackedRaceEntry, RaceOutcome, RaceResultData } from '../types'
import { OUTCOME_CONFIG, UNIT_TIER_CONFIG, type UnitTier } from '../types'
import { convertRaceTime } from '../utils/timezones'
import { getCommissionForTrack, type StateCommissionRate } from '../utils/trackerStorage'

interface TrackerDataGridProps {
  entries: TrackedRaceEntry[]
  selectedDate: string
  selectedDateISO?: string
  timezone?: string
  onEntryUpdate: (entryId: string, updates: Partial<TrackedRaceEntry>) => void
  onRefreshResult: (entryId: string) => Promise<RaceResultData | null>
  onAddEntry: (afterId?: string) => void
  onAddEntryAbove: (beforeId: string) => void
  onDeleteEntry: (entryId: string) => void
  isPolling?: boolean
  columnVisibility?: Record<string, boolean> // Column visibility model
  stateCommissions?: StateCommissionRate[] // State commission rates for auto-calculating Comm%
}

type ContextMenuState = {
  mouseX: number
  mouseY: number
  rowId: string
  row: TrackedRaceEntry
  field: string | null  // The clicked cell's field name
  cellValue: unknown    // The cell's current value
} | null

export function TrackerDataGrid({
  entries,
  selectedDate,
  selectedDateISO = '',
  timezone = 'melbourne',
  onEntryUpdate,
  onRefreshResult,
  onAddEntry,
  onAddEntryAbove,
  onDeleteEntry,
  columnVisibility = {},
  stateCommissions,
}: TrackerDataGridProps) {
  const [GridComponent, setGridComponent] = useState<typeof import('@mui/x-data-grid-premium').DataGridPremium | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<TrackedRaceEntry | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)

  const convertedEntries = useMemo(() => {
    if (!selectedDateISO || timezone === 'melbourne') {
      return entries
    }
    return entries.map((entry) => ({
      ...entry,
      time: convertRaceTime(entry.time, selectedDateISO, timezone),
    }))
  }, [entries, selectedDateISO, timezone])

  useEffect(() => {
    import('@mui/x-data-grid-premium').then((mod) => {
      setGridComponent(() => mod.DataGridPremium)
    })
  }, [])

  const handleRefreshClick = useCallback(async (entryId: string) => {
    setRefreshingId(entryId)
    try {
      await onRefreshResult(entryId)
    } catch (error) {
      console.error(`Refresh error for entry ${entryId}:`, error)
    } finally {
      setRefreshingId(null)
    }
  }, [onRefreshResult])

  const handleDeleteClick = useCallback((entry: TrackedRaceEntry) => {
    // If it's from the planner, show confirmation
    if (entry.planEntryId) {
      setEntryToDelete(entry)
      setDeleteDialogOpen(true)
    } else {
      // Manual entry, delete directly
      onDeleteEntry(entry.id)
    }
  }, [onDeleteEntry])

  const handleConfirmDelete = useCallback(() => {
    if (entryToDelete) {
      onDeleteEntry(entryToDelete.id)
      setEntryToDelete(null)
      setDeleteDialogOpen(false)
    }
  }, [entryToDelete, onDeleteEntry])

  const handleCancelDelete = useCallback(() => {
    setEntryToDelete(null)
    setDeleteDialogOpen(false)
  }, [])

  // Context menu handlers
  const handleContextMenu = useCallback((event: React.MouseEvent, row: TrackedRaceEntry, field: string | null, cellValue: unknown) => {
    event.preventDefault()
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      rowId: row.id,
      row,
      field,
      cellValue,
    })
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleInsertRowAbove = useCallback(() => {
    if (contextMenu) {
      onAddEntryAbove(contextMenu.rowId)
      setContextMenu(null)
    }
  }, [contextMenu, onAddEntryAbove])

  const handleInsertRowBelow = useCallback(() => {
    if (contextMenu) {
      onAddEntry(contextMenu.rowId)
      setContextMenu(null)
    }
  }, [contextMenu, onAddEntry])

  const handleRemoveRow = useCallback(() => {
    if (contextMenu) {
      handleDeleteClick(contextMenu.row)
      setContextMenu(null)
    }
  }, [contextMenu, handleDeleteClick])

  // Get cell value as string for clipboard
  const getCellValueAsString = useCallback((value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }, [])

  // Editable fields that can be cut (cleared after copy)
  const editableFields = ['selectionNumber', 'selectionName', 'bookie', 'backStake', 'backOdds', 'layStake', 'layOdds', 'layCommission', 'time', 'track', 'raceNumber']

  const handleCopyCell = useCallback(async () => {
    if (contextMenu && contextMenu.field) {
      const text = getCellValueAsString(contextMenu.cellValue)
      try {
        await navigator.clipboard.writeText(text)
      } catch (err) {
        // Fallback for non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setContextMenu(null)
    }
  }, [contextMenu, getCellValueAsString])

  const handleCutCell = useCallback(async () => {
    if (contextMenu && contextMenu.field) {
      // Copy cell value first
      const text = getCellValueAsString(contextMenu.cellValue)
      try {
        await navigator.clipboard.writeText(text)
      } catch (err) {
        // Fallback for non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }

      // Clear the cell based on field type
      const field = contextMenu.field
      let updates: Partial<TrackedRaceEntry> = {}

      if (field === 'time') {
        updates.time = ''
      } else if (field === 'track') {
        updates.track = ''
      } else if (field === 'raceNumber') {
        updates.raceNumber = 0
      } else if (field === 'selectionNumber') {
        updates.selectionNumber = 0
      } else if (field === 'selectionName') {
        updates.selectionName = ''
      } else if (field === 'bookie') {
        updates.backBet = { ...contextMenu.row.backBet, bookie: '' }
      } else if (field === 'backStake') {
        updates.backBet = { ...contextMenu.row.backBet, stake: 0 }
      } else if (field === 'backOdds') {
        updates.backBet = { ...contextMenu.row.backBet, odds: 0 }
      } else if (field === 'layStake') {
        updates.layBet = { ...contextMenu.row.layBet, stake: 0 }
      } else if (field === 'layOdds') {
        updates.layBet = { ...contextMenu.row.layBet, odds: 0 }
      } else if (field === 'layCommission') {
        updates.layBet = { ...contextMenu.row.layBet, commissionPercent: 0 }
      }

      if (Object.keys(updates).length > 0) {
        onEntryUpdate(contextMenu.rowId, updates)
      }
      setContextMenu(null)
    }
  }, [contextMenu, getCellValueAsString, onEntryUpdate])

  const canCutCell = contextMenu?.field && editableFields.includes(contextMenu.field)

  const handlePasteCell = useCallback(async () => {
    if (contextMenu && contextMenu.field && !contextMenu.row.readOnly) {
      let clipboardText = ''
      try {
        clipboardText = await navigator.clipboard.readText()
      } catch (err) {
        // Clipboard read failed - might need user permission or not available
        console.error('Failed to read clipboard:', err)
        return
      }

      if (!clipboardText) {
        setContextMenu(null)
        return
      }

      // Apply the pasted value based on field type
      const field = contextMenu.field
      let updates: Partial<TrackedRaceEntry> = {}

      if (field === 'time') {
        updates.time = clipboardText.trim()
      } else if (field === 'track') {
        updates.track = clipboardText.trim()
      } else if (field === 'raceNumber') {
        const num = parseInt(clipboardText.trim(), 10)
        if (!isNaN(num)) updates.raceNumber = num
      } else if (field === 'selectionNumber') {
        const num = parseInt(clipboardText.trim(), 10)
        if (!isNaN(num)) updates.selectionNumber = num
      } else if (field === 'selectionName') {
        updates.selectionName = clipboardText.trim()
      } else if (field === 'bookie') {
        updates.backBet = { ...contextMenu.row.backBet, bookie: clipboardText.trim() }
      } else if (field === 'backStake') {
        const num = parseFloat(clipboardText.trim())
        if (!isNaN(num)) updates.backBet = { ...contextMenu.row.backBet, stake: num }
      } else if (field === 'backOdds') {
        const num = parseFloat(clipboardText.trim())
        if (!isNaN(num)) updates.backBet = { ...contextMenu.row.backBet, odds: num }
      } else if (field === 'layStake') {
        const num = parseFloat(clipboardText.trim())
        if (!isNaN(num)) updates.layBet = { ...contextMenu.row.layBet, stake: num }
      } else if (field === 'layOdds') {
        const num = parseFloat(clipboardText.trim())
        if (!isNaN(num)) updates.layBet = { ...contextMenu.row.layBet, odds: num }
      } else if (field === 'layCommission') {
        const num = parseFloat(clipboardText.trim())
        if (!isNaN(num)) updates.layBet = { ...contextMenu.row.layBet, commissionPercent: num }
      }

      if (Object.keys(updates).length > 0) {
        onEntryUpdate(contextMenu.rowId, updates)
      }
      setContextMenu(null)
    }
  }, [contextMenu, onEntryUpdate])

  const handleCopyRow = useCallback(async () => {
    if (contextMenu) {
      const row = contextMenu.row
      const text = `${row.time}\t${row.track}\tR${row.raceNumber}\t${row.backBet?.bookie || ''}\t${row.selectionNumber}\t${row.selectionName}\t${row.backBet?.stake || ''}\t${row.backBet?.odds || ''}\t${row.layBet?.stake || ''}\t${row.layBet?.odds || ''}`
      try {
        await navigator.clipboard.writeText(text)
      } catch (err) {
        // Fallback for non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setContextMenu(null)
    }
  }, [contextMenu])

  const handleToggleReadOnly = useCallback(() => {
    if (contextMenu) {
      const currentReadOnly = contextMenu.row.readOnly || false
      onEntryUpdate(contextMenu.rowId, { readOnly: !currentReadOnly })
      setContextMenu(null)
    }
  }, [contextMenu, onEntryUpdate])

  // Get cell value for the selected cell (keyboard shortcuts)
  const getSelectedCellValue = useCallback((): unknown => {
    if (!selectedRowId || !selectedField) return null
    const row = entries.find(e => e.id === selectedRowId)
    if (!row) return null

    if (selectedField === 'bookie') return row.backBet?.bookie
    if (selectedField === 'backStake') return row.backBet?.stake
    if (selectedField === 'backOdds') return row.backBet?.odds
    if (selectedField === 'layStake') return row.layBet?.stake
    if (selectedField === 'layOdds') return row.layBet?.odds
    if (selectedField === 'layCommission') return row.layBet?.commissionPercent ?? 5
    return (row as unknown as Record<string, unknown>)[selectedField]
  }, [selectedRowId, selectedField, entries])

  // Keyboard shortcut handlers
  const handleKeyboardCopy = useCallback(async () => {
    if (!selectedRowId || !selectedField) return
    const value = getSelectedCellValue()
    const text = getCellValueAsString(value)
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }, [selectedRowId, selectedField, getSelectedCellValue, getCellValueAsString])

  const handleKeyboardCut = useCallback(async () => {
    if (!selectedRowId || !selectedField) return
    const row = entries.find(e => e.id === selectedRowId)
    if (!row || row.readOnly) return
    if (!editableFields.includes(selectedField)) return

    // Copy first
    await handleKeyboardCopy()

    // Then clear
    let updates: Partial<TrackedRaceEntry> = {}
    if (selectedField === 'time') updates.time = ''
    else if (selectedField === 'track') updates.track = ''
    else if (selectedField === 'raceNumber') updates.raceNumber = 0
    else if (selectedField === 'selectionNumber') updates.selectionNumber = 0
    else if (selectedField === 'selectionName') updates.selectionName = ''
    else if (selectedField === 'bookie') updates.backBet = { ...row.backBet, bookie: '' }
    else if (selectedField === 'backStake') updates.backBet = { ...row.backBet, stake: 0 }
    else if (selectedField === 'backOdds') updates.backBet = { ...row.backBet, odds: 0 }
    else if (selectedField === 'layStake') updates.layBet = { ...row.layBet, stake: 0 }
    else if (selectedField === 'layOdds') updates.layBet = { ...row.layBet, odds: 0 }
    else if (selectedField === 'layCommission') updates.layBet = { ...row.layBet, commissionPercent: 0 }

    if (Object.keys(updates).length > 0) {
      onEntryUpdate(selectedRowId, updates)
    }
  }, [selectedRowId, selectedField, entries, editableFields, handleKeyboardCopy, onEntryUpdate])

  const handleKeyboardPaste = useCallback(async () => {
    if (!selectedRowId || !selectedField) return
    const row = entries.find(e => e.id === selectedRowId)
    if (!row || row.readOnly) return
    if (!editableFields.includes(selectedField)) return

    let clipboardText = ''
    try {
      clipboardText = await navigator.clipboard.readText()
    } catch (err) {
      return
    }

    if (!clipboardText) return

    let updates: Partial<TrackedRaceEntry> = {}
    if (selectedField === 'time') updates.time = clipboardText.trim()
    else if (selectedField === 'track') updates.track = clipboardText.trim()
    else if (selectedField === 'raceNumber') {
      const num = parseInt(clipboardText.trim(), 10)
      if (!isNaN(num)) updates.raceNumber = num
    }
    else if (selectedField === 'selectionNumber') {
      const num = parseInt(clipboardText.trim(), 10)
      if (!isNaN(num)) updates.selectionNumber = num
    }
    else if (selectedField === 'selectionName') updates.selectionName = clipboardText.trim()
    else if (selectedField === 'bookie') updates.backBet = { ...row.backBet, bookie: clipboardText.trim() }
    else if (selectedField === 'backStake') {
      const num = parseFloat(clipboardText.trim())
      if (!isNaN(num)) updates.backBet = { ...row.backBet, stake: num }
    }
    else if (selectedField === 'backOdds') {
      const num = parseFloat(clipboardText.trim())
      if (!isNaN(num)) updates.backBet = { ...row.backBet, odds: num }
    }
    else if (selectedField === 'layStake') {
      const num = parseFloat(clipboardText.trim())
      if (!isNaN(num)) updates.layBet = { ...row.layBet, stake: num }
    }
    else if (selectedField === 'layOdds') {
      const num = parseFloat(clipboardText.trim())
      if (!isNaN(num)) updates.layBet = { ...row.layBet, odds: num }
    }
    else if (selectedField === 'layCommission') {
      const num = parseFloat(clipboardText.trim())
      if (!isNaN(num)) updates.layBet = { ...row.layBet, commissionPercent: num }
    }

    if (Object.keys(updates).length > 0) {
      onEntryUpdate(selectedRowId, updates)
    }
  }, [selectedRowId, selectedField, entries, editableFields, onEntryUpdate])

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if we have a selected cell and not in edit mode
      if (!selectedRowId || !selectedField) return

      // Check if we're in an input/textarea (editing mode)
      const activeElement = document.activeElement
      const isEditing = activeElement?.tagName === 'INPUT' ||
                        activeElement?.tagName === 'TEXTAREA' ||
                        activeElement?.getAttribute('role') === 'textbox'
      if (isEditing) return

      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && key === 'c') {
        event.preventDefault()
        event.stopPropagation()
        handleKeyboardCopy()
      } else if ((event.ctrlKey || event.metaKey) && key === 'x') {
        event.preventDefault()
        event.stopPropagation()
        handleKeyboardCut()
      } else if ((event.ctrlKey || event.metaKey) && key === 'v') {
        event.preventDefault()
        event.stopPropagation()
        handleKeyboardPaste()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true) // Use capture phase
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [selectedRowId, selectedField, handleKeyboardCopy, handleKeyboardCut, handleKeyboardPaste])

  const processRowUpdate = useCallback((newRow: TrackedRaceEntry, oldRow: TrackedRaceEntry) => {
    if (newRow.selectionNumber !== oldRow.selectionNumber) {
      onEntryUpdate(newRow.id, { selectionNumber: newRow.selectionNumber })
    }
    if (newRow.selectionName !== oldRow.selectionName) {
      onEntryUpdate(newRow.id, { selectionName: newRow.selectionName })
    }
    if (newRow.outcome !== oldRow.outcome) {
      onEntryUpdate(newRow.id, { outcome: newRow.outcome })
    }
    // Handle backBet changes (including bookie field)
    if (JSON.stringify(newRow.backBet) !== JSON.stringify(oldRow.backBet)) {
      onEntryUpdate(newRow.id, { backBet: newRow.backBet })
    }
    if (JSON.stringify(newRow.layBet) !== JSON.stringify(oldRow.layBet)) {
      onEntryUpdate(newRow.id, { layBet: newRow.layBet })
    }
    return newRow
  }, [onEntryUpdate])

  
  if (entries.length === 0) {
    return (
      <Box
        sx={{
          height: 400,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fafafa',
          borderRadius: 2,
          border: '1px dashed #d1d5db',
          gap: 2,
        }}
      >
        <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
          No races locked in for {selectedDate}. Use the Planner to lock in races or add manually.
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Plus size={16} />}
          onClick={() => onAddEntry()}
          sx={{ textTransform: 'none' }}
        >
          Add Row
        </Button>
      </Box>
    )
  }

  if (!GridComponent) {
    return (
      <Box sx={{ height: 520, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  const columns = [
    {
      field: 'time',
      headerName: 'Time',
      width: 80,
      editable: false,
      headerAlign: 'center' as const,
      align: 'center' as const,
    },
    {
      field: 'track',
      headerName: 'Track',
      width: 130,
      editable: false,
      headerAlign: 'center' as const,
      align: 'center' as const,
    },
    {
      field: 'raceNumber',
      headerName: 'Race',
      width: 60,
      type: 'number' as const,
      editable: false,
      headerAlign: 'center' as const,
      align: 'center' as const,
    },
    {
      field: 'unitTier',
      headerName: 'Units',
      width: 80,
      editable: false,
      headerAlign: 'center' as const,
      align: 'center' as const,
      renderCell: (params: { value?: UnitTier }) => {
        const tier = params.value || 'neutral'
        const config = UNIT_TIER_CONFIG[tier]
        const colorMap: Record<UnitTier, { bg: string; text: string }> = {
          green: { bg: '#dcfce7', text: '#166534' },
          neutral: { bg: '#f3f4f6', text: '#6b7280' },
          pink: { bg: '#fce7f3', text: '#be185d' },
        }
        const colors = colorMap[tier]

        return (
          <Tooltip title={config.description}>
            <Box sx={{
              width: 60,
              py: 0.5,
              borderRadius: 1.5,
              backgroundColor: colors.bg,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: colors.text, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
                {config.label}
              </Typography>
            </Box>
          </Tooltip>
        )
      },
    },
    {
      field: 'selectionNumber',
      headerName: '#',
      width: 55,
      type: 'number' as const,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
    },
    {
      field: 'selectionName',
      headerName: 'Selection',
      width: 160,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
    },
    {
      field: 'bookie',
      headerName: 'Bookie',
      width: 180,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      valueGetter: (_value: unknown, row: TrackedRaceEntry) => row.backBet?.bookie || '',
      valueSetter: (value: string, row: TrackedRaceEntry) => ({
        ...row,
        backBet: { ...row.backBet, bookie: value || '' },
      }),
    },
    {
      field: 'backStake',
      headerName: 'Back $',
      width: 80,
      type: 'number' as const,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      valueGetter: (_value: unknown, row: TrackedRaceEntry) => row.backBet?.stake || '',
      valueSetter: (value: number, row: TrackedRaceEntry) => ({
        ...row,
        backBet: { ...row.backBet, stake: value || 0 },
      }),
    },
    {
      field: 'backOdds',
      headerName: 'Odds',
      width: 70,
      type: 'number' as const,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      valueGetter: (_value: unknown, row: TrackedRaceEntry) => row.backBet?.odds || '',
      valueSetter: (value: number, row: TrackedRaceEntry) => ({
        ...row,
        backBet: { ...row.backBet, odds: value || 0 },
      }),
    },
    {
      field: 'layStake',
      headerName: 'Lay $',
      width: 80,
      type: 'number' as const,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      valueGetter: (_value: unknown, row: TrackedRaceEntry) => row.layBet?.stake || '',
      valueSetter: (value: number, row: TrackedRaceEntry) => ({
        ...row,
        layBet: { ...row.layBet, stake: value || 0 },
      }),
    },
    {
      field: 'layOdds',
      headerName: 'Odds',
      width: 70,
      type: 'number' as const,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      valueGetter: (_value: unknown, row: TrackedRaceEntry) => row.layBet?.odds || '',
      valueSetter: (value: number, row: TrackedRaceEntry) => ({
        ...row,
        layBet: { ...row.layBet, odds: value || 0 },
      }),
    },
    {
      field: 'layCommission',
      headerName: 'Comm%',
      width: 75,
      type: 'number' as const,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      valueGetter: (_value: unknown, row: TrackedRaceEntry) => {
        // Auto-calculate commission based on track's state if stateCommissions provided
        if (stateCommissions && row.track) {
          return getCommissionForTrack(row.track, stateCommissions)
        }
        // Fallback to stored value or default
        return row.layBet?.commissionPercent ?? 5
      },
      valueSetter: (value: number, row: TrackedRaceEntry) => ({
        ...row,
        layBet: { ...row.layBet, commissionPercent: value || 0 },
      }),
    },
    {
      field: 'autoResult',
      headerName: 'Result',
      width: 200,
      editable: false,
      headerAlign: 'center' as const,
      align: 'center' as const,
      renderCell: (params: { row: TrackedRaceEntry }) => {
        const result = params.row.autoResult
        if (!result) {
          return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>-</span>
        }
        return (
          <Tooltip title={`${result.winnerNumber}. ${result.winnerName}`}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {result.winnerNumber}. {result.winnerName}
            </span>
          </Tooltip>
        )
      },
    },
    {
      field: 'outcome',
      headerName: 'Outcome',
      width: 110,
      editable: true,
      type: 'singleSelect' as const,
      valueOptions: Object.keys(OUTCOME_CONFIG),
      headerAlign: 'center' as const,
      align: 'center' as const,
    },
    {
      field: 'actions',
      headerName: '',
      width: 90,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      renderCell: (params: { row: TrackedRaceEntry }) => {
        const isRefreshing = refreshingId === params.row.id
        const hasResult = !!params.row.autoResult

        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title={hasResult ? 'Refresh result' : 'Fetch result'}>
              <IconButton
                size="small"
                onClick={() => handleRefreshClick(params.row.id)}
                disabled={isRefreshing}
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': { backgroundColor: '#f3f4f6' },
                }}
              >
                {isRefreshing ? (
                  <CircularProgress size={16} />
                ) : hasResult ? (
                  <CheckCircle size={16} color="#16a34a" />
                ) : (
                  <RefreshCw size={16} color="#6b7280" />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title={params.row.readOnly ? 'Row is read-only' : params.row.planEntryId ? 'Delete (from planner)' : 'Delete row'}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteClick(params.row)}
                  disabled={params.row.readOnly}
                  sx={{
                    transition: 'all 0.2s',
                    '&:hover:not(:disabled)': { backgroundColor: '#fee2e2', color: '#dc2626' },
                  }}
                >
                  <Trash2 size={16} color={params.row.readOnly ? '#d1d5db' : params.row.planEntryId ? '#f59e0b' : '#6b7280'} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        )
      },
    },
  ]

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mb: 1 }}>
        {selectedRowId && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            New row will be added below selected
          </Typography>
        )}
        <Button
          size="small"
          variant="outlined"
          startIcon={<Plus size={16} />}
          onClick={() => onAddEntry(selectedRowId || undefined)}
          sx={{ textTransform: 'none' }}
        >
          Add Row
        </Button>
      </Box>
      <Box
        sx={{ flexGrow: 1 }}
        onContextMenu={(event: React.MouseEvent) => {
          // Find the closest row and cell elements
          const target = event.target as HTMLElement
          const rowElement = target.closest('.MuiDataGrid-row')
          const cellElement = target.closest('.MuiDataGrid-cell')
          if (rowElement) {
            const rowId = rowElement.getAttribute('data-id')
            if (rowId) {
              const row = entries.find(e => e.id === rowId)
              if (row) {
                event.preventDefault()
                // Get the field name from the cell's data-field attribute
                const field = cellElement?.getAttribute('data-field') || null
                // Get the cell value based on the field
                let cellValue: unknown = null
                if (field) {
                  if (field === 'bookie') cellValue = row.backBet?.bookie
                  else if (field === 'backStake') cellValue = row.backBet?.stake
                  else if (field === 'backOdds') cellValue = row.backBet?.odds
                  else if (field === 'layStake') cellValue = row.layBet?.stake
                  else if (field === 'layOdds') cellValue = row.layBet?.odds
                  else if (field === 'layCommission') cellValue = row.layBet?.commissionPercent ?? 5
                  else cellValue = (row as unknown as Record<string, unknown>)[field]
                }
                handleContextMenu(event, row, field, cellValue)
              }
            }
          }
        }}
      >
        <GridComponent
          rows={convertedEntries}
          columns={columns}
          rowHeight={44}
          columnHeaderHeight={48}
          autoHeight
          disableRowSelectionOnClick
          disableColumnSorting
          columnVisibilityModel={columnVisibility}
          processRowUpdate={processRowUpdate}
          onCellClick={(params) => {
            setSelectedRowId(params.row.id)
            setSelectedField(params.field)
          }}
          getRowClassName={(params) => {
            const classes = []
            if (params.row.id === selectedRowId) classes.push('row-selected')
            if (params.row.readOnly) classes.push('row-read-only')
            return classes.join(' ')
          }}
          isCellEditable={(params) => !params.row.readOnly}
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
            '&.Mui-selected, &.row-selected': {
              backgroundColor: '#eff6ff',
              '&:hover': {
                backgroundColor: '#dbeafe',
              },
            },
            '&.row-read-only': {
              backgroundColor: '#f8fafc',
              opacity: 0.8,
              '& .MuiDataGrid-cell': {
                color: '#64748b',
              },
              '&:hover': {
                backgroundColor: '#f1f5f9',
              },
            },
          },

          // Cell styling
          '& .MuiDataGrid-cell': {
            borderBottom: 'none',
            fontSize: '0.875rem',
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            '&:focus': {
              outline: '2px solid #3b82f6',
              outlineOffset: '-2px',
            },
            '&:focus-within': {
              outline: '2px solid #3b82f6',
              outlineOffset: '-2px',
            },
          },

          // Editable cell styling
          '& .MuiDataGrid-cell--editable': {
            cursor: 'text',
            '&:hover': {
              backgroundColor: '#f0f9ff',
            },
          },

          // Input styling when editing
          '& .MuiInputBase-root': {
            fontSize: '0.875rem',
            textAlign: 'center',
          },
          '& .MuiInputBase-input': {
            textAlign: 'center',
          },
          '& .MuiDataGrid-editInputCell': {
            padding: '0 8px',
          },

          // Footer styling
          '& .MuiDataGrid-footerContainer': {
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
          },

          // Scrollbar styling
          '& .MuiDataGrid-virtualScroller': {
            backgroundColor: '#fff',
          },

          // Remove focus ring on column header
          '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
            outline: 'none',
          },
        }}
        />
      </Box>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {/* Cell operations - only show if a cell was clicked */}
        {contextMenu?.field && (
          <>
            <MenuItem onClick={handleCutCell} disabled={contextMenu?.row.readOnly || !canCutCell}>
              <ListItemIcon>
                <Scissors size={16} />
              </ListItemIcon>
              <ListItemText>Cut cell</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleCopyCell}>
              <ListItemIcon>
                <Copy size={16} />
              </ListItemIcon>
              <ListItemText>Copy cell</ListItemText>
            </MenuItem>
            <MenuItem onClick={handlePasteCell} disabled={contextMenu?.row.readOnly || !canCutCell}>
              <ListItemIcon>
                <ClipboardPaste size={16} />
              </ListItemIcon>
              <ListItemText>Paste</ListItemText>
            </MenuItem>
            <Divider />
          </>
        )}
        {/* Row operations */}
        <MenuItem onClick={handleCopyRow}>
          <ListItemIcon>
            <Rows size={16} />
          </ListItemIcon>
          <ListItemText>Copy row</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleInsertRowAbove}>
          <ListItemIcon>
            <ArrowUp size={16} />
          </ListItemIcon>
          <ListItemText>Insert row above</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleInsertRowBelow}>
          <ListItemIcon>
            <ArrowDown size={16} />
          </ListItemIcon>
          <ListItemText>Insert row below</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleToggleReadOnly}>
          <ListItemIcon>
            {contextMenu?.row.readOnly ? <LockOpen size={16} /> : <Lock size={16} />}
          </ListItemIcon>
          <ListItemText>{contextMenu?.row.readOnly ? 'Make editable' : 'Read only'}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleRemoveRow} disabled={contextMenu?.row.readOnly} sx={{ color: contextMenu?.row.readOnly ? 'text.disabled' : 'error.main' }}>
          <ListItemIcon>
            <Trash2 size={16} color={contextMenu?.row.readOnly ? '#9ca3af' : '#d32f2f'} />
          </ListItemIcon>
          <ListItemText>Remove row</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AlertTriangle size={20} color="#f59e0b" />
          Delete Planner Entry
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            This entry was imported from the planner. Are you sure you want to delete it?
          </DialogContentText>
          {entryToDelete && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: '#f9fafb', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>{entryToDelete.time}</strong> - {entryToDelete.track} R{entryToDelete.raceNumber}
              </Typography>
              {entryToDelete.backBet?.bookie && (
                <Typography variant="body2" color="text.secondary">
                  Bookie: {entryToDelete.backBet.bookie}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
