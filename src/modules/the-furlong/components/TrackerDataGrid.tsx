'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Box, Typography, CircularProgress, Tooltip, IconButton } from '@mui/material'
import { RefreshCw, CheckCircle } from 'lucide-react'
import type { GridColDef, GridRenderCellParams, GridValueGetter, GridValueSetter } from '@mui/x-data-grid-pro'
import type { TrackedRaceEntry, RaceOutcome, RaceResultData } from '../types'
import { OUTCOME_CONFIG, UNIT_TIER_CONFIG, type UnitTier } from '../types'
import { convertRaceTime } from '../utils/timezones'

interface TrackerDataGridProps {
  entries: TrackedRaceEntry[]
  selectedDate: string
  selectedDateISO?: string
  timezone?: string
  onEntryUpdate: (entryId: string, updates: Partial<TrackedRaceEntry>) => void
  onRefreshResult: (entryId: string) => Promise<RaceResultData | null>
  isPolling?: boolean
  enabledAggregates?: string[] // IDs of enabled aggregate columns
}

export function TrackerDataGrid({
  entries,
  selectedDate,
  selectedDateISO = '',
  timezone = 'melbourne',
  onEntryUpdate,
  onRefreshResult,
  enabledAggregates = [],
}: TrackerDataGridProps) {
  const [GridComponent, setGridComponent] = useState<typeof import('@mui/x-data-grid-pro').DataGridPro | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)

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
    import('@mui/x-data-grid-pro').then((mod) => {
      setGridComponent(() => mod.DataGridPro)
    })
  }, [])

  const handleRefreshClick = useCallback(async (entryId: string) => {
    console.log(`[TrackerGrid] Refresh button clicked for entry: ${entryId}`)
    setRefreshingId(entryId)
    try {
      const result = await onRefreshResult(entryId)
      console.log(`[TrackerGrid] Refresh completed, result:`, result)
    } catch (error) {
      console.error(`[TrackerGrid] Refresh error:`, error)
    } finally {
      setRefreshingId(null)
    }
  }, [onRefreshResult])

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
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fafafa',
          borderRadius: 2,
          border: '1px dashed #d1d5db',
        }}
      >
        <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
          No races locked in for {selectedDate}. Use the Planner to lock in races.
        </Typography>
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
      width: 70,
      editable: false,
      headerAlign: 'center' as const,
      align: 'center' as const,
    },
    {
      field: 'track',
      headerName: 'Track',
      width: 100,
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
      width: 75,
      editable: false,
      headerAlign: 'center' as const,
      align: 'center' as const,
      renderCell: (params: { value: UnitTier }) => {
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
            <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1.5, backgroundColor: colors.bg }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: colors.text, letterSpacing: '0.01em' }}>
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
      width: 140,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
    },
    {
      field: 'autoResult',
      headerName: 'Result',
      width: 120,
      editable: false,
      headerAlign: 'center' as const,
      align: 'center' as const,
      renderCell: (params: { row: TrackedRaceEntry }) => {
        const result = params.row.autoResult
        if (!result) {
          return <Typography sx={{ color: '#9ca3af', fontStyle: 'italic' }}>-</Typography>
        }
        return (
          <Tooltip title={`${result.winnerNumber}. ${result.winnerName}`}>
            <Typography sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {result.winnerNumber}. {result.winnerName}
            </Typography>
          </Tooltip>
        )
      },
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
      valueGetter: (_value: unknown, row: TrackedRaceEntry) => row.layBet?.commissionPercent ?? 5,
      valueSetter: (value: number, row: TrackedRaceEntry) => ({
        ...row,
        layBet: { ...row.layBet, commissionPercent: value || 0 },
      }),
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
      width: 50,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      renderCell: (params: { row: TrackedRaceEntry }) => {
        const isRefreshing = refreshingId === params.row.id
        const hasResult = !!params.row.autoResult

        return (
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
                <CheckCircle size={18} color="#16a34a" />
              ) : (
                <RefreshCw size={18} color="#6b7280" />
              )}
            </IconButton>
          </Tooltip>
        )
      },
    },
  ]

  return (
    <Box sx={{ height: 520, width: '100%' }}>
      <GridComponent
        rows={convertedEntries}
        columns={columns}
        rowHeight={44}
        columnHeaderHeight={48}
        disableRowSelectionOnClick
        processRowUpdate={processRowUpdate}
        initialState={{
          sorting: { sortModel: [{ field: 'time', sort: 'asc' }] },
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
            '&.Mui-selected': {
              backgroundColor: '#eff6ff',
              '&:hover': {
                backgroundColor: '#dbeafe',
              },
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
  )
}
