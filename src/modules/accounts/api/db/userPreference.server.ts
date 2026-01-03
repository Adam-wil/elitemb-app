/**
 * User Preference Server Functions
 *
 * Manages user preferences including ledger filter and reconciliation timestamp.
 */

import { createServerFn } from '@tanstack/react-start'
import type { AccountFilter } from '../../types/ledger'
import { isValidAccountFilter } from '../../types/ledger'

// Dynamic import helper - prevents prisma from being bundled for client
async function getPrisma() {
  const { default: prisma } = await import('@/lib/prisma.server')
  return prisma
}

// ============================================================================
// Helper: Get Default Profile ID
// ============================================================================

async function getDefaultProfileId(): Promise<string> {
  const prisma = await getPrisma()
  const profile = await prisma.profile.findFirst({
    where: { isDefault: true },
    select: { id: true },
  })
  if (!profile) {
    throw new Error('No default profile found')
  }
  return profile.id
}

// ============================================================================
// Types
// ============================================================================

export interface UserPreferenceData {
  ledgerFilter: AccountFilter
  lastReconciledAt: string | null
}

// ============================================================================
// Get User Preference
// ============================================================================

/**
 * Get user preferences for the current profile
 * Creates default preferences if none exist
 */
export const getUserPreference = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId?: string }) => d)
  .handler(async ({ data }): Promise<UserPreferenceData> => {
    const prisma = await getPrisma()
    const profileId = data.profileId || (await getDefaultProfileId())

    // Try to find existing preference
    let pref = await prisma.userPreference.findUnique({
      where: { profileId },
    })

    // Create default if not exists
    if (!pref) {
      pref = await prisma.userPreference.create({
        data: {
          profileId,
          ledgerFilter: 'all',
        },
      })
    }

    // Validate ledgerFilter value
    const ledgerFilter = isValidAccountFilter(pref.ledgerFilter)
      ? (pref.ledgerFilter as AccountFilter)
      : 'all'

    return {
      ledgerFilter,
      lastReconciledAt: pref.lastReconciledAt?.toISOString() ?? null,
    }
  })

// ============================================================================
// Update Ledger Filter
// ============================================================================

/**
 * Update the ledger filter preference
 */
export const updateLedgerFilter = createServerFn({ method: 'POST' })
  .inputValidator((d: { profileId?: string; filter: AccountFilter }) => d)
  .handler(async ({ data }): Promise<UserPreferenceData> => {
    const prisma = await getPrisma()
    const profileId = data.profileId || (await getDefaultProfileId())
    const { filter } = data

    // Validate filter value
    if (!isValidAccountFilter(filter)) {
      throw new Error(`Invalid filter value: ${filter}`)
    }

    // Upsert preference
    const pref = await prisma.userPreference.upsert({
      where: { profileId },
      update: {
        ledgerFilter: filter,
      },
      create: {
        profileId,
        ledgerFilter: filter,
      },
    })

    return {
      ledgerFilter: pref.ledgerFilter as AccountFilter,
      lastReconciledAt: pref.lastReconciledAt?.toISOString() ?? null,
    }
  })

// ============================================================================
// Update Last Reconciled Timestamp
// ============================================================================

/**
 * Update the last reconciled timestamp to now
 * Called when user views the Attention filter or manually reconciles
 */
export const updateLastReconciled = createServerFn({ method: 'POST' })
  .inputValidator((d: { profileId?: string }) => d)
  .handler(async ({ data }): Promise<UserPreferenceData> => {
    const prisma = await getPrisma()
    const profileId = data.profileId || (await getDefaultProfileId())

    // Upsert preference with current timestamp
    const pref = await prisma.userPreference.upsert({
      where: { profileId },
      update: {
        lastReconciledAt: new Date(),
      },
      create: {
        profileId,
        ledgerFilter: 'all',
        lastReconciledAt: new Date(),
      },
    })

    return {
      ledgerFilter: pref.ledgerFilter as AccountFilter,
      lastReconciledAt: pref.lastReconciledAt?.toISOString() ?? null,
    }
  })
