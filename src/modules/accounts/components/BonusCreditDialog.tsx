'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Box,
  Typography,
  InputAdornment,
} from '@mui/material'
import { Gift, DollarSign, Calendar, FileText } from 'lucide-react'
import { BOOKIE_DEFINITIONS } from '../utils/bookieList'

// ============================================================================
// Types
// ============================================================================

interface BonusCreditDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (credit: {
    bookieId: string
    bookieName: string
    amount: number
    date: string
    notes: string
  }) => void
}

interface BookieOption {
  id: string
  name: string
}

// ============================================================================
// Component
// ============================================================================

export function BonusCreditDialog({ open, onClose, onAdd }: BonusCreditDialogProps) {
  const [selectedBookie, setSelectedBookie] = useState<BookieOption | null>(null)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedBookie(null)
      setAmount('')
      setDate(new Date().toISOString().split('T')[0])
      setNotes('')
      setErrors({})
    }
  }, [open])

  // Bookie options
  const bookieOptions: BookieOption[] = BOOKIE_DEFINITIONS.map(b => ({
    id: b.id,
    name: b.name,
  })).sort((a, b) => a.name.localeCompare(b.name))

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedBookie) {
      newErrors.bookie = 'Please select a bookie'
    }

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount'
    }

    if (!date) {
      newErrors.date = 'Please select a date'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit
  const handleSubmit = () => {
    if (!validate() || !selectedBookie) return

    onAdd({
      bookieId: selectedBookie.id,
      bookieName: selectedBookie.name,
      amount: parseFloat(amount),
      date,
      notes: notes.trim(),
    })

    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Gift size={24} color="#1976d2" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Add Bonus Credit
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Track sign-up bonuses, promotional credits, and other bonus offers that don't appear in
          your bank transactions.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Bookie Select */}
          <Autocomplete
            options={bookieOptions}
            getOptionLabel={option => option.name}
            value={selectedBookie}
            onChange={(_, value) => setSelectedBookie(value)}
            renderInput={params => (
              <TextField
                {...params}
                label="Bookie"
                placeholder="Select a bookie..."
                error={!!errors.bookie}
                helperText={errors.bookie}
              />
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
          />

          {/* Amount */}
          <TextField
            label="Bonus Amount"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            error={!!errors.amount}
            helperText={errors.amount || 'Enter the bonus credit value'}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <DollarSign size={18} />
                </InputAdornment>
              ),
            }}
            inputProps={{ min: 0, step: 0.01 }}
          />

          {/* Date */}
          <TextField
            label="Date Received"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            error={!!errors.date}
            helperText={errors.date}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Calendar size={18} />
                </InputAdornment>
              ),
            }}
          />

          {/* Notes */}
          <TextField
            label="Notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g., Sign-up 100/100, Promo code BONUS50"
            multiline
            rows={2}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                  <FileText size={18} />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained">
          Add Credit
        </Button>
      </DialogActions>
    </Dialog>
  )
}
