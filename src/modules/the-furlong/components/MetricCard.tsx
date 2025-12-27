'use client'

import { Box, Paper, Typography } from '@mui/material'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  iconColor: string
  iconBgColor: string
  valueColor?: string
  compact?: boolean
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBgColor,
  valueColor,
  compact = false,
}: MetricCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: compact ? 1.5 : 2,
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        backgroundColor: '#fff',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        {/* Icon */}
        <Box
          sx={{
            width: compact ? 36 : 44,
            height: compact ? 36 : 44,
            borderRadius: compact ? 1.5 : 2,
            backgroundColor: iconBgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={compact ? 18 : 22} color={iconColor} strokeWidth={2} />
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              color: '#6b7280',
              fontWeight: 500,
              textTransform: 'uppercase',
              fontSize: compact ? '0.65rem' : '0.7rem',
              letterSpacing: '0.025em',
              display: 'block',
              mb: 0.25,
            }}
          >
            {title}
          </Typography>

          <Typography
            variant={compact ? 'h6' : 'h5'}
            sx={{
              fontWeight: 700,
              color: valueColor || '#111827',
              lineHeight: 1.2,
              fontSize: compact ? '1.1rem' : '1.5rem',
            }}
          >
            {value}
          </Typography>

          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                color: '#9ca3af',
                fontSize: compact ? '0.65rem' : '0.75rem',
                display: 'block',
                mt: 0.25,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  )
}
