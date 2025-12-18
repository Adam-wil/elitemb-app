/**
 * Basiq Connection Hook
 *
 * Manages connection state with Basiq Open Banking API.
 * Handles user creation, consent flow, and connection status.
 */

import { useState, useEffect, useCallback } from 'react'
import type { BasiqConnectionStatus, BasiqAccount, BasiqConnection } from '../types'
import {
  saveConnectionStatus,
  getConnectionStatus,
  clearConnectionStatus,
} from '../utils/accountsStorage'
import {
  healthCheckServer,
  createUserServer,
  getConsentUrlServer,
  fetchAccountsServer,
  fetchConnectionsServer,
  refreshConnectionServer,
  getJobStatusServer,
  deleteConnectionServer,
} from '../api/basiq'

// ============================================================================
// Types
// ============================================================================

interface UseBasiqConnectionReturn {
  // Connection status
  connectionStatus: BasiqConnectionStatus | null
  isConnected: boolean
  isLoading: boolean
  error: string | null

  // API health
  apiHealthy: boolean | null
  checkApiHealth: () => Promise<boolean>

  // User management
  createUser: (email: string, mobile?: string) => Promise<string | null>

  // Bank connection
  getConsentUrl: () => Promise<string | null>
  refreshAccounts: () => Promise<void>
  refreshConnection: (connectionId: string) => Promise<void>
  disconnectBank: (connectionId: string) => Promise<void>
  disconnectAll: () => void

  // Account info
  accounts: BasiqAccount[]
  connections: BasiqConnection[]
}

// ============================================================================
// Hook
// ============================================================================

export function useBasiqConnection(): UseBasiqConnectionReturn {
  const [connectionStatus, setConnectionStatus] = useState<BasiqConnectionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null)

  // Load stored connection on mount
  useEffect(() => {
    const stored = getConnectionStatus()
    if (stored) {
      setConnectionStatus(stored)
    }
  }, [])

  // Derived values
  const isConnected = connectionStatus?.isConnected ?? false
  const accounts = connectionStatus?.accounts ?? []
  const connections = connectionStatus?.connections ?? []

  /**
   * Check if Basiq API is configured and healthy
   */
  const checkApiHealth = useCallback(async (): Promise<boolean> => {
    try {
      const result = await healthCheckServer()
      const healthy = result.status === 'ok'
      setApiHealthy(healthy)
      return healthy
    } catch (err) {
      setApiHealthy(false)
      return false
    }
  }, [])

  /**
   * Create a Basiq user (first step in connection flow)
   */
  const createUser = useCallback(async (email: string, mobile?: string): Promise<string | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await createUserServer({ data: { email, mobile } })

      // Initialize connection status with user ID
      const newStatus: BasiqConnectionStatus = {
        isConnected: false,
        userId: result.id,
        accounts: [],
        connections: [],
        lastFetchedAt: null,
        error: null,
      }

      setConnectionStatus(newStatus)
      saveConnectionStatus(newStatus)

      return result.id
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create user'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Get consent URL for bank connection
   */
  const getConsentUrl = useCallback(async (): Promise<string | null> => {
    if (!connectionStatus?.userId) {
      setError('No user ID. Please create a user first.')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getConsentUrlServer({ data: { userId: connectionStatus.userId } })
      return result.consentUrl
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get consent URL'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [connectionStatus?.userId])

  /**
   * Refresh accounts and connections from Basiq
   */
  const refreshAccounts = useCallback(async (): Promise<void> => {
    if (!connectionStatus?.userId) {
      setError('No user ID.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch accounts and connections in parallel
      const [accountsResult, connectionsResult] = await Promise.all([
        fetchAccountsServer({ data: { userId: connectionStatus.userId } }),
        fetchConnectionsServer({ data: { userId: connectionStatus.userId } }),
      ])

      const newStatus: BasiqConnectionStatus = {
        isConnected: connectionsResult.connections.length > 0,
        userId: connectionStatus.userId,
        accounts: accountsResult.accounts,
        connections: connectionsResult.connections,
        lastFetchedAt: new Date().toISOString(),
        error: null,
      }

      setConnectionStatus(newStatus)
      saveConnectionStatus(newStatus)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh accounts'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [connectionStatus?.userId])

  /**
   * Refresh a specific bank connection to get latest data
   */
  const refreshConnection = useCallback(
    async (connectionId: string): Promise<void> => {
      if (!connectionStatus?.userId) {
        setError('No user ID.')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Start refresh job
        const job = await refreshConnectionServer({
          data: { userId: connectionStatus.userId, connectionId },
        })

        // Poll for completion
        let attempts = 0
        const maxAttempts = 30
        const pollInterval = 2000

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollInterval))

          const status = await getJobStatusServer({ data: { jobId: job.jobId } })

          if (status.status === 'success') {
            // Refresh accounts after successful job
            await refreshAccounts()
            return
          }

          if (status.status === 'failed') {
            throw new Error('Connection refresh failed')
          }

          attempts++
        }

        throw new Error('Connection refresh timed out')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to refresh connection'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [connectionStatus?.userId, refreshAccounts]
  )

  /**
   * Disconnect a specific bank connection
   */
  const disconnectBank = useCallback(
    async (connectionId: string): Promise<void> => {
      if (!connectionStatus?.userId) {
        setError('No user ID.')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        await deleteConnectionServer({
          data: { userId: connectionStatus.userId, connectionId },
        })

        // Refresh to update connection list
        await refreshAccounts()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to disconnect bank'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [connectionStatus?.userId, refreshAccounts]
  )

  /**
   * Disconnect all and clear local state
   */
  const disconnectAll = useCallback((): void => {
    setConnectionStatus(null)
    clearConnectionStatus()
    setError(null)
  }, [])

  return {
    connectionStatus,
    isConnected,
    isLoading,
    error,
    apiHealthy,
    checkApiHealth,
    createUser,
    getConsentUrl,
    refreshAccounts,
    refreshConnection,
    disconnectBank,
    disconnectAll,
    accounts,
    connections,
  }
}
