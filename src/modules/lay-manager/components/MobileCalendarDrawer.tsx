'use client'

import { useMemo } from 'react'
import { Box, SwipeableDrawer, Typography, IconButton } from '@mui/material'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { PickersDay, type PickersDayProps } from '@mui/x-date-pickers/PickersDay'
import { X } from 'lucide-react'
import type { Dayjs } from 'dayjs'

interface MobileCalendarDrawerProps {
  open: boolean
  onClose: () => void
  onOpen: () => void
  selectedDate: Dayjs | null
  onDateChange: (date: Dayjs | null) => void
  datesWithPlans: string[]
}

// Custom day component with indicator dot for dates with data
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

export function MobileCalendarDrawer({
  open,
  onClose,
  onOpen,
  selectedDate,
  onDateChange,
  datesWithPlans,
}: MobileCalendarDrawerProps) {
  const dayRenderer = useMemo(
    () => (props: PickersDayProps<Dayjs>) => (
      <CustomDay {...props} datesWithPlans={datesWithPlans} />
    ),
    [datesWithPlans]
  )

  const handleDateChange = (date: Dayjs | null) => {
    onDateChange(date)
    // Close drawer after selecting a date
    onClose()
  }

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
          maxHeight: '60vh',
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
          Select Date
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </Box>

      {/* Calendar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          pb: 2,
          // iOS safe area bottom padding
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}
      >
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateCalendar
            value={selectedDate}
            onChange={handleDateChange}
            slots={{
              day: dayRenderer,
            }}
            sx={{
              width: '100%',
              maxWidth: 360,
              '& .MuiPickersCalendarHeader-root': {
                paddingLeft: 2,
                paddingRight: 2,
              },
              '& .MuiDayCalendar-weekContainer': {
                justifyContent: 'space-around',
              },
            }}
          />
        </LocalizationProvider>
      </Box>
    </SwipeableDrawer>
  )
}
