import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Alert,
  Snackbar,
} from '@mui/material'
import { Warehouse, Clock, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import {
  useBonusData,
  StableDataGrid,
  ExpiryBanner,
  getBonusesExpiringWithin,
} from '@/modules/the-stable'

export const Route = createFileRoute('/dashboard/the-furlong/the-stable')({
  component: TheStablePage,
})

function TheStablePage() {
  const {
    bonuses,
    summary,
    loading,
    addBonus,
    updateBonus,
    deleteBonus,
    markAsTurnedOver,
    markAsExpired,
    markAsCancelled,
    splitBonus,
    checkAndMarkExpired,
  } = useBonusData()

  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Check for expired bonuses on load
  useEffect(() => {
    const expiredCount = checkAndMarkExpired()
    if (expiredCount > 0) {
      setSuccessMessage(`${expiredCount} bonus${expiredCount !== 1 ? 'es' : ''} marked as expired`)
      setSuccess(true)
    }
  }, [checkAndMarkExpired])

  // Get bonuses expiring soon for banner
  const expiringBonuses = getBonusesExpiringWithin(3)

  // Handle add bonus with success message
  const handleAddBonus = (params: Parameters<typeof addBonus>[0]) => {
    addBonus(params)
    setSuccessMessage(`Added ${params.bookie} bonus: $${params.amount}`)
    setSuccess(true)
  }

  // Handle turnover with success message
  const handleMarkTurnedOver = (id: string, profit?: number) => {
    const bonus = bonuses.find((b) => b.id === id)
    markAsTurnedOver(id, profit)
    if (bonus) {
      setSuccessMessage(
        `Turned over ${bonus.bookie} $${bonus.amount}${profit !== undefined ? ` with $${profit.toFixed(2)} profit` : ''}`
      )
      setSuccess(true)
    }
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Warehouse size={28} />
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          The Stable
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Bonus Holding Pen
        </Typography>
      </Box>

      {/* Expiry Banner */}
      <ExpiryBanner expiringBonuses={expiringBonuses} />

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Clock size={18} color="#1565c0" />
                <Typography variant="body2" color="text.secondary">
                  Pending
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {summary.totalPending}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ${summary.totalPendingValue.toFixed(0)} total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card variant="outlined" sx={{ borderColor: expiringBonuses.length > 0 ? 'warning.main' : undefined }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <AlertTriangle size={18} color="#ed6c02" />
                <Typography variant="body2" color="text.secondary">
                  Expiring Soon
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: expiringBonuses.length > 0 ? 'warning.main' : undefined }}>
                {summary.expiringWithin3Days}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                within 3 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <CheckCircle size={18} color="#2e7d32" />
                <Typography variant="body2" color="text.secondary">
                  Turned Over
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {summary.turnedOverThisMonth}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                this month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <TrendingUp size={18} color="#2e7d32" />
                <Typography variant="body2" color="text.secondary">
                  Bonus Profit
                </Typography>
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: summary.bonusTurnoverProfitThisMonth >= 0 ? 'success.main' : 'error.main',
                }}
              >
                ${summary.bonusTurnoverProfitThisMonth.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                this month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <AlertTriangle size={18} color="#d32f2f" />
                <Typography variant="body2" color="text.secondary">
                  Expired
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: 'error.main' }}>
                {summary.expiredThisMonth}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                this month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Data Grid */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          flexGrow: 1,
          border: '1.5px solid #d1d5db',
          borderRadius: 1,
        }}
      >
        <StableDataGrid
          bonuses={bonuses}
          onMarkTurnedOver={handleMarkTurnedOver}
          onMarkExpired={markAsExpired}
          onMarkCancelled={markAsCancelled}
          onUpdateBonus={updateBonus}
          onDeleteBonus={deleteBonus}
          onAddBonus={handleAddBonus}
          onSplitBonus={splitBonus}
        />
      </Paper>

      <Snackbar
        open={success}
        autoHideDuration={5000}
        onClose={() => setSuccess(false)}
        message={successMessage}
      />
    </Box>
  )
}
