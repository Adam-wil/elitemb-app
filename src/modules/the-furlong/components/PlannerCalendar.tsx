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
      <Box sx={{ display: 'flex', height: '100%' }}>
        <Paper
          sx={{
            overflow: 'hidden',
            display: 'flex',
            transition: 'width 0.3s ease',
            width: expanded ? 320 : 0,
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
            onClick={onToggleExpand}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              cursor: 'pointer',
              borderLeft: expanded ? '1px solid' : 'none',
              borderColor: 'divider',
              '&:hover': { backgroundColor: 'action.hover' },
            }}
          >
            <IconButton size="small" sx={{ p: 0.5 }}>
              {expanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </IconButton>
            {!expanded && (
              <Box
                sx={{
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                  transform: 'rotate(180deg)',
                  mt: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <Calendar size={16} />
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  {selectedDate?.format('MMM D')}
                </Typography>
              </Box>
            )}
          </Paper>
        </Tooltip>
      </Box>
    </LocalizationProvider>
  )
}
