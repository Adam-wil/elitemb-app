'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  InputAdornment,
  Alert,
} from '@mui/material'
import { Edit2, DollarSign, AlertTriangle } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface ManualOverrideDialogProps {
  open: boolean
  onClose: () => void
  bookieName: string
  currentBalance: number
  currentOverride: number | null
  onSave: (value: number, reason?: string) => void
}

// ============================================================================
// Component
// ============================================================================

export function ManualOverrideDialog({
  open,
  onClose,
  bookieName,
  currentBalance,
  currentOverride,
  onSave,
}: ManualOverrideDialogProps) {
  const [overrideValue, setOverrideValue] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setOverrideValue(currentOverride?.toString() || currentBalance.toString())
      setReason('')
      setError(null)
    }
  }, [open, currentBalance, currentOverride])

  // Validation
  const validate = (): boolean => {
    const value = parseFloat(overrideValue)

    if (isNaN(value)) {
      setError('Please enter a valid number')
      return false
    }

    setError(null)
    return true
  }

  // Submit
  const handleSubmit = () => {
    if (!validate()) return

    onSave(parseFloat(overrideValue), reason.trim() || undefined)
  }

  const difference = parseFloat(overrideValue || '0') - currentBalance

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Edit2 size={24} color="#1976d2" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Manual Balance Override
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="warning" sx={{ mb: 3 }} icon={<AlertTriangle size={20} />}>
          <Typography variant="body2">
            Use this feature only if the calculated balance doesn't match your actual bookie
            balance. This override will be used instead of the calculated value.
          </Typography>
        </Alert>

        <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {bookieName}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Calculated Balance
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                ${currentBalance.toFixed(2)}
              </Typography>
            </Box>
            {currentOverride !== null && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Current Override
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, fontStyle: 'italic' }}>
                  ${currentOverride.toFixed(2)}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Override Value */}
          <TextField
            label="Override Balance"
            type="number"
            value={overrideValue}
            onChange={e => setOverrideValue(e.target.value)}
            error={!!error}
            helperText={error || 'Enter the actual balance from your bookie account'}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <DollarSign size={18} />
                </InputAdornment>
              ),
            }}
            inputProps={{ step: 0.01 }}
            autoFocus
          />

          {/* Difference Display */}
          {overrideValue && !isNaN(parseFloat(overrideValue)) && (
            <Box sx={{ p: 1.5, backgroundColor: difference >= 0 ? '#e8f5e9' : '#ffebee', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ color: difference >= 0 ? 'success.main' : 'error.main' }}>
                Difference: {difference >= 0 ? '+' : ''}${difference.toFixed(2)}
              </Typography>
            </Box>
          )}

          {/* Reason */}
          <TextField
            label="Reason (optional)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g., Pending withdrawal not reflected, Bonus not included"
            multiline
            rows={2}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained">
          Save Override
        </Button>
      </DialogActions>
    </Dialog>
  )
}
