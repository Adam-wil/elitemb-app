/**
 * Actual Balance Input Component
 *
 * Allows user to enter their actual bookie balance for reconciliation.
 * Compares against calculated balance and shows variance with color coding.
 */

import { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Typography,
  InputAdornment,
  IconButton,
  CircularProgress,
  Collapse,
} from '@mui/material'
import { Check, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from '@/modules/the-furlong/hooks/useDashboardData'

// ============================================================================
// Constants
// ============================================================================

const VARIANCE_THRESHOLD = 10 // $10 - amber warning
const VARIANCE_THRESHOLD_HIGH = 20 // $20 - red error

// ============================================================================
// Types
// ============================================================================

export interface ActualBalanceInputProps {
  /** Balance calculated from journal entries */
  calculatedBalance: number
  /** User-entered actual balance (null if never entered) */
  actualBalance: number | null
  /** When actualBalance was last entered */
  actualBalanceAt: string | null
  /** Save handler */
  onSave: (actualBalance: number) => Promise<void>
  /** Loading state */
  isLoading?: boolean
}

// ============================================================================
// Component
// ============================================================================

export function ActualBalanceInput({
  calculatedBalance,
  actualBalance,
  actualBalanceAt,
  onSave,
  isLoading = false,
}: ActualBalanceInputProps) {
  // Start with empty input - user must enter fresh value each time
  const [inputValue, setInputValue] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  // Clear input when component mounts or actualBalance changes
  useEffect(() => {
    setInputValue('')
    setHasChanges(false)
  }, [actualBalance])

  // Calculate variance
  const variance =
    actualBalance !== null ? actualBalance - calculatedBalance : null

  // Determine variance color
  const getVarianceColor = () => {
    if (variance === null) return 'text.secondary'
    if (Math.abs(variance) <= 0.01) return 'success.main'
    if (Math.abs(variance) <= VARIANCE_THRESHOLD) return 'warning.main'
    return 'error.main'
  }

  // Handle input change - enable save button when there's any valid number
  const handleChange = (value: string) => {
    setInputValue(value)
    const parsed = parseFloat(value)
    const isValid = !isNaN(parsed) && value.trim() !== ''
    // Enable save for any valid number - user is confirming their bookie balance
    setHasChanges(isValid)
  }

  // Calculate pending adjustment as user types
  const pendingValue = parseFloat(inputValue)
  const pendingAdjustment = !isNaN(pendingValue) ? pendingValue - calculatedBalance : null

  // Handle save
  const handleSave = async () => {
    console.log('handleSave called, inputValue:', inputValue)
    const value = parseFloat(inputValue)
    if (isNaN(value)) {
      console.log('Invalid value, aborting')
      return
    }

    console.log('Saving value:', value)
    setIsSaving(true)
    try {
      await onSave(value)
      console.log('Save successful')
      setInputValue('') // Clear input after successful save
      setHasChanges(false)
    } catch (err) {
      console.error('Failed to save actual balance:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Format last updated date
  const formatLastUpdated = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
      {/* Header Row: Balance & Difference */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            System Balance
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {formatCurrency(calculatedBalance)}
          </Typography>
        </Box>
        {variance !== null && Math.abs(variance) > 0.01 && (
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">
              Difference
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, color: getVarianceColor() }}>
              {formatCurrency(Math.abs(variance))}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {variance > 0 ? 'bookie has more' : 'bookie has less'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Bookie Balance Input */}
      <TextField
        fullWidth
        size="small"
        label="What does bookie show?"
        placeholder="Enter balance from bookie app"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        type="number"
        disabled={isLoading}
        InputProps={{
          startAdornment: <InputAdornment position="start">$</InputAdornment>,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={handleSave}
                disabled={isSaving || isLoading || !hasChanges}
                size="small"
                color={hasChanges ? 'primary' : 'default'}
              >
                {isSaving ? (
                  <CircularProgress size={16} />
                ) : (
                  <Check size={16} />
                )}
              </IconButton>
            </InputAdornment>
          ),
        }}
        helperText={
          actualBalanceAt
            ? `Last reconciled: ${formatLastUpdated(actualBalanceAt)}`
            : 'Enter bookie balance to reconcile'
        }
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: 'white',
          },
        }}
      />

      {/* Show pending adjustment as user types */}
      {pendingAdjustment !== null && Math.abs(pendingAdjustment) > 0.01 && (
        <Box
          sx={{
            mt: 1.5,
            p: 1.5,
            bgcolor: pendingAdjustment > 0 ? '#e8f5e9' : '#ffebee',
            borderRadius: 1,
            border: '1px solid',
            borderColor: pendingAdjustment > 0 ? '#c8e6c9' : '#ffcdd2',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: pendingAdjustment > 0 ? '#2e7d32' : '#c62828' }}>
            Adjustment: {formatCurrency(Math.abs(pendingAdjustment))}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {pendingAdjustment > 0
              ? 'Adding to system balance'
              : 'Reducing system balance'}
          </Typography>
        </Box>
      )}

      {/* Help Section - Why balances drift */}
      <Box sx={{ mt: 2 }}>
        <Box
          onClick={() => setShowHelp(!showHelp)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            cursor: 'pointer',
            color: 'text.secondary',
            '&:hover': { color: 'primary.main' },
          }}
        >
          <HelpCircle size={14} />
          <Typography variant="caption" sx={{ fontWeight: 500 }}>
            Why might balances differ?
          </Typography>
          {showHelp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </Box>

        <Collapse in={showHelp}>
          <Box
            sx={{
              mt: 1.5,
              p: 2,
              bgcolor: '#f8f9fa',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
              Common causes of balance drift:
            </Typography>

            <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 0.75 } }}>
              <Typography component="li" variant="caption" color="text.secondary">
                <strong>Deposits or withdrawals</strong> not yet recorded in the system
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                <strong>Bets placed outside the app</strong> (quick bets, live betting, multis)
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                <strong>Bonus credits</strong> from sign-up offers, reload bonuses, or cashback promos
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                <strong>Bet settlement timing</strong> - results not yet updated in tracker
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                <strong>Voided or cancelled races</strong> where stakes were refunded
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                <strong>Early cashouts</strong> or partial cashouts on pending bets
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                <strong>Promo payouts</strong> - free bet winnings, odds boosts, money-back specials
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                <strong>Exchange commission</strong> deducted from Betfair/exchange winnings
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                <strong>Price changes</strong> between planning and actual bet placement
              </Typography>
            </Box>

            <Typography variant="caption" sx={{ display: 'block', mt: 1.5, fontStyle: 'italic', color: 'text.secondary' }}>
              Tip: Regular reconciliation helps catch missed entries early. Check after each betting session for best accuracy.
            </Typography>
          </Box>
        </Collapse>
      </Box>
    </Box>
  )
}
