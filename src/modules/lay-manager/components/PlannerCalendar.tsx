import { useMemo } from 'react'
import { Box, Paper, IconButton, Typography, Tooltip } from '@mui/material'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { PickersDay, type PickersDayProps } from '@mui/x-date-pickers/PickersDay'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import type { Dayjs } from 'dayjs'

interface PlannerCalendarProps {
  selectedDate: Dayjs | null
  onDateChange: (date: Dayjs | null) => void
  datesWithPlans: string[]
  expanded: boolean
  onToggleExpand: () => void
}

function CustomDay(
  props: PickersDayProps<Dayjs> & { datesWithPlans: string[] }
) {
  const { day, datesWithPlans, ...other } = props
  const dateStr = day.format('YYYY-MM-DD')
  const hasPlan = datesWithPlans.includes(dateStr)

  return (
    <Box sx={{ position: 'relative' }}>
      <PickersDay {...other} day={day} />
      {hasPlan && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 2,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: 'primary.main',
          }}
        />
      )}
    </Box>
  )
}

export function PlannerCalendar({
  selectedDate,
  onDateChange,
  datesWithPlans,
  expanded,
  onToggleExpand,
}: PlannerCalendarProps) {
  const dayRenderer = useMemo(
    () => (props: PickersDayProps<Dayjs>) => (
      <CustomDay {...props} datesWithPlans={datesWithPlans} />
    ),
    [datesWithPlans]
  )

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ display: 'flex', height: '100%', alignItems: 'flex-start' }}>
        <Paper
          elevation={0}
          sx={{
            overflow: 'hidden',
            display: 'flex',
            transition: 'width 0.3s ease',
            width: expanded ? 320 : 0,
            border: expanded ? '1.5px solid #d1d5db' : 'none',
            borderRadius: 1,
          }}
        >
          {expanded && (
            <DateCalendar
              value={selectedDate}
              onChange={onDateChange}
              slots={{
                day: dayRenderer,
              }}
              sx={{
                width: 320,
                '& .MuiPickersCalendarHeader-root': {
                  paddingLeft: 2,
                  paddingRight: 2,
                },
                '& .MuiDayCalendar-weekContainer': {
                  justifyContent: 'space-around',
                },
              }}
            />
          )}
        </Paper>

        {/* Toggle Button */}
        <Tooltip title={expanded ? 'Collapse calendar' : 'Expand calendar'} placement="right">
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
              border: '1.5px solid #d1d5db',
              borderRadius: 1,
              backgroundColor: '#fafafa',
            }}
          >
            <IconButton
              size="small"
              onClick={onToggleExpand}
              sx={{
                p: 0.5,
                color: '#1a1a1a',
                '&:hover': { backgroundColor: '#e5e7eb' },
              }}
            >
              {expanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </IconButton>

            <Box sx={{ width: '70%', height: 1, backgroundColor: '#e5e7eb', my: 0.5 }} />

            <Tooltip title="Calendar" placement="right">
              <IconButton
                size="small"
                onClick={onToggleExpand}
                sx={{
                  p: 1,
                  color: '#6b7280',
                  borderRadius: 1,
                  '&:hover': { backgroundColor: '#f3f4f6' },
                }}
              >
                <Calendar size={18} />
              </IconButton>
            </Tooltip>
          </Paper>
        </Tooltip>
      </Box>
    </LocalizationProvider>
  )
}
