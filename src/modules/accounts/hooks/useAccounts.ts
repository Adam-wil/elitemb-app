/**
 * useAccounts Hook
 *
 * Fetches accounts with balances for a profile.
 * Supports filtering by type and subType.
 */

import { useState, useEffect, useCallback } from 'react'
import { getAccountBalances } from '../api/db/accountBalanceView.server'
import type { AccountBalanceView } from '../types'
import type { AccountType, AccountSubType } from '@prisma/client'

interface UseAccountsOptions {
  profileId: string
  filterByType?: AccountType | AccountType[]
  filterBySubType?: AccountSubType | AccountSubType[]
  enabled?: boolean
}

interface UseAccountsReturn {
  accounts: AccountBalanceView[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useAccounts(options: UseAccountsOptions): UseAccountsReturn {
  const { profileId, filterByType, filterBySubType, enabled = true } = options

  const [accounts, setAccounts] = useState<AccountBalanceView[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchAccounts = useCallback(async () => {
    if (!profileId || !enabled) return

    setIsLoading(true)
    setIsError(false)
    setError(null)

    try {
      const result = await getAccountBalances({ data: { profileId } })
      const filtered = filterAccounts(result, filterByType, filterBySubType)
      setAccounts(filtered)
    } catch (err) {
      setIsError(true)
      setError(err instanceof Error ? err : new Error('Failed to fetch accounts'))
    } finally {
      setIsLoading(false)
    }
  }, [profileId, filterByType, filterBySubType, enabled])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  return {
    accounts,
    isLoading,
    isError,
    error,
    refetch: fetchAccounts,
  }
}

/**
 * Filter accounts by type and/or subType
 */
function filterAccounts(
  accounts: AccountBalanceView[],
  filterByType?: AccountType | AccountType[],
  filterBySubType?: AccountSubType | AccountSubType[]
): AccountBalanceView[] {
  let filtered = accounts

  if (filterByType) {
    const types = Array.isArray(filterByType) ? filterByType : [filterByType]
    filtered = filtered.filter((a: AccountBalanceView) => types.includes(a.type))
  }

  if (filterBySubType) {
    const subTypes = Array.isArray(filterBySubType)
      ? filterBySubType
      : [filterBySubType]
    filtered = filtered.filter(
      (a: AccountBalanceView) => a.subType && subTypes.includes(a.subType)
    )
  }

  return filtered
}
