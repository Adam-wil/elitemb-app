/**
 * Basiq API Server Functions
 *
 * TanStack Start server functions for Basiq Open Banking API.
 * These run on the server to:
 * - Access BASIQ_API_KEY from process.env (not exposed to browser)
 * - Bypass CORS restrictions when calling Basiq API
 *
 * DO NOT use 'use server' directive - TanStack Start handles this via createServerFn()
 */

import { createServerFn } from '@tanstack/react-start'
import type {
  BasiqTokenResponse,
  BasiqUser,
  BasiqAccount,
  BasiqConnection,
  BasiqTransaction,
  BasiqJobStatus,
} from '../../types'

// ============================================================================
// Constants
// ============================================================================

const BASIQ_API_BASE = 'https://au-api.basiq.io'

// Token cache (in-memory, server-side only)
let cachedToken: { token: string; expiresAt: number } | null = null

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Get or refresh access token (internal use)
 */
async function getAccessToken(): Promise<string> {
  const apiKey = process.env.BASIQ_API_KEY
  if (!apiKey) {
    throw new Error('BASIQ_API_KEY is not configured')
  }

  // Return cached token if still valid (with 10 min buffer)
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + 10 * 60 * 1000) {
    return cachedToken.token
  }

  // Fetch new token
  const response = await fetch(`${BASIQ_API_BASE}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'basiq-version': '3.0',
    },
    body: 'scope=SERVER_ACCESS',
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get Basiq token: ${response.status} - ${error}`)
  }

  const data: BasiqTokenResponse = await response.json()

  // Cache the token
  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  }

  return data.access_token
}

/**
 * Get client access token for user consent flow
 */
async function getClientAccessToken(userId: string): Promise<string> {
  const apiKey = process.env.BASIQ_API_KEY
  if (!apiKey) {
    throw new Error('BASIQ_API_KEY is not configured')
  }

  const response = await fetch(`${BASIQ_API_BASE}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'basiq-version': '3.0',
    },
    body: `scope=CLIENT_ACCESS&userId=${userId}`,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get client token: ${response.status} - ${error}`)
  }

  const data: BasiqTokenResponse = await response.json()
  return data.access_token
}

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Health check - verify API is configured
 */
export const healthCheckServer = createServerFn({ method: 'GET' }).handler(async () => {
  const apiKeyConfigured = !!process.env.BASIQ_API_KEY

  if (!apiKeyConfigured) {
    return {
      status: 'error' as const,
      apiKeyConfigured: false,
      message: 'BASIQ_API_KEY not configured',
    }
  }

  try {
    // Try to get a token to verify key is valid
    await getAccessToken()
    return {
      status: 'ok' as const,
      apiKeyConfigured: true,
      message: 'Basiq API ready',
    }
  } catch (error) {
    return {
      status: 'error' as const,
      apiKeyConfigured: true,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})

/**
 * Create a new Basiq user
 */
export const createUserServer = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; mobile?: string; firstName?: string; lastName?: string }) => d)
  .handler(async ({ data }) => {
    const token = await getAccessToken()

    const response = await fetch(`${BASIQ_API_BASE}/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'basiq-version': '3.0',
      },
      body: JSON.stringify({
        email: data.email,
        mobile: data.mobile,
        firstName: data.firstName,
        lastName: data.lastName,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create user: ${response.status} - ${error}`)
    }

    const user: BasiqUser = await response.json()
    return {
      id: user.id,
      email: user.email,
    }
  })

/**
 * Get consent URL for bank connection
 */
export const getConsentUrlServer = createServerFn({ method: 'POST' })
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const clientToken = await getClientAccessToken(data.userId)

    // Build consent URL
    const consentUrl = `https://consent.basiq.io/home?token=${clientToken}`

    return {
      consentUrl,
      expiresIn: 3600, // 1 hour
    }
  })

/**
 * Fetch all connected bank accounts for a user
 */
export const fetchAccountsServer = createServerFn({ method: 'GET' })
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const token = await getAccessToken()

    const response = await fetch(`${BASIQ_API_BASE}/users/${data.userId}/accounts`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'basiq-version': '3.0',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to fetch accounts: ${response.status} - ${error}`)
    }

    const json = await response.json()
    const accounts: BasiqAccount[] = json.data || []

    return { accounts }
  })

/**
 * Fetch user's bank connections
 */
export const fetchConnectionsServer = createServerFn({ method: 'GET' })
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const token = await getAccessToken()

    const response = await fetch(`${BASIQ_API_BASE}/users/${data.userId}/connections`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'basiq-version': '3.0',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to fetch connections: ${response.status} - ${error}`)
    }

    const json = await response.json()
    const connections: BasiqConnection[] = json.data || []

    return { connections }
  })

/**
 * Fetch transactions with date filtering and pagination
 */
export const fetchTransactionsServer = createServerFn({ method: 'GET' })
  .inputValidator(
    (d: {
      userId: string
      fromDate: string // YYYY-MM-DD
      toDate: string // YYYY-MM-DD
      accountId?: string
      limit?: number
      nextUrl?: string
    }) => d
  )
  .handler(async ({ data }) => {
    const token = await getAccessToken()

    let url: string

    if (data.nextUrl) {
      // Use pagination URL
      url = data.nextUrl
    } else {
      // Build initial URL with filters
      const params = new URLSearchParams()

      // Date filter
      const filters: string[] = []
      filters.push(`transaction.postDate.gt('${data.fromDate}')`)
      filters.push(`transaction.postDate.lt('${data.toDate}')`)

      if (data.accountId) {
        filters.push(`account.id.eq('${data.accountId}')`)
      }

      params.append('filter', filters.join(','))
      params.append('limit', String(data.limit || 500))

      url = `${BASIQ_API_BASE}/users/${data.userId}/transactions?${params.toString()}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'basiq-version': '3.0',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to fetch transactions: ${response.status} - ${error}`)
    }

    const json = await response.json()
    const transactions: BasiqTransaction[] = json.data || []
    const nextUrl = json.links?.next || null

    return {
      transactions,
      hasMore: !!nextUrl,
      nextUrl,
    }
  })

/**
 * Fetch ALL transactions (handles pagination internally)
 */
export const fetchAllTransactionsServer = createServerFn({ method: 'GET' })
  .inputValidator(
    (d: {
      userId: string
      fromDate: string
      toDate: string
      accountId?: string
    }) => d
  )
  .handler(async ({ data }) => {
    const token = await getAccessToken()

    const allTransactions: BasiqTransaction[] = []
    let nextUrl: string | null = null
    let isFirstPage = true

    // Fetch all pages
    while (isFirstPage || nextUrl) {
      let url: string

      if (nextUrl) {
        url = nextUrl
      } else {
        const params = new URLSearchParams()
        const filters: string[] = []
        filters.push(`transaction.postDate.gt('${data.fromDate}')`)
        filters.push(`transaction.postDate.lt('${data.toDate}')`)

        if (data.accountId) {
          filters.push(`account.id.eq('${data.accountId}')`)
        }

        params.append('filter', filters.join(','))
        params.append('limit', '500')

        url = `${BASIQ_API_BASE}/users/${data.userId}/transactions?${params.toString()}`
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'basiq-version': '3.0',
        },
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to fetch transactions: ${response.status} - ${error}`)
      }

      const json = await response.json()
      const transactions: BasiqTransaction[] = json.data || []

      allTransactions.push(...transactions)
      nextUrl = json.links?.next || null
      isFirstPage = false

      // Safety limit to prevent infinite loops
      if (allTransactions.length > 10000) {
        console.warn('Transaction fetch safety limit reached (10000)')
        break
      }
    }

    return {
      transactions: allTransactions,
      count: allTransactions.length,
    }
  })

/**
 * Refresh a bank connection
 */
export const refreshConnectionServer = createServerFn({ method: 'POST' })
  .inputValidator((d: { userId: string; connectionId: string }) => d)
  .handler(async ({ data }) => {
    const token = await getAccessToken()

    const response = await fetch(
      `${BASIQ_API_BASE}/users/${data.userId}/connections/${data.connectionId}/refresh`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'basiq-version': '3.0',
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to refresh connection: ${response.status} - ${error}`)
    }

    const json = await response.json()

    return {
      jobId: json.id || json.jobId,
      status: json.status || 'pending',
    }
  })

/**
 * Get job status
 */
export const getJobStatusServer = createServerFn({ method: 'GET' })
  .inputValidator((d: { jobId: string }) => d)
  .handler(async ({ data }) => {
    const token = await getAccessToken()

    const response = await fetch(`${BASIQ_API_BASE}/jobs/${data.jobId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'basiq-version': '3.0',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get job status: ${response.status} - ${error}`)
    }

    const job: BasiqJobStatus = await response.json()

    return {
      id: job.id,
      status: job.status,
      result: job.result,
    }
  })

/**
 * Delete a bank connection
 */
export const deleteConnectionServer = createServerFn({ method: 'POST' })
  .inputValidator((d: { userId: string; connectionId: string }) => d)
  .handler(async ({ data }) => {
    const token = await getAccessToken()

    const response = await fetch(
      `${BASIQ_API_BASE}/users/${data.userId}/connections/${data.connectionId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'basiq-version': '3.0',
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to delete connection: ${response.status} - ${error}`)
    }

    return { success: true }
  })

/**
 * Get user details
 */
export const getUserServer = createServerFn({ method: 'GET' })
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const token = await getAccessToken()

    const response = await fetch(`${BASIQ_API_BASE}/users/${data.userId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'basiq-version': '3.0',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get user: ${response.status} - ${error}`)
    }

    const user: BasiqUser = await response.json()

    return {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      firstName: user.firstName,
      lastName: user.lastName,
    }
  })
