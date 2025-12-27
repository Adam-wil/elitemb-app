'use client'

import { Box, Paper, IconButton, Badge, Tooltip } from '@mui/material'
import { Calendar, Lock, Archive, Upload } from 'lucide-react'

interface MobilePlannerBottomNavProps {
  onCalendarOpen: () => void
  onLockInClick: () => void
  onArchiveClick: (event: React.MouseEvent<HTMLElement>) => void
  onImportClick: () => void
  selectedCount: number
  hasArchive: boolean
  loading?: boolean
}

export function MobilePlannerBottomNav({
  onCalendarOpen,
  onLockInClick,
  onArchiveClick,
  onImportClick,
  selectedCount,
  hasArchive,
  loading,
}: MobilePlannerBottomNavProps) {
  return (
    <Paper
      elevation={4}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1200, // Higher than dashboard bottom nav (1100)
        borderTop: '1px solid #e5e7eb',
        backgroundColor: '#ffffff',
        // iOS safe area
        pb: 'env(safe-area-inset-bottom)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          py: 1,
          px: 2,
          height: 64,
        }}
      >
        {/* Calendar */}
        <Tooltip title="Select Date">
          <IconButton
            onClick={onCalendarOpen}
            sx={{
              flexDirection: 'column',
              borderRadius: 2,
              px: 3,
              py: 1,
              color: '#6b7280',
              '&:hover': {
                backgroundColor: '#f3f4f6',
                color: '#3b82f6',
              },
            }}
          >
            <Calendar size={24} />
            <Box
              component="span"
              sx={{
                fontSize: '0.65rem',
                fontWeight: 500,
                mt: 0.25,
              }}
            >
              Date
            </Box>
          </IconButton>
        </Tooltip>

        {/* Lock In */}
        <Tooltip title={selectedCount > 0 ? `Lock in ${selectedCount} race(s)` : 'Select races to lock in'}>
          <span>
            <IconButton
              onClick={onLockInClick}
              disabled={selectedCount === 0}
              sx={{
                flexDirection: 'column',
                borderRadius: 2,
                px: 3,
                py: 1,
                color: selectedCount > 0 ? '#3b82f6' : '#9ca3af',
                '&:hover:not(:disabled)': {
                  backgroundColor: '#eff6ff',
                },
                '&:disabled': {
                  color: '#d1d5db',
                },
              }}
            >
              <Badge
                badgeContent={selectedCount}
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.65rem',
                    height: 16,
                    minWidth: 16,
                  },
                }}
              >
                <Lock size={24} />
              </Badge>
              <Box
                component="span"
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 500,
                  mt: 0.25,
                }}
              >
                Lock In
              </Box>
            </IconButton>
          </span>
        </Tooltip>

        {/* Archive */}
        <Tooltip title="Archive options">
          <IconButton
            onClick={onArchiveClick}
            sx={{
              flexDirection: 'column',
              borderRadius: 2,
              px: 3,
              py: 1,
              color: hasArchive ? '#3b82f6' : '#6b7280',
              '&:hover': {
                backgroundColor: '#f3f4f6',
              },
            }}
          >
            <Archive size={24} />
            <Box
              component="span"
              sx={{
                fontSize: '0.65rem',
                fontWeight: 500,
                mt: 0.25,
              }}
            >
              Archive
            </Box>
          </IconButton>
        </Tooltip>

        {/* Import */}
        <Tooltip title="Import plan">
          <IconButton
            onClick={onImportClick}
            disabled={loading}
            sx={{
              flexDirection: 'column',
              borderRadius: 2,
              px: 3,
              py: 1,
              color: '#6b7280',
              '&:hover:not(:disabled)': {
                backgroundColor: '#f3f4f6',
                color: '#3b82f6',
              },
              '&:disabled': {
                color: '#d1d5db',
              },
            }}
          >
            <Upload size={24} />
            <Box
              component="span"
              sx={{
                fontSize: '0.65rem',
                fontWeight: 500,
                mt: 0.25,
              }}
            >
              Import
            </Box>
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  )
}
