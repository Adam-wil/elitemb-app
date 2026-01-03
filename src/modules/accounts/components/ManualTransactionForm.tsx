/**
 * Manual Transaction Form Component
 *
 * Form for creating manual adjustments and transfers.
 * - Adjustment: Increases/decreases a single account balance
 * - Transfer: Moves funds between two accounts
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  CircularProgress,
  Autocomplete,
  InputAdornment,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { type Dayjs } from 'dayjs'
import { createAdjustment, createTransfer } from '../api/db/journalService.server'
import { getAccountBalances } from '../api/db/accountBalanceView.server'
import type { AccountBalanceView } from '../types'

type TransactionType = 'adjustment' | 'transfer'

interface FormState {
  type: TransactionType
  accountId: string
  fromAccountId: string
  toAccountId: string
  amount: string
  reason: string
  entryDate: Dayjs
}

const initialState: FormState = {
  type: 'adjustment',
  accountId: '',
  fromAccountId: '',
  toAccountId: '',
  amount: '',
  reason: '',
  entryDate: dayjs(),
}

interface ManualTransactionFormProps {
  profileId: string
  onSuccess?: () => void
}

export function ManualTransactionForm({
  profileId,
  onSuccess,
}: ManualTransactionFormProps) {
  const [form, setForm] = useState<FormState>(initialState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [accounts, setAccounts] = useState<AccountBalanceView[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)

  // Fetch accounts on mount
  useEffect(() => {
    async function fetchAccounts() {
      try {
        setIsLoadingAccounts(true)
        const result = await getAccountBalances({ data: { profileId } })
        setAccounts(result)
      } catch (err) {
        console.error('Failed to fetch accounts:', err)
        setError('Failed to load accounts')
      } finally {
        setIsLoadingAccounts(false)
      }
    }
    fetchAccounts()
  }, [profileId])

  // Group accounts by type for the dropdown
  const groupedAccounts = useMemo(() => {
    const groups: Record<string, AccountBalanceView[]> = {}
    for (const account of accounts) {
      const groupName = account.type
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(account)
    }
    return groups
  }, [accounts])

  // Get selected account for display
  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === form.accountId) ?? null,
    [accounts, form.accountId]
  )
  const selectedFromAccount = useMemo(
    () => accounts.find((a) => a.id === form.fromAccountId) ?? null,
    [accounts, form.fromAccountId]
  )
  const selectedToAccount = useMemo(
    () => accounts.find((a) => a.id === form.toAccountId) ?? null,
    [accounts, form.toAccountId]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validation
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount === 0) {
      setError('Please enter a valid non-zero amount')
      return
    }

    if (!form.reason.trim()) {
      setError('Please enter a reason for this transaction')
      return
    }

    if (form.type === 'adjustment' && !form.accountId) {
      setError('Please select an account')
      return
    }

    if (form.type === 'transfer') {
      if (!form.fromAccountId || !form.toAccountId) {
        setError('Please select both From and To accounts')
        return
      }
      if (form.fromAccountId === form.toAccountId) {
        setError('From and To accounts must be different')
        return
      }
      if (amount <= 0) {
        setError('Transfer amount must be positive')
        return
      }
    }

    setIsSubmitting(true)

    // Format entryDate as ISO string
    const entryDateStr = form.entryDate.format('YYYY-MM-DD')

    try {
      if (form.type === 'adjustment') {
        await createAdjustment({
          data: {
            profileId,
            accountId: form.accountId,
            amount,
            reason: form.reason.trim(),
            entryDate: entryDateStr,
          },
        })
      } else {
        // Transfer
        await createTransfer({
          data: {
            profileId,
            fromAccountId: form.fromAccountId,
            toAccountId: form.toAccountId,
            amount,
            description: form.reason.trim(),
            entryDate: entryDateStr,
          },
        })
      }

      setSuccess(true)
      setForm({ ...initialState, entryDate: dayjs() })
      onSuccess?.()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create transaction'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format account option label
  const getAccountLabel = (account: AccountBalanceView | null) => {
    if (!account) return ''
    const balance = account.balance.toFixed(2)
    return `${account.code} - ${account.name} ($${balance})`
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 500 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(false)}
        >
          Transaction created successfully
        </Alert>
      )}

      <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
        <FormLabel>Transaction Type</FormLabel>
        <RadioGroup
          row
          value={form.type}
          onChange={(e) =>
            setForm({ ...form, type: e.target.value as TransactionType })
          }
        >
          <FormControlLabel
            value="adjustment"
            control={<Radio />}
            label="Adjustment"
          />
          <FormControlLabel
            value="transfer"
            control={<Radio />}
            label="Transfer"
          />
        </RadioGroup>
      </FormControl>

      {form.type === 'adjustment' ? (
        <Autocomplete
          options={accounts}
          groupBy={(option) => option.type}
          getOptionLabel={getAccountLabel}
          value={selectedAccount}
          onChange={(_, newValue) =>
            setForm({ ...form, accountId: newValue?.id ?? '' })
          }
          loading={isLoadingAccounts}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Account"
              required
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {isLoadingAccounts ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          sx={{ mb: 2 }}
        />
      ) : (
        <>
          <Autocomplete
            options={accounts}
            groupBy={(option) => option.type}
            getOptionLabel={getAccountLabel}
            value={selectedFromAccount}
            onChange={(_, newValue) =>
              setForm({ ...form, fromAccountId: newValue?.id ?? '' })
            }
            loading={isLoadingAccounts}
            renderInput={(params) => (
              <TextField
                {...params}
                label="From Account"
                required
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {isLoadingAccounts ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            sx={{ mb: 2 }}
          />
          <Autocomplete
            options={accounts}
            groupBy={(option) => option.type}
            getOptionLabel={getAccountLabel}
            value={selectedToAccount}
            onChange={(_, newValue) =>
              setForm({ ...form, toAccountId: newValue?.id ?? '' })
            }
            loading={isLoadingAccounts}
            renderInput={(params) => (
              <TextField
                {...params}
                label="To Account"
                required
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {isLoadingAccounts ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            sx={{ mb: 2 }}
          />
        </>
      )}

      <DatePicker
        label="Transaction Date"
        value={form.entryDate}
        onChange={(date) =>
          setForm({ ...form, entryDate: date || dayjs() })
        }
        slotProps={{
          textField: {
            fullWidth: true,
            helperText: 'When did this transaction occur?',
            sx: { mb: 2 },
          },
        }}
      />

      <TextField
        fullWidth
        label="Amount"
        type="number"
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
        helperText={
          form.type === 'adjustment'
            ? 'Positive = increase balance, Negative = decrease balance'
            : 'Enter positive amount to transfer'
        }
        InputProps={{
          startAdornment: <InputAdornment position="start">$</InputAdornment>,
          inputProps: { step: '0.01' },
        }}
        sx={{ mb: 2 }}
        required
      />

      <TextField
        fullWidth
        label="Reason / Description"
        value={form.reason}
        onChange={(e) => setForm({ ...form, reason: e.target.value })}
        multiline
        rows={2}
        required
        inputProps={{ maxLength: 500 }}
        helperText={`${form.reason.length}/500 characters`}
        sx={{ mb: 2 }}
      />

      <Button
        type="submit"
        variant="contained"
        disabled={isSubmitting || isLoadingAccounts}
        startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
        fullWidth
      >
        {isSubmitting ? 'Creating...' : 'Create Transaction'}
      </Button>
    </Box>
    </LocalizationProvider>
  )
}
