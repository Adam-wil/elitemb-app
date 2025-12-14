'use client'

import { useState } from 'react'
import { Box, Paper, IconButton, Typography, Tooltip, Switch, TextField, InputAdornment } from '@mui/material'
import { ChevronLeft, ChevronRight, Columns, Percent } from 'lucide-react'

// Column visibility configuration
export interface ColumnVisibility {
  id: string
  label: string
  visible: boolean
}

export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility[] = [
  { id: 'time', label: 'Time', visible: true },
  { id: 'track', label: 'Track', visible: true },
  { id: 'raceNumber', label: 'Race', visible: true },
  { id: 'unitTier', label: 'Units', visible: true },
  { id: 'selectionNumber', label: '#', visible: true },
  { id: 'selectionName', label: 'Selection', visible: true },
  { id: 'bookie', label: 'Bookie', visible: true },
  { id: 'backStake', label: 'Back $', visible: true },
  { id: 'backOdds', label: 'Back Odds', visible: true },
  { id: 'layStake', label: 'Lay $', visible: false },
  { id: 'layOdds', label: 'Lay Odds', visible: false },
  { id: 'layCommission', label: 'Comm%', visible: false },
  { id: 'autoResult', label: 'Result', visible: true },
  { id: 'outcome', label: 'Outcome', visible: true },
  { id: 'actions', label: 'Actions', visible: true },
]

// Australian state commission rates
export interface StateCommission {
  id: string
  label: string
  shortLabel: string
  rate: number
}

/**
 * Default Betfair commission rates by state/territory (HORSES ONLY).
 *
 * DEVELOPERS: Update these rates when Betfair changes their commission structure.
 * Rates are based on Point of Consumption (POC) tax which varies by jurisdiction.
 * These rates apply to horse racing markets only - other sports may differ.
 * Check Betfair's official commission page for current rates.
 * Last updated: December 2024
 */
export const DEFAULT_STATE_COMMISSIONS: StateCommission[] = [
  { id: 'act', label: 'Australian Capital Territory', shortLabel: 'ACT', rate: 10 },
  { id: 'nsw', label: 'New South Wales', shortLabel: 'NSW', rate: 10 },
  { id: 'nt', label: 'Northern Territory', shortLabel: 'NT', rate: 8 },
  { id: 'nz', label: 'New Zealand', shortLabel: 'NZ', rate: 6 },
  { id: 'qld', label: 'Queensland', shortLabel: 'QLD', rate: 8 },
  { id: 'sa', label: 'South Australia', shortLabel: 'SA', rate: 8 },
  { id: 'tas', label: 'Tasmania', shortLabel: 'TAS', rate: 8 },
  { id: 'vic', label: 'Victoria', shortLabel: 'VIC', rate: 8 },
  { id: 'wa', label: 'Western Australia', shortLabel: 'WA', rate: 8 },
  { id: 'int', label: 'International', shortLabel: 'INT', rate: 6 },
]

type TabId = 'columns' | 'commission'

interface TrackerSidePanelProps {
  expanded: boolean
  onToggleExpand: () => void
  columnVisibility: ColumnVisibility[]
  onToggleColumn: (columnId: string) => void
  stateCommissions?: StateCommission[]
  onUpdateStateCommission?: (stateId: string, rate: number) => void
}

export function TrackerSidePanel({
  expanded,
  onToggleExpand,
  columnVisibility,
  onToggleColumn,
  stateCommissions = DEFAULT_STATE_COMMISSIONS,
  onUpdateStateCommission,
}: TrackerSidePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('columns')
  const visibleCount = columnVisibility.filter(c => c.visible).length

  const tabs = [
    { id: 'columns' as TabId, icon: Columns, label: 'Columns' },
    { id: 'commission' as TabId, icon: Percent, label: 'Commission' },
  ]

  const handleTabClick = (tabId: TabId) => {
    if (!expanded) {
      onToggleExpand()
    }
    setActiveTab(tabId)
  }

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Panel Content */}
      <Paper
        elevation={0}
        sx={{
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s ease',
          width: expanded ? 240 : 0,
          height: '100%',
          border: expanded ? '1.5px solid #d1d5db' : 'none',
          borderRadius: 1,
          backgroundColor: '#fff',
        }}
      >
        {expanded && (
          <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            {activeTab === 'columns' && (
              <>
                {/* Column Visibility Toggles */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Columns size={18} color="#1a1a1a" />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#1a1a1a', letterSpacing: '0.05em' }}>
                    Columns ({visibleCount}/{columnVisibility.length})
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {columnVisibility.map((col) => (
                    <Box
                      key={col.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 1.5,
                        py: 0.75,
                        borderRadius: 1,
                        backgroundColor: col.visible ? '#eff6ff' : '#fff',
                        border: '1.5px solid',
                        borderColor: col.visible ? '#3b82f6' : '#d1d5db',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        transition: 'all 0.15s',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: col.visible ? '#dbeafe' : '#f9fafb',
                          borderColor: col.visible ? '#2563eb' : '#9ca3af',
                        },
                      }}
                      onClick={() => onToggleColumn(col.id)}
                    >
                      <Typography sx={{ fontSize: '0.813rem', fontWeight: 500, color: '#1a1a1a' }}>
                        {col.label}
                      </Typography>
                      <Switch
                        size="small"
                        checked={col.visible}
                        onChange={() => onToggleColumn(col.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Box>
                  ))}
                </Box>
              </>
            )}

            {activeTab === 'commission' && (
              <>
                {/* Commission Rate Settings */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Percent size={18} color="#1a1a1a" />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#1a1a1a', letterSpacing: '0.05em' }}>
                    Betfair Commission
                  </Typography>
                </Box>

                <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', mb: 2 }}>
                  Set commission rates by Australian state/territory
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {stateCommissions.map((state) => (
                    <Box
                      key={state.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 1.5,
                        py: 1,
                        borderRadius: 1,
                        backgroundColor: '#fff',
                        border: '1.5px solid #d1d5db',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                    >
                      <Tooltip title={state.label} placement="left">
                        <Typography sx={{ fontSize: '0.813rem', fontWeight: 600, color: '#1a1a1a', minWidth: 40 }}>
                          {state.shortLabel}
                        </Typography>
                      </Tooltip>
                      <TextField
                        size="small"
                        type="number"
                        value={state.rate}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0
                          onUpdateStateCommission?.(state.id, value)
                        }}
                        inputProps={{
                          step: 0.5,
                          min: 0,
                          max: 100,
                          style: { textAlign: 'right', padding: '4px 8px' }
                        }}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">%</InputAdornment>,
                        }}
                        sx={{
                          width: 100,
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#fff',
                          },
                          '& .MuiInputAdornment-root': {
                            marginLeft: 0,
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Box>
        )}
      </Paper>

      {/* Right Tab Bar */}
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          alignSelf: 'flex-start',
          width: 48,
          pt: 1,
          pb: 1,
          gap: 0.5,
          backgroundColor: '#fafafa',
          border: '1.5px solid #d1d5db',
          borderRadius: 1,
        }}
      >
        {/* Toggle arrow */}
        <IconButton
          size="small"
          onClick={onToggleExpand}
          sx={{
            p: 0.5,
            color: '#1a1a1a',
            '&:hover': { backgroundColor: '#e5e7eb' },
          }}
        >
          {expanded ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </IconButton>

        <Box sx={{ width: '70%', height: 1, backgroundColor: '#e5e7eb', my: 0.5 }} />

        {/* Tab buttons */}
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id && expanded
          return (
            <Tooltip key={tab.id} title={tab.label} placement="left">
              <IconButton
                size="small"
                onClick={() => handleTabClick(tab.id)}
                sx={{
                  p: 1,
                  color: isActive ? '#3b82f6' : '#6b7280',
                  backgroundColor: isActive ? '#eff6ff' : 'transparent',
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: isActive ? '#dbeafe' : '#f3f4f6',
                  },
                }}
              >
                <Icon size={18} />
              </IconButton>
            </Tooltip>
          )
        })}
      </Paper>
    </Box>
  )
}
