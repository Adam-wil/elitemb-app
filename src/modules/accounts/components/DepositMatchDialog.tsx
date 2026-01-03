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
  CircularProgress,
} from '@mui/material'
import { Gift, DollarSign, Calendar, FileText } from 'lucide-react'
import { getAllBookies } from '@/modules/lay-manager/api/db/bookieDb.server'

// ============================================================================
// Types
// ============================================================================

interface DepositMatchDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (data: {
    bookieId: number
    bookieName: string
    amount: number
    date: string
    notes?: string
  }) => Promise<void>
}

interface BookieOption {
  id: number
  name: string
}

// ============================================================================
// Component
// ============================================================================

export function DepositMatchDialog({ open, onClose, onAdd }: DepositMatchDialogProps) {
  const [selectedBookie, setSelectedBookie] = useState<BookieOption | null>(null)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Bookie loading state
  const [bookieOptions, setBookieOptions] = useState<BookieOption[]>([])
  const [bookiesLoading, setBookiesLoading] = useState(false)

  // Fetch bookies when dialog opens
  useEffect(() => {
    if (open && bookieOptions.length === 0) {
      setBookiesLoading(true)
      getAllBookies()
        .then((result) => {
          setBookieOptions(
            result.bookies.map((b) => ({
              id: b.id,
              name: b.name,
            }))
          )
        })
        .catch((err) => {
          console.error('Failed to load bookies:', err)
        })
        .finally(() => {
          setBookiesLoading(false)
        })
    }
  }, [open, bookieOptions.length])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedBookie(null)
      setAmount('')
      setDate(new Date().toISOString().split('T')[0])
      setNotes('')
      setErrors({})
      setIsSubmitting(false)
    }
  }, [open])

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
  const handleSubmit = async () => {
    if (!validate() || !selectedBookie) return

    setIsSubmitting(true)
    try {
      await onAdd({
        bookieId: selectedBookie.id,
        bookieName: selectedBookie.name,
        amount: parseFloat(amount),
        date,
        notes: notes.trim() || undefined,
      })
    } catch (err) {
      console.error('Failed to add deposit match:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Gift size={24} color="#1976d2" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Add Deposit Match Bonus
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Track sign-up offers, deposit matches, and reload bonuses received from bookies.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Bookie Select */}
          <Autocomplete
            options={bookieOptions}
            getOptionLabel={(option) => option.name}
            value={selectedBookie}
            onChange={(_, value) => setSelectedBookie(value)}
            loading={bookiesLoading}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Bookie"
                placeholder="Select a bookie..."
                error={!!errors.bookie}
                helperText={errors.bookie}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {bookiesLoading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
          />

          {/* Amount */}
          <TextField
            label="Bonus Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
            onChange={(e) => setDate(e.target.value)}
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
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Sign-up 100/100, Promo code BONUS50, Reload offer"
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
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Bonus'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
