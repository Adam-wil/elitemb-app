import { useState, useEffect } from 'react'
import {
  Box,
  Select,
  MenuItem,
  ListSubheader,
  Typography,
  InputAdornment,
  type SelectChangeEvent,
} from '@mui/material'
import { Globe, ChevronDown } from 'lucide-react'
import {
  TIMEZONES,
  getSavedTimezone,
  saveTimezone,
  getOffsetDifference,
} from '../utils/timezones'

interface TimezoneSelectorProps {
  selectedDate: string // YYYY-MM-DD format for DST calculation
  value: string
  onChange: (timezoneId: string) => void
}

// Group timezones by region for the dropdown
const TIMEZONE_GROUPS = [
  {
    label: 'Asia',
    timezones: ['hongkong', 'singapore', 'tokyo'],
  },
  {
    label: 'Australia',
    timezones: ['perth', 'brisbane', 'melbourne'],
  },
  {
    label: 'Pacific',
    timezones: ['auckland'],
  },
]

export function TimezoneSelector({
  selectedDate,
  value,
  onChange,
}: TimezoneSelectorProps) {
  const [mounted, setMounted] = useState(false)

  // Handle hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleChange = (event: SelectChangeEvent<string>) => {
    const newValue = event.target.value
    onChange(newValue)
    saveTimezone(newValue)
  }

  if (!mounted) {
    return null
  }

  const selectedTz = TIMEZONES.find((tz) => tz.id === value)
  const offset = getOffsetDifference(selectedDate, value)

  return (
    <Select
      value={value}
      onChange={handleChange}
      size="small"
      IconComponent={(props) => <ChevronDown size={16} {...props} />}
      startAdornment={
        <InputAdornment position="start">
          <Globe size={16} style={{ opacity: 0.7 }} />
        </InputAdornment>
      }
      renderValue={() => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" fontWeight={500}>
            {selectedTz?.shortLabel}
          </Typography>
          {offset.label && (
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', ml: 0.5 }}
            >
              ({offset.label})
            </Typography>
          )}
        </Box>
      )}
      sx={{
        minWidth: 140,
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: 'divider',
        },
        '& .MuiSelect-select': {
          py: 0.75,
          pl: 0.5,
          display: 'flex',
          alignItems: 'center',
        },
        '& .MuiInputAdornment-root': {
          mr: 0.5,
        },
      }}
      MenuProps={{
        PaperProps: {
          sx: {
            maxHeight: 300,
            '& .MuiMenuItem-root': {
              py: 1,
            },
          },
        },
      }}
    >
      {TIMEZONE_GROUPS.map((group) => [
        <ListSubheader
          key={group.label}
          sx={{
            backgroundColor: 'background.paper',
            fontWeight: 600,
            fontSize: '0.75rem',
            color: 'text.secondary',
            lineHeight: '32px',
          }}
        >
          {group.label}
        </ListSubheader>,
        ...group.timezones.map((tzId) => {
          const tz = TIMEZONES.find((t) => t.id === tzId)
          if (!tz) return null
          const tzOffset = getOffsetDifference(selectedDate, tz.id)
          return (
            <MenuItem key={tz.id} value={tz.id}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {tz.shortLabel}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {tz.label}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    ml: 2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tzOffset.label || 'Source'}
                </Typography>
              </Box>
            </MenuItem>
          )
        }),
      ])}
    </Select>
  )
}

// Hook for managing timezone state with persistence
export function useTimezone() {
  const [timezone, setTimezone] = useState('melbourne')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = getSavedTimezone()
    setTimezone(saved)
  }, [])

  const updateTimezone = (newTimezone: string) => {
    setTimezone(newTimezone)
    saveTimezone(newTimezone)
  }

  return {
    timezone,
    setTimezone: updateTimezone,
    mounted,
  }
}
