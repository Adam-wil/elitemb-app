'use client'

import { Box, Typography, Tooltip, CircularProgress } from '@mui/material'
import { Radio, Pause } from 'lucide-react'
import type { PollingStatus } from '../types'

interface PollingIndicatorProps {
  status: PollingStatus
  onToggle?: () => void
}

export function PollingIndicator({ status, onToggle }: PollingIndicatorProps) {
  const { isPolling, lastPollTime, activeRaces, completedRaces } = status

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '-'
    return new Date(isoString).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const tooltipContent = (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="caption" display="block">
        Last poll: {formatTime(lastPollTime)}
      </Typography>
      <Typography variant="caption" display="block">
        Active: {activeRaces} | Completed: {completedRaces}
      </Typography>
    </Box>
  )

  return (
    <Tooltip title={tooltipContent} arrow>
      <Box
        onClick={onToggle}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          backgroundColor: isPolling ? 'success.light' : 'grey.200',
          cursor: onToggle ? 'pointer' : 'default',
          transition: 'background-color 0.2s',
          '&:hover': onToggle ? { opacity: 0.8 } : {},
        }}
      >
        {isPolling ? (
          <>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'success.main',
                animation: 'pulse 1.5s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.4 },
                  '100%': { opacity: 1 },
                },
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 500, color: 'success.dark' }}>
              Auto-polling
            </Typography>
          </>
        ) : (
          <>
            <Pause size={12} />
            <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary' }}>
              Paused
            </Typography>
          </>
        )}
      </Box>
    </Tooltip>
  )
}
