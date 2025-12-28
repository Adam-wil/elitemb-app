/**
 * Add Account Dialog
 *
 * Dialog for adding a new bookie/exchange account with an opening balance.
 * Creates an ADJUSTMENT ledger entry with "Opening Balance" as the reason.
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
  Autocomplete,
  FormControlLabel,
  Switch,
} from '@mui/material'
import { X, AlertCircle, Building2, RefreshCw } from 'lucide-react'
import { BOOKIE_DEFINITIONS } from '../../utils/bookieList'

// ============================================================================
// Types
// ============================================================================

interface AddAccountDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (bookieName: string, balance: number, isExchange: boolean) => Promise<void>
  existingAccounts: string[]
}

// ============================================================================
// Component
// ============================================================================

export function AddAccountDialog({
  open,
  onClose,
  onConfirm,
  existingAccounts,
}: AddAccountDialogProps) {
  const [bookieName, setBookieName] = useState<string | null>(null)
  const [customName, setCustomName] = useState('')
  const [balance, setBalance] = useState('')
  const [isExchange, setIsExchange] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get bookie options (exclude already added accounts)
  const bookieOptions = useMemo(() => {
    const existingLower = existingAccounts.map((a) => a.toLowerCase())
    return BOOKIE_DEFINITIONS
      .filter((b) => !existingLower.includes(b.name.toLowerCase()))
      .map((b) => b.name)
      .sort()
  }, [existingAccounts])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setBookieName(null)
      setCustomName('')
      setBalance('')
      setIsExchange(false)
      setError(null)
    }
  }, [open])

  // Auto-detect exchange when bookie is selected
  useEffect(() => {
    if (bookieName) {
      const bookie = BOOKIE_DEFINITIONS.find(
        (b) => b.name.toLowerCase() === bookieName.toLowerCase()
      )
      if (bookie) {
        setIsExchange(bookie.isExchange)
      }
    }
  }, [bookieName])

  // Get the final account name
  const accountName = bookieName || customName.trim()

  // Validation
  const validation = useMemo(() => {
    if (!accountName) {
      return { valid: false, error: 'Please select or enter an account name' }
    }

    if (existingAccounts.some((a) => a.toLowerCase() === accountName.toLowerCase())) {
      return { valid: false, error: 'This account already exists' }
    }

    const parsedBalance = parseFloat(balance)
    if (balance && isNaN(parsedBalance)) {
      return { valid: false, error: 'Please enter a valid balance' }
    }

    return { valid: true, error: null }
  }, [accountName, balance, existingAccounts])

  // Handle submit
  const handleSubmit = async () => {
    if (!validation.valid || !accountName) return

    setIsSubmitting(true)
    setError(null)

    try {
      const parsedBalance = parseFloat(balance) || 0
      await onConfirm(accountName, parsedBalance, isExchange)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add account')
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: '#e3f2fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building2 size={20} color="#1565c0" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Add Account
          </Typography>
        </Box>
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

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Add a bookie or exchange account to track. Enter the current balance
          shown on the bookie's website.
        </Typography>

        {/* Bookie Selection */}
        <Autocomplete
          value={bookieName}
          onChange={(_e, newValue) => {
            setBookieName(newValue)
            setCustomName('')
          }}
          options={bookieOptions}
          freeSolo
          inputValue={bookieName || customName}
          onInputChange={(_e, newInputValue, reason) => {
            if (reason === 'input') {
              // Check if typed value matches an option
              const match = bookieOptions.find(
                (opt) => opt.toLowerCase() === newInputValue.toLowerCase()
              )
              if (match) {
                setBookieName(match)
                setCustomName('')
              } else {
                setBookieName(null)
                setCustomName(newInputValue)
              }
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Account Name"
              placeholder="Search or enter bookie name"
              fullWidth
              sx={{ mb: 3 }}
              error={!!validation.error && accountName.length > 0}
              helperText={
                accountName && validation.error
                  ? validation.error
                  : 'Select from list or type a custom name'
              }
            />
          )}
        />

        {/* Balance Input */}
        <TextField
          label="Current Balance"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          fullWidth
          type="number"
          inputProps={{ step: '0.01', min: '0' }}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
          placeholder="0.00"
          helperText="Enter the balance currently showing on this account"
          sx={{ mb: 3 }}
        />

        {/* Exchange Toggle */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
            borderRadius: 2,
            backgroundColor: '#f5f5f5',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RefreshCw size={18} style={{ opacity: 0.6 }} />
            <Typography variant="body2">Exchange Account</Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={isExchange}
                onChange={(e) => setIsExchange(e.target.checked)}
                size="small"
              />
            }
            label=""
            sx={{ m: 0 }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, px: 1 }}>
          Enable for Betfair, Smarkets, or other betting exchanges
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!validation.valid || isSubmitting}
          sx={{
            borderRadius: 2,
            minWidth: 140,
          }}
        >
          {isSubmitting ? 'Adding...' : 'Add Account'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
