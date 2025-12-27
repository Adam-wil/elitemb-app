'use client'

import { useState } from 'react'
import {
  Box,
  SwipeableDrawer,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Switch,
  TextField,
  InputAdornment,
  Tooltip,
} from '@mui/material'
import { X, Columns, Percent } from 'lucide-react'
import type { ColumnVisibility, StateCommission } from './TrackerSidePanel'

interface MobileSettingsDrawerProps {
  open: boolean
  onClose: () => void
  onOpen: () => void
  columnVisibility: ColumnVisibility[]
  onToggleColumn: (columnId: string) => void
  stateCommissions: StateCommission[]
  onUpdateStateCommission: (stateId: string, rate: number) => void
}

type TabId = 'columns' | 'commission'

export function MobileSettingsDrawer({
  open,
  onClose,
  onOpen,
  columnVisibility,
  onToggleColumn,
  stateCommissions,
  onUpdateStateCommission,
}: MobileSettingsDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('columns')
  const visibleCount = columnVisibility.filter((c) => c.visible).length

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={onOpen}
      disableSwipeToOpen={false}
      swipeAreaWidth={20}
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: '70vh',
          overflow: 'visible',
        },
      }}
    >
      {/* Puller handle */}
      <Box
        sx={{
          width: 40,
          height: 6,
          backgroundColor: '#d1d5db',
          borderRadius: 3,
          position: 'absolute',
          top: 8,
          left: 'calc(50% - 20px)',
        }}
      />

      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pt: 3,
          pb: 1,
          px: 2,
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Settings
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        variant="fullWidth"
        sx={{
          borderBottom: '1px solid #e5e7eb',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            minHeight: 48,
          },
        }}
      >
        <Tab
          icon={<Columns size={18} />}
          iconPosition="start"
          label="Columns"
          value="columns"
        />
        <Tab
          icon={<Percent size={18} />}
          iconPosition="start"
          label="Commission"
          value="commission"
        />
      </Tabs>

      {/* Tab Content */}
      <Box
        sx={{
          p: 2,
          overflow: 'auto',
          maxHeight: 'calc(70vh - 140px)',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}
      >
        {activeTab === 'columns' && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: '#1a1a1a',
                  letterSpacing: '0.05em',
                }}
              >
                Visible Columns ({visibleCount}/{columnVisibility.length})
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {columnVisibility.map((col) => (
                <Box
                  key={col.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1.5,
                    borderRadius: 2,
                    backgroundColor: col.visible ? '#eff6ff' : '#fff',
                    border: '1.5px solid',
                    borderColor: col.visible ? '#3b82f6' : '#d1d5db',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.15s',
                    cursor: 'pointer',
                    minHeight: 48,
                    '&:hover': {
                      backgroundColor: col.visible ? '#dbeafe' : '#f9fafb',
                      borderColor: col.visible ? '#2563eb' : '#9ca3af',
                    },
                    '&:active': {
                      transform: 'scale(0.98)',
                    },
                  }}
                  onClick={() => onToggleColumn(col.id)}
                >
                  <Typography
                    sx={{ fontSize: '0.9375rem', fontWeight: 500, color: '#1a1a1a' }}
                  >
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: '#1a1a1a',
                  letterSpacing: '0.05em',
                }}
              >
                Betfair Commission Rates
              </Typography>
            </Box>

            <Typography sx={{ fontSize: '0.8125rem', color: '#6b7280', mb: 2 }}>
              Set commission rates by Australian state/territory
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {stateCommissions.map((state) => (
                <Box
                  key={state.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1.5,
                    borderRadius: 2,
                    backgroundColor: '#fff',
                    border: '1.5px solid #d1d5db',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    minHeight: 48,
                  }}
                >
                  <Tooltip title={state.label} placement="right">
                    <Typography
                      sx={{
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        color: '#1a1a1a',
                        minWidth: 50,
                      }}
                    >
                      {state.shortLabel}
                    </Typography>
                  </Tooltip>
                  <TextField
                    size="small"
                    type="number"
                    value={state.rate}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0
                      onUpdateStateCommission(state.id, value)
                    }}
                    inputProps={{
                      step: 0.5,
                      min: 0,
                      max: 100,
                      style: { textAlign: 'right', padding: '8px 12px', fontSize: '0.9375rem' },
                    }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    sx={{
                      width: 110,
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
    </SwipeableDrawer>
  )
}
