/**
 * Expiry Banner Component
 * Shows warning when bonuses are expiring soon
 */

import { Box, Typography, Alert, AlertTitle, Chip, Stack } from '@mui/material'
import { AlertTriangle, Clock } from 'lucide-react'
import dayjs from 'dayjs'
import type { Bonus } from '../types'

interface ExpiryBannerProps {
  expiringBonuses: Bonus[]
  onBonusClick?: (bonusId: string) => void
}

export function ExpiryBanner({ expiringBonuses, onBonusClick }: ExpiryBannerProps) {
  if (expiringBonuses.length === 0) return null

  const today = dayjs()

  // Group by urgency
  const expiringToday = expiringBonuses.filter((b) => b.expiryDate === today.format('YYYY-MM-DD'))
  const expiringTomorrow = expiringBonuses.filter(
    (b) => b.expiryDate === today.add(1, 'day').format('YYYY-MM-DD')
  )
  const expiringLater = expiringBonuses.filter((b) => {
    const expiry = dayjs(b.expiryDate)
    return expiry.diff(today, 'day') >= 2
  })

  const totalValue = expiringBonuses.reduce((sum, b) => sum + b.amount, 0)

  return (
    <Alert
      severity="warning"
      icon={<AlertTriangle size={20} />}
      sx={{
        mb: 2,
        '& .MuiAlert-message': {
          width: '100%',
        },
      }}
    >
      <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Clock size={16} />
        {expiringBonuses.length} Bonus{expiringBonuses.length !== 1 ? 'es' : ''} Expiring Soon -
        ${totalValue.toFixed(0)} at risk
      </AlertTitle>

      <Stack spacing={1} sx={{ mt: 1 }}>
        {expiringToday.length > 0 && (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.main' }}>
              Expires TODAY:
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
              {expiringToday.map((bonus) => (
                <Chip
                  key={bonus.id}
                  label={`${bonus.bookie} $${bonus.amount}`}
                  size="small"
                  color="error"
                  onClick={() => onBonusClick?.(bonus.id)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Stack>
          </Box>
        )}

        {expiringTomorrow.length > 0 && (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'warning.dark' }}>
              Expires TOMORROW:
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
              {expiringTomorrow.map((bonus) => (
                <Chip
                  key={bonus.id}
                  label={`${bonus.bookie} $${bonus.amount}`}
                  size="small"
                  color="warning"
                  onClick={() => onBonusClick?.(bonus.id)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Stack>
          </Box>
        )}

        {expiringLater.length > 0 && (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Expires within 3 days:
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
              {expiringLater.map((bonus) => (
                <Chip
                  key={bonus.id}
                  label={`${bonus.bookie} $${bonus.amount} (${dayjs(bonus.expiryDate).format('ddd')})`}
                  size="small"
                  variant="outlined"
                  onClick={() => onBonusClick?.(bonus.id)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </Alert>
  )
}
