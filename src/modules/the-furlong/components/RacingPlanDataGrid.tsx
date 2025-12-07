'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Box, Typography, CircularProgress, Tooltip, Checkbox } from '@mui/material'
import { CheckCircle, AlertTriangle, Clock, HelpCircle } from 'lucide-react'
import type { RacingPlanEntry, TimeValidationStatus, BookiePromo, UnitTier } from '../types'
import { UNIT_TIER_CONFIG } from '../types'
import { convertRaceTime } from '../utils/timezones'
import { BookieMatrix } from './BookieMatrix'

interface RacingPlanDataGridProps {
  entries: RacingPlanEntry[]
  selectedDate: string
  selectedDateISO?: string // YYYY-MM-DD format for timezone conversion
  timezone?: string // Timezone ID from TIMEZONES
  onEntriesChange?: (entries: RacingPlanEntry[]) => void
  // Selection props for lock-in feature
  selectable?: boolean
  selectedIds?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
}

export function RacingPlanDataGrid({
  entries,
  selectedDate,
  selectedDateISO = '',
  timezone = 'melbourne',
  onEntriesChange,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
}: RacingPlanDataGridProps) {
  const [DataGridComponent, setDataGridComponent] = useState<typeof import('@mui/x-data-grid').DataGrid | null>(null)

  // Convert entry times to selected timezone
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
    import('@mui/x-data-grid').then((mod) => {
      setDataGridComponent(() => mod.DataGrid)
    })
  }, [])

  // Handle bookie selection change
  const handleNormalBookieChange = useCallback((entryId: string, selectedBookies: string[]) => {
    if (!onEntriesChange) return
    const updatedEntries = entries.map((entry) =>
      entry.id === entryId
        ? { ...entry, selectedNormalBookies: selectedBookies }
        : entry
    )
    onEntriesChange(updatedEntries)
  }, [entries, onEntriesChange])

  const handleBetBackBookieChange = useCallback((entryId: string, selectedBookies: string[]) => {
    if (!onEntriesChange) return
    const updatedEntries = entries.map((entry) =>
      entry.id === entryId
        ? { ...entry, selectedBetBackBookies: selectedBookies }
        : entry
    )
    onEntriesChange(updatedEntries)
  }, [entries, onEntriesChange])

  // Handle row selection
  const handleRowSelect = useCallback((entryId: string, checked: boolean) => {
    if (!onSelectionChange) return

    if (checked) {
      onSelectionChange([...selectedIds, entryId])
    } else {
      onSelectionChange(selectedIds.filter((id) => id !== entryId))
    }
  }, [selectedIds, onSelectionChange])

  // Check if entry can be selected (not skipped and has bookie selections)
  const canSelect = useCallback((entry: RacingPlanEntry): boolean => {
    if (entry.skip) return false
    return true // Allow selection even without bookie selections
  }, [])

  // Handle select all
  const handleSelectAll = useCallback((checked: boolean) => {
    if (!onSelectionChange) return

    if (checked) {
      const selectableIds = entries.filter(canSelect).map((e) => e.id)
      onSelectionChange(selectableIds)
    } else {
      onSelectionChange([])
    }
  }, [entries, canSelect, onSelectionChange])

  // Calculate select all state
  const selectableEntries = entries.filter(canSelect)
  const allSelected = selectableEntries.length > 0 && selectableEntries.every((e) => selectedIds.includes(e.id))
  const someSelected = selectableEntries.some((e) => selectedIds.includes(e.id)) && !allSelected

  if (entries.length === 0) {
    return (
      <Box
        sx={{
          height: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'grey.50',
          borderRadius: 1,
          border: '1px dashed',
          borderColor: 'grey.300',
        }}
      >
        <Typography color="text.secondary">
          No racing plan for {selectedDate}. Click Import to add one.
        </Typography>
      </Box>
    )
  }

  if (!DataGridComponent) {
    return (
      <Box sx={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  // Validation status icon renderer
  const renderValidationIcon = (status: TimeValidationStatus | undefined) => {
    switch (status) {
      case 'verified':
        return (
          <Tooltip title="Time verified with API">
            <CheckCircle size={16} color="#2e7d32" />
          </Tooltip>
        )
      case 'mismatch':
        return (
          <Tooltip title="Time corrected from API">
            <AlertTriangle size={16} color="#ed6c02" />
          </Tooltip>
        )
      case 'not_found':
        return (
          <Tooltip title="Race not found in API">
            <HelpCircle size={16} color="#9e9e9e" />
          </Tooltip>
        )
      case 'pending':
      default:
        return (
          <Tooltip title="Not yet validated">
            <Clock size={16} color="#9e9e9e" />
          </Tooltip>
        )
    }
  }

  const columns = [
    // Checkbox column for selection (only when selectable)
    ...(selectable
      ? [
          {
            field: '__select__',
            headerName: '',
            width: 50,
            sortable: false,
            disableColumnMenu: true,
            renderHeader: () => (
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                size="small"
              />
            ),
            renderCell: (params: { row: RacingPlanEntry }) => {
              const isSelectable = canSelect(params.row)
              const isSelected = selectedIds.includes(params.row.id)

              return (
                <Tooltip title={!isSelectable ? 'Skipped races cannot be locked in' : ''}>
                  <span>
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => handleRowSelect(params.row.id, e.target.checked)}
                      disabled={!isSelectable}
                      size="small"
                    />
                  </span>
                </Tooltip>
              )
            },
          },
        ]
      : []),
    {
      field: 'time',
      headerName: 'Time',
      width: 70,
      sortable: true,
      renderCell: (params: { value: string }) => (
        <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8rem' }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'track',
      headerName: 'Track',
      width: 100,
      sortable: true,
      renderCell: (params: { value: string }) => (
        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'raceNumber',
      headerName: 'Race',
      width: 50,
      type: 'number' as const,
      sortable: true,
    },
    {
      field: 'skip',
      headerName: 'Status',
      width: 60,
      sortable: true,
      renderCell: (params: { value?: boolean }) => (
        params.value ?
          <Typography sx={{ color: '#d32f2f', fontWeight: 600, fontSize: '0.7rem' }}>SKIP</Typography> :
          <Typography sx={{ color: '#2e7d32', fontWeight: 500, fontSize: '0.7rem' }}>Active</Typography>
      ),
    },
    {
      field: 'unitTier',
      headerName: 'Units',
      width: 70,
      sortable: true,
      renderCell: (params: { row: RacingPlanEntry; value: UnitTier }) => {
        const tier = params.value || 'neutral'
        const config = UNIT_TIER_CONFIG[tier]

        // Color mapping to match Excel colors
        const colorMap: Record<UnitTier, { bg: string; text: string; border: string }> = {
          green: { bg: '#c8e6c9', text: '#2e7d32', border: '#81c784' },   // Light green
          neutral: { bg: '#f5f5f5', text: '#616161', border: '#e0e0e0' }, // Grey/neutral
          pink: { bg: '#f8bbd9', text: '#c2185b', border: '#f48fb1' },    // Light pink
        }

        const colors = colorMap[tier]

        return (
          <Tooltip title={config.description}>
            <Box
              sx={{
                width: 54,
                height: 22,
                borderRadius: 1,
                backgroundColor: colors.bg,
                border: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: colors.text,
                  whiteSpace: 'nowrap',
                }}
              >
                {config.label}
              </Typography>
            </Box>
          </Tooltip>
        )
      },
    },
    {
      field: 'normalPromosByBookie',
      headerName: 'Normal Promos',
      flex: 1,
      minWidth: 280,
      sortable: false,
      renderCell: (params: { row: RacingPlanEntry; value: BookiePromo[] }) => {
        const promos = params.value || []
        const selectedBookies = params.row.selectedNormalBookies || []

        if (promos.length === 0) {
          // Fallback to legacy format
          const legacyPromos = params.row.normalPromos || []
          return (
            <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {legacyPromos.join(', ') || '-'}
            </Typography>
          )
        }

        return (
          <BookieMatrix
            promosByBookie={promos}
            selectedBookies={selectedBookies}
            onSelectionChange={(bookies) => handleNormalBookieChange(params.row.id, bookies)}
            maxSelections={3}
            compact
          />
        )
      },
    },
    {
      field: 'betBackPromosByBookie',
      headerName: 'Bet Back Options',
      flex: 1,
      minWidth: 250,
      sortable: false,
      renderCell: (params: { row: RacingPlanEntry; value: BookiePromo[] }) => {
        const promos = params.value || []
        const selectedBookies = params.row.selectedBetBackBookies || []

        if (promos.length === 0) {
          // Fallback to legacy format
          const legacyPromos = params.row.betBackPromos || []
          return (
            <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {legacyPromos.join(', ') || '-'}
            </Typography>
          )
        }

        return (
          <BookieMatrix
            promosByBookie={promos}
            selectedBookies={selectedBookies}
            onSelectionChange={(bookies) => handleBetBackBookieChange(params.row.id, bookies)}
            maxSelections={3}
            compact
          />
        )
      },
    },
    {
      field: 'timeValidationStatus',
      headerName: 'Valid',
      width: 50,
      sortable: true,
      disableColumnMenu: true,
      renderCell: (params: { row: RacingPlanEntry }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          {renderValidationIcon(params.row.timeValidationStatus)}
        </Box>
      ),
    },
  ]

  return (
    <Box sx={{ height: 'calc(100vh - 280px)', minHeight: 400, width: '100%' }}>
      <DataGridComponent
        rows={convertedEntries}
        columns={columns}
        pageSizeOptions={[10, 25, 50, 100]}
        rowHeight={42}
        initialState={{
          pagination: { paginationModel: { pageSize: 25 } },
          sorting: { sortModel: [{ field: 'time', sort: 'asc' }] },
        }}
        disableRowSelectionOnClick
        sx={{
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: 'grey.100',
            fontWeight: 600,
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontSize: '0.75rem',
            fontWeight: 600,
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: 'action.hover',
          },
          '& .MuiDataGrid-cell': {
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
          },
          '& .MuiDataGrid-cell[data-field="__select__"]': {
            justifyContent: 'center',
          },
          '& .MuiDataGrid-cell[data-field="time"]': {
            justifyContent: 'center',
          },
          '& .MuiDataGrid-cell[data-field="track"]': {
            justifyContent: 'center',
          },
          '& .MuiDataGrid-cell[data-field="raceNumber"]': {
            justifyContent: 'center',
          },
          '& .MuiDataGrid-cell[data-field="skip"]': {
            justifyContent: 'center',
          },
          '& .MuiDataGrid-cell[data-field="unitTier"]': {
            justifyContent: 'center',
          },
          '& .MuiDataGrid-cell[data-field="timeValidationStatus"]': {
            justifyContent: 'center',
          },
        }}
      />
    </Box>
  )
}
