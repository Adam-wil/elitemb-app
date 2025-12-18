/**
 * Bookie Management Server Functions
 *
 * Server functions for managing bookies (built-in + custom).
 * These will integrate with the database when available.
 *
 * Current implementation uses in-memory storage + localStorage bridge.
 * Future: Replace with database queries.
 */

import { createServerFn } from '@tanstack/react-start'
import type { BookieDefinition } from '../types'
import { BOOKIE_DEFINITIONS } from '../utils/bookieList'

// ============================================================================
// Types
// ============================================================================

interface BookieSubmission {
  name: string
  aliases: string[]
  website?: string
  isExchange: boolean
  submittedBy: string // User ID or email
}

interface BookieSubmissionResult {
  status: 'approved' | 'rejected' | 'pending'
  message: string
  bookieId?: string
  existingBookie?: {
    id: string
    name: string
  }
}

// ============================================================================
// In-Memory Storage (Replace with database)
// ============================================================================

// Approved custom bookies (would come from database)
const approvedCustomBookies: BookieDefinition[] = []

// Pending submissions (would be stored in database)
const pendingSubmissions: Array<BookieSubmission & { id: string; submittedAt: string }> = []

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Get all bookies (built-in + approved custom)
 */
export const getAllBookiesServer = createServerFn({ method: 'GET' }).handler(async () => {
  // Future: Query database for approved custom bookies
  const allBookies = [...BOOKIE_DEFINITIONS, ...approvedCustomBookies]

  return {
    bookies: allBookies,
    count: allBookies.length,
    builtInCount: BOOKIE_DEFINITIONS.length,
    customCount: approvedCustomBookies.length,
  }
})

/**
 * Search for existing bookie by name or alias
 */
export const searchBookieServer = createServerFn({ method: 'GET' })
  .inputValidator((d: { query: string }) => d)
  .handler(async ({ data }) => {
    const query = data.query.toUpperCase().trim()

    if (query.length < 2) {
      return { matches: [], query }
    }

    const allBookies = [...BOOKIE_DEFINITIONS, ...approvedCustomBookies]

    // Search in name and aliases
    const matches = allBookies.filter(bookie => {
      const nameMatch = bookie.name.toUpperCase().includes(query)
      const aliasMatch = bookie.aliases.some(alias => alias.toUpperCase().includes(query))
      return nameMatch || aliasMatch
    })

    return {
      matches: matches.map(b => ({
        id: b.id,
        name: b.name,
        aliases: b.aliases,
        isExchange: b.isExchange,
      })),
      query,
    }
  })

/**
 * Submit a new bookie for approval
 *
 * Validates against existing bookies to prevent duplicates.
 * Future: Store in database for admin approval.
 */
export const submitBookieServer = createServerFn({ method: 'POST' })
  .inputValidator((d: BookieSubmission) => d)
  .handler(async ({ data }) => {
    const allBookies = [...BOOKIE_DEFINITIONS, ...approvedCustomBookies]

    // Normalize for comparison
    const normalizedName = data.name.toUpperCase().trim()
    const normalizedAliases = data.aliases.map(a => a.toUpperCase().trim())

    // Check for duplicate by name
    const nameMatch = allBookies.find(b => b.name.toUpperCase() === normalizedName)

    if (nameMatch) {
      return {
        status: 'rejected' as const,
        message: `A bookie named "${nameMatch.name}" already exists.`,
        existingBookie: {
          id: nameMatch.id,
          name: nameMatch.name,
        },
      }
    }

    // Check for duplicate by alias
    for (const bookie of allBookies) {
      const matchingAlias = bookie.aliases.find(existingAlias =>
        normalizedAliases.some(
          newAlias =>
            newAlias === existingAlias.toUpperCase() ||
            newAlias.includes(existingAlias.toUpperCase()) ||
            existingAlias.toUpperCase().includes(newAlias)
        )
      )

      if (matchingAlias) {
        return {
          status: 'rejected' as const,
          message: `The alias "${matchingAlias}" is already associated with "${bookie.name}".`,
          existingBookie: {
            id: bookie.id,
            name: bookie.name,
          },
        }
      }
    }

    // Check pending submissions for duplicates
    const pendingMatch = pendingSubmissions.find(
      p =>
        p.name.toUpperCase() === normalizedName ||
        p.aliases.some(a => normalizedAliases.includes(a.toUpperCase()))
    )

    if (pendingMatch) {
      return {
        status: 'rejected' as const,
        message: `A similar bookie "${pendingMatch.name}" is already pending approval.`,
      }
    }

    // Create submission
    const submissionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Future: Store in database
    pendingSubmissions.push({
      ...data,
      id: submissionId,
      submittedAt: new Date().toISOString(),
    })

    return {
      status: 'pending' as const,
      message:
        'Bookie submitted for review. It will be available once approved by an administrator.',
      bookieId: submissionId,
    }
  })

/**
 * Add alias to existing bookie (for detected bank statement variations)
 *
 * Future: Requires admin approval or auto-approve based on confidence.
 */
export const suggestAliasServer = createServerFn({ method: 'POST' })
  .inputValidator((d: { bookieId: string; alias: string; transactionDescription: string }) => d)
  .handler(async ({ data }) => {
    const allBookies = [...BOOKIE_DEFINITIONS, ...approvedCustomBookies]
    const bookie = allBookies.find(b => b.id === data.bookieId)

    if (!bookie) {
      return {
        status: 'rejected' as const,
        message: 'Bookie not found.',
      }
    }

    const normalizedAlias = data.alias.toUpperCase().trim()

    // Check if alias already exists on this bookie
    if (bookie.aliases.some(a => a.toUpperCase() === normalizedAlias)) {
      return {
        status: 'rejected' as const,
        message: 'This alias already exists for this bookie.',
      }
    }

    // Check if alias exists on another bookie
    const conflictingBookie = allBookies.find(
      b => b.id !== data.bookieId && b.aliases.some(a => a.toUpperCase() === normalizedAlias)
    )

    if (conflictingBookie) {
      return {
        status: 'rejected' as const,
        message: `This alias is already used by "${conflictingBookie.name}".`,
      }
    }

    // Future: Store suggestion in database for admin review
    // For now, return pending status

    return {
      status: 'pending' as const,
      message: `Alias suggestion "${data.alias}" submitted for "${bookie.name}". Pending admin review.`,
    }
  })

/**
 * Get pending bookie submissions (admin only)
 *
 * Future: Add authentication/authorization check
 */
export const getPendingSubmissionsServer = createServerFn({ method: 'GET' }).handler(async () => {
  // Future: Check if user is admin

  return {
    submissions: pendingSubmissions.map(s => ({
      id: s.id,
      name: s.name,
      aliases: s.aliases,
      website: s.website,
      isExchange: s.isExchange,
      submittedBy: s.submittedBy,
      submittedAt: s.submittedAt,
    })),
    count: pendingSubmissions.length,
  }
})

/**
 * Approve a bookie submission (admin only)
 *
 * Future: Add authentication/authorization check
 * Future: Store in database
 */
export const approveBookieSubmissionServer = createServerFn({ method: 'POST' })
  .inputValidator((d: { submissionId: string }) => d)
  .handler(async ({ data }) => {
    // Future: Check if user is admin

    const index = pendingSubmissions.findIndex(s => s.id === data.submissionId)

    if (index === -1) {
      return {
        status: 'error' as const,
        message: 'Submission not found.',
      }
    }

    const submission = pendingSubmissions[index]

    // Create new bookie
    const newBookie: BookieDefinition = {
      id: `custom-${submission.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name: submission.name,
      aliases: submission.aliases.map(a => a.toUpperCase()),
      website: submission.website,
      isExchange: submission.isExchange,
    }

    // Add to approved list
    approvedCustomBookies.push(newBookie)

    // Remove from pending
    pendingSubmissions.splice(index, 1)

    // Future: Persist to database

    return {
      status: 'approved' as const,
      message: `Bookie "${newBookie.name}" has been approved and is now available.`,
      bookie: newBookie,
    }
  })

/**
 * Reject a bookie submission (admin only)
 */
export const rejectBookieSubmissionServer = createServerFn({ method: 'POST' })
  .inputValidator((d: { submissionId: string; reason?: string }) => d)
  .handler(async ({ data }) => {
    // Future: Check if user is admin

    const index = pendingSubmissions.findIndex(s => s.id === data.submissionId)

    if (index === -1) {
      return {
        status: 'error' as const,
        message: 'Submission not found.',
      }
    }

    const submission = pendingSubmissions[index]

    // Remove from pending
    pendingSubmissions.splice(index, 1)

    // Future: Store rejection in database, notify user

    return {
      status: 'rejected' as const,
      message: `Submission for "${submission.name}" has been rejected.${data.reason ? ` Reason: ${data.reason}` : ''}`,
    }
  })
