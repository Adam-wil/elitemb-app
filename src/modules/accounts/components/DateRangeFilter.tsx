'use client'

import { useState } from 'react'
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  TextField,
} from '@mui/material'
import { Calendar, ChevronDown } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface DateRange {
  from: string // YYYY-MM-DD
  to: string // YYYY-MM-DD
}

interface DateRangeFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

interface PresetOption {
  label: string
  days: number
}

// ============================================================================
// Constants
// ============================================================================

const PRESETS: PresetOption[] = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 60 days', days: 60 },
  { label: 'Last 90 days', days: 90 },
]

// ============================================================================
// Helpers
// ============================================================================

function getDateDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function formatDateRange(range: DateRange): string {
  const from = new Date(range.from)
  const to = new Date(range.to)
  const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))

  // Check if it matches a preset
  const preset = PRESETS.find(p => p.days === diffDays)
  if (preset && range.to === getToday()) {
    return preset.label
  }

  // Format as date range
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  return `${formatDate(from)} - ${formatDate(to)}`
}

// ============================================================================
// Component
// ============================================================================

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [customFrom, setCustomFrom] = useState(value.from)
  const [customTo, setCustomTo] = useState(value.to)

  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
    setCustomFrom(value.from)
    setCustomTo(value.to)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handlePresetSelect = (days: number) => {
    onChange({
      from: getDateDaysAgo(days),
      to: getToday(),
    })
    handleClose()
  }

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      onChange({ from: customFrom, to: customTo })
      handleClose()
    }
  }

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<Calendar size={16} />}
        endIcon={<ChevronDown size={16} />}
        onClick={handleClick}
        sx={{
          textTransform: 'none',
          borderColor: '#e0e0e0',
          color: 'text.primary',
          '&:hover': {
            borderColor: '#bdbdbd',
            backgroundColor: '#fafafa',
          },
        }}
      >
        {formatDateRange(value)}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: { width: 280 },
        }}
      >
        {/* Presets */}
        {PRESETS.map(preset => (
          <MenuItem key={preset.days} onClick={() => handlePresetSelect(preset.days)}>
            <ListItemIcon>
              <Calendar size={16} />
            </ListItemIcon>
            <ListItemText>{preset.label}</ListItemText>
          </MenuItem>
        ))}

        <Divider sx={{ my: 1 }} />

        {/* Custom Range */}
        <Box sx={{ px: 2, py: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              label="From"
              type="date"
              size="small"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="To"
              type="date"
              size="small"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
          <Button
            variant="contained"
            size="small"
            fullWidth
            onClick={handleCustomApply}
            disabled={!customFrom || !customTo}
          >
            Apply
          </Button>
        </Box>
      </Menu>
    </>
  )
}
