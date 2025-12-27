'use client'

import { ToggleButton, ToggleButtonGroup, useTheme, useMediaQuery } from '@mui/material'
import type { TimePeriod } from '../types'
import { TIME_PERIOD_CONFIG } from '../types'

interface TimePeriodSelectorProps {
  value: TimePeriod
  onChange: (period: TimePeriod) => void
}

const PERIODS: TimePeriod[] = ['week', 'month', 'quarter', 'year']

export function TimePeriodSelector({ value, onChange }: TimePeriodSelectorProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const handleChange = (_: React.MouseEvent<HTMLElement>, newValue: TimePeriod | null) => {
    if (newValue !== null) {
      onChange(newValue)
    }
  }

  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={handleChange}
      size={isMobile ? 'small' : 'medium'}
      sx={{
        backgroundColor: '#f3f4f6',
        borderRadius: 2,
        p: 0.5,
        '& .MuiToggleButton-root': {
          border: 'none',
          borderRadius: 1.5,
          px: isMobile ? 1.5 : 2.5,
          py: isMobile ? 0.5 : 0.75,
          fontSize: isMobile ? '0.75rem' : '0.875rem',
          fontWeight: 500,
          color: '#6b7280',
          textTransform: 'none',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
          '&.Mui-selected': {
            backgroundColor: '#fff',
            color: '#111827',
            fontWeight: 600,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              backgroundColor: '#fff',
            },
          },
        },
      }}
    >
      {PERIODS.map((period) => (
        <ToggleButton key={period} value={period}>
          {isMobile ? TIME_PERIOD_CONFIG[period].shortLabel : TIME_PERIOD_CONFIG[period].label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
