/**
 * Dev Seed Page
 *
 * Seeds test data to prove the Lay Manager → Journal → Ledger flow works.
 * Navigate to /dev-seed to use.
 */

import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Box, Button, Typography, Paper, Stack, Alert, CircularProgress } from '@mui/material'
import { Database, RefreshCw } from 'lucide-react'
import { seedDevData, clearDevData } from '@/modules/accounts/api/db/devSeed.server'

export const Route = createFileRoute('/dev-seed')({
  component: DevSeedPage,
})

function DevSeedPage() {
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSeed = async (force: boolean = false) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await seedDevData({ data: { force } })
      setResult(res.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed data')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await clearDevData({ data: {} })
      setResult(res.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Dev Seed
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Seeds test data using the REAL Lay Manager flow to prove the accounting system works.
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Test Data Created:
        </Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
          <li><strong>1/W</strong> - Sportsbet cash bet that WON (back wins)</li>
          <li><strong>2/L</strong> - PointsBet cash bet that LOST (lay wins)</li>
          <li><strong>Bonus WIN</strong> - Neds bonus bet that WON</li>
          <li><strong>Bonus LOSS</strong> - Sportsbet bonus bet that LOST</li>
          <li><strong>PENDING</strong> - Sportsbet bet awaiting result</li>
        </Typography>
        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
          Each creates Lay Manager entry → BET_PLACED journal → BET_SETTLED journal (on outcome)
        </Typography>
      </Paper>

      <Stack spacing={2}>
        <Button
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Database size={20} />}
          onClick={() => handleSeed(false)}
          disabled={loading}
          fullWidth
        >
          Seed Test Data
        </Button>

        <Button
          variant="outlined"
          size="large"
          startIcon={loading ? <CircularProgress size={20} /> : <RefreshCw size={20} />}
          onClick={() => handleSeed(true)}
          disabled={loading}
          fullWidth
        >
          Force Reseed (Clear & Seed)
        </Button>

        <Button
          variant="text"
          color="error"
          size="small"
          onClick={handleClear}
          disabled={loading}
        >
          Clear All Test Data
        </Button>
      </Stack>

      {result && (
        <Alert severity="success" sx={{ mt: 3 }}>
          {result}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 4 }}>
        After seeding, go to Accounts tab → click a bookie → see Transaction History
      </Typography>
    </Box>
  )
}
