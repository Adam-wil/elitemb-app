'use client'

import { Paper, BottomNavigation, BottomNavigationAction, Badge } from '@mui/material'
import { Calendar, Settings, Plus } from 'lucide-react'

interface MobileBottomNavProps {
  onCalendarClick: () => void
  onSettingsClick: () => void
  onAddClick: () => void
  hasCalendarData?: boolean
}

export function MobileBottomNav({
  onCalendarClick,
  onSettingsClick,
  onAddClick,
  hasCalendarData = false,
}: MobileBottomNavProps) {
  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        borderTop: '1px solid #e5e7eb',
        // iOS safe area handling
        pb: 'env(safe-area-inset-bottom)',
      }}
      elevation={3}
    >
      <BottomNavigation
        showLabels
        sx={{
          height: 64,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 80,
            py: 1,
            '&:hover': {
              backgroundColor: '#f3f4f6',
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.75rem',
            fontWeight: 500,
            mt: 0.5,
          },
        }}
      >
        <BottomNavigationAction
          label="Calendar"
          icon={
            <Badge
              variant="dot"
              color="primary"
              invisible={!hasCalendarData}
              sx={{
                '& .MuiBadge-dot': {
                  top: 2,
                  right: 2,
                },
              }}
            >
              <Calendar size={24} />
            </Badge>
          }
          onClick={onCalendarClick}
          sx={{ color: '#6b7280' }}
        />
        <BottomNavigationAction
          label="Add"
          icon={
            <Plus
              size={28}
              style={{
                backgroundColor: '#3b82f6',
                color: '#fff',
                borderRadius: '50%',
                padding: 4,
              }}
            />
          }
          onClick={onAddClick}
          sx={{
            '& .MuiBottomNavigationAction-label': {
              color: '#3b82f6',
              fontWeight: 600,
            },
          }}
        />
        <BottomNavigationAction
          label="Settings"
          icon={<Settings size={24} />}
          onClick={onSettingsClick}
          sx={{ color: '#6b7280' }}
        />
      </BottomNavigation>
    </Paper>
  )
}
