/**
 * Account Selector Component
 *
 * Reusable dropdown for selecting accounts.
 * - Grouped by AccountType
 * - Shows account name and balance
 * - Supports filtering and search
 * - Keyboard accessible via MUI Autocomplete
 */

import { useMemo } from 'react'
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  ListSubheader,
  CircularProgress,
} from '@mui/material'
import type { SxProps } from '@mui/material'
import type { AccountType, AccountSubType } from '@prisma/client'
import { useAccounts } from '../hooks/useAccounts'
import type { AccountBalanceView } from '../types'

// Type labels for display
const TYPE_LABELS: Record<AccountType, string> = {
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  EQUITY: 'Equity',
  INCOME: 'Income',
  EXPENSE: 'Expenses',
}

// Color coding for account types
const TYPE_COLORS: Record<AccountType, string> = {
  ASSET: '#4caf50',
  LIABILITY: '#f44336',
  EQUITY: '#9c27b0',
  INCOME: '#2196f3',
  EXPENSE: '#ff9800',
}

export interface AccountSelectorProps {
  profileId: string
  value: string | null
  onChange: (accountId: string | null) => void
  label?: string
  placeholder?: string
  filterByType?: AccountType | AccountType[]
  filterBySubType?: AccountSubType | AccountSubType[]
  excludeIds?: string[]
  disabled?: boolean
  required?: boolean
  error?: boolean
  helperText?: string
  sx?: SxProps
}

export function AccountSelector({
  profileId,
  value,
  onChange,
  label = 'Select Account',
  placeholder = 'Search accounts...',
  filterByType,
  filterBySubType,
  excludeIds = [],
  disabled = false,
  required = false,
  error = false,
  helperText,
  sx,
}: AccountSelectorProps) {
  const { accounts, isLoading } = useAccounts({
    profileId,
    filterByType,
    filterBySubType,
  })

  // Filter out excluded accounts and sort by type then name
  const filteredAccounts = useMemo(() => {
    return accounts
      .filter((a: AccountBalanceView) => !excludeIds.includes(a.id))
      .sort((a: AccountBalanceView, b: AccountBalanceView) => {
        // Sort by type first, then by name
        if (a.type !== b.type) {
          return a.type.localeCompare(b.type)
        }
        return a.name.localeCompare(b.name)
      })
  }, [accounts, excludeIds])

  // Find currently selected account
  const selectedAccount = useMemo(
    () => filteredAccounts.find((a: AccountBalanceView) => a.id === value) ?? null,
    [filteredAccounts, value]
  )

  // Format account label for display
  const getOptionLabel = (option: AccountBalanceView) => {
    if (!option) return ''
    return option.name
  }

  return (
    <Autocomplete
      value={selectedAccount}
      onChange={(_, newValue) => onChange(newValue?.id ?? null)}
      options={filteredAccounts}
      groupBy={(option) => TYPE_LABELS[option.type]}
      getOptionLabel={getOptionLabel}
      loading={isLoading}
      disabled={disabled}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isLoading ? (
                  <CircularProgress color="inherit" size={20} />
                ) : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => {
        const { key, ...otherProps } = props
        return (
          <Box component="li" key={option.id} {...otherProps}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                py: 0.5,
              }}
            >
              <Box>
                <Typography variant="body1">{option.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.code}
                  {option.bookieName && ` - ${option.bookieName}`}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right', ml: 2 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: option.balance >= 0 ? 'success.main' : 'error.main',
                    fontWeight: 500,
                  }}
                >
                  ${option.balance.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Box>
        )
      }}
      renderGroup={(params) => (
        <li key={params.key}>
          <ListSubheader
            sx={{
              bgcolor: 'background.paper',
              borderLeft: `4px solid ${TYPE_COLORS[params.group as unknown as AccountType] || '#ccc'}`,
              fontWeight: 600,
            }}
          >
            {params.group}
          </ListSubheader>
          <ul style={{ padding: 0 }}>{params.children}</ul>
        </li>
      )}
      sx={{ width: '100%', ...sx }}
      fullWidth
    />
  )
}
