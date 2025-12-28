/**
 * Adjust Balance Dialog
 *
 * Modal for manually adjusting bookie/exchange balance.
 * Creates an ADJUSTMENT ledger entry with reason.
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material'
import { X, AlertCircle } from 'lucide-react'
import { formatLedgerCurrency } from '../../types/ledger'

// ============================================================================
// Types
// ============================================================================

interface AdjustBalanceDialogProps {
  /** Is dialog open? */
  open: boolean
  /** Close handler */
  onClose: () => void
  /** Confirm handler */
  onConfirm: (newBalance: number, reason: string) => Promise<void>
  /** Account name */
  bookieName: string
  /** Current balance */
  currentBalance: number
}

// ============================================================================
// Component
// ============================================================================

export function AdjustBalanceDialog({
  open,
  onClose,
  onConfirm,
  bookieName,
  currentBalance,
}: AdjustBalanceDialogProps) {
  const [newBalance, setNewBalance] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setNewBalance(currentBalance.toFixed(2))
      setReason('')
      setError(null)
    }
  }, [open, currentBalance])

  // Calculate difference
  const parsedBalance = parseFloat(newBalance) || 0
  const difference = parsedBalance - currentBalance

  const differenceText = useMemo(() => {
    if (difference === 0) return 'No change'
    const prefix = difference > 0 ? '+' : ''
    return `${prefix}${formatLedgerCurrency(difference)}`
  }, [difference])

  const differenceColor = difference > 0 ? '#2e7d32' : difference < 0 ? '#c62828' : '#6b7280'

  // Validation
  const isValid = useMemo(() => {
    const balance = parseFloat(newBalance)
    if (isNaN(balance)) return false
    if (difference === 0) return false
    if (!reason.trim()) return false
    return true
  }, [newBalance, difference, reason])

  // Handle submit
  const handleSubmit = async () => {
    if (!isValid) return

    setIsSubmitting(true)
    setError(null)

    try {
      await onConfirm(parsedBalance, reason.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust balance')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          m: 2,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Adjust Balance
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} icon={<AlertCircle size={18} />}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Account
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {bookieName}
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Current Balance
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {formatLedgerCurrency(currentBalance)}
          </Typography>
        </Box>

        <TextField
          label="New Balance"
          value={newBalance}
          onChange={(e) => setNewBalance(e.target.value)}
          fullWidth
          type="number"
          inputProps={{ step: '0.01' }}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
          sx={{ mb: 2 }}
        />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
            borderRadius: 2,
            backgroundColor: '#f5f5f5',
            mb: 3,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Difference:
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: differenceColor }}>
            {differenceText}
          </Typography>
        </Box>

        {difference !== 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            This will create an ADJUSTMENT entry in the ledger.
          </Typography>
        )}

        <TextField
          label="Reason (required)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          fullWidth
          multiline
          rows={2}
          placeholder="e.g., Correcting balance after manual withdrawal"
          helperText="Explain why you're adjusting the balance"
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!isValid || isSubmitting}
          sx={{
            borderRadius: 2,
            minWidth: 140,
          }}
        >
          {isSubmitting ? 'Adjusting...' : 'Confirm Adjustment'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
