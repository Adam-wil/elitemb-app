/**
 * Deposit Match Database Server Functions
 *
 * Full CRUD operations for deposit match bonuses (sign-up offers, reloads, deposit matches).
 * Linked to journal entries for double-entry accounting.
 */

import { createServerFn } from '@tanstack/react-start'
import { recordDepositMatchBonusCredit, voidBonusCredit } from './journalService.server'

// Dynamic import helper - prevents prisma from being bundled for client
async function getPrisma() {
  const { default: prisma } = await import('@/lib/prisma.server')
  return prisma
}

// ============================================================================
// Types
// ============================================================================

export interface DepositMatchRecord {
  id: string
  profileId: string
  bookieId: number
  bookieName: string
  amount: number
  date: string // YYYY-MM-DD
  notes: string | null
  journalEntryId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateDepositMatchInput {
  profileId?: string
  bookieId: number
  bookieName: string
  amount: number
  date: string
  notes?: string
}

export interface UpdateDepositMatchInput {
  id: string
  amount?: number
  date?: string
  notes?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getDefaultProfileId(): Promise<string> {
  const prisma = await getPrisma()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user: any = await prisma.user.findUnique({
    where: { email: 'default@elitemb.local' },
    include: { Profile: { where: { isDefault: true } } },
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'default@elitemb.local',
        Profile: {
          create: {
            name: 'Default Profile',
            isDefault: true,
          },
        },
      },
      include: { Profile: { where: { isDefault: true } } },
    })
  }

  const profile = user.Profile[0]
  if (!profile) {
    const newProfile = await prisma.profile.create({
      data: {
        userId: user.id,
        name: 'Default Profile',
        isDefault: true,
      },
    })
    return newProfile.id
  }

  return profile.id
}

function toDepositMatchRecord(dm: {
  id: string
  profileId: string
  bookieId: number
  amount: unknown
  date: Date
  notes: string | null
  journalEntryId: string | null
  createdAt: Date
  updatedAt: Date
  Bookie: { name: string }
}): DepositMatchRecord {
  return {
    id: dm.id,
    profileId: dm.profileId,
    bookieId: dm.bookieId,
    bookieName: dm.Bookie.name,
    amount: Number(dm.amount),
    date: dm.date.toISOString().split('T')[0],
    notes: dm.notes,
    journalEntryId: dm.journalEntryId,
    createdAt: dm.createdAt.toISOString(),
    updatedAt: dm.updatedAt.toISOString(),
  }
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new deposit match record
 * Also creates the corresponding journal entry for accounting
 */
export const createDepositMatch = createServerFn({ method: 'POST' })
  .inputValidator((d: CreateDepositMatchInput) => d)
  .handler(async ({ data }): Promise<DepositMatchRecord> => {
    const prisma = await getPrisma()
    const profileId = data.profileId || (await getDefaultProfileId())

    // Create the deposit match record
    const depositMatch = await prisma.depositMatch.create({
      data: {
        profileId,
        bookieId: data.bookieId,
        amount: data.amount,
        date: new Date(data.date),
        notes: data.notes || null,
      },
      include: {
        Bookie: { select: { name: true } },
      },
    })

    // Create journal entry for accounting
    try {
      const journalResult = await recordDepositMatchBonusCredit({
        data: {
          profileId,
          bookieName: depositMatch.Bookie.name,
          amount: data.amount,
          notes: data.notes,
          bonusCreditId: depositMatch.id, // Link for idempotency
          entryDate: data.date,
        },
      })

      // Update deposit match with journal entry ID
      const updated = await prisma.depositMatch.update({
        where: { id: depositMatch.id },
        data: { journalEntryId: journalResult.journalEntry.id },
        include: {
          Bookie: { select: { name: true } },
        },
      })

      return toDepositMatchRecord(updated)
    } catch (error) {
      console.error('Failed to create journal entry for deposit match:', error)
      // Return the deposit match anyway - journal can be created later
      return toDepositMatchRecord(depositMatch)
    }
  })

/**
 * Get all deposit matches for a profile
 */
export const getDepositMatches = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId?: string }) => d)
  .handler(async ({ data }): Promise<DepositMatchRecord[]> => {
    const prisma = await getPrisma()
    const profileId = data.profileId || (await getDefaultProfileId())

    const depositMatches = await prisma.depositMatch.findMany({
      where: { profileId },
      include: {
        Bookie: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    })

    return depositMatches.map(toDepositMatchRecord)
  })

/**
 * Get deposit matches for a specific bookie
 */
export const getDepositMatchesByBookie = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId?: string; bookieId: number }) => d)
  .handler(async ({ data }): Promise<DepositMatchRecord[]> => {
    const prisma = await getPrisma()
    const profileId = data.profileId || (await getDefaultProfileId())

    const depositMatches = await prisma.depositMatch.findMany({
      where: {
        profileId,
        bookieId: data.bookieId,
      },
      include: {
        Bookie: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    })

    return depositMatches.map(toDepositMatchRecord)
  })

/**
 * Get a single deposit match by ID
 */
export const getDepositMatch = createServerFn({ method: 'GET' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<DepositMatchRecord | null> => {
    const prisma = await getPrisma()
    const depositMatch = await prisma.depositMatch.findUnique({
      where: { id: data.id },
      include: {
        Bookie: { select: { name: true } },
      },
    })

    if (!depositMatch) return null
    return toDepositMatchRecord(depositMatch)
  })

/**
 * Update a deposit match record
 * Note: Updating amount requires voiding and recreating the journal entry
 */
export const updateDepositMatch = createServerFn({ method: 'POST' })
  .inputValidator((d: UpdateDepositMatchInput) => d)
  .handler(async ({ data }): Promise<DepositMatchRecord> => {
    const prisma = await getPrisma()
    const existing = await prisma.depositMatch.findUnique({
      where: { id: data.id },
      include: { Bookie: { select: { name: true } } },
    })

    if (!existing) {
      throw new Error(`Deposit match ${data.id} not found`)
    }

    const amountChanged = data.amount !== undefined && data.amount !== Number(existing.amount)

    // If amount changed, void old journal entry and create new one
    if (amountChanged && existing.journalEntryId) {
      try {
        await voidBonusCredit({
          data: {
            journalEntryId: existing.journalEntryId,
            reason: 'Deposit match amount updated',
          },
        })
      } catch (error) {
        console.error('Failed to void old journal entry:', error)
      }
    }

    // Update the deposit match
    const updated = await prisma.depositMatch.update({
      where: { id: data.id },
      data: {
        amount: data.amount,
        date: data.date ? new Date(data.date) : undefined,
        notes: data.notes,
        journalEntryId: amountChanged ? null : undefined, // Clear if amount changed
      },
      include: {
        Bookie: { select: { name: true } },
      },
    })

    // Create new journal entry if amount changed
    if (amountChanged) {
      try {
        const journalResult = await recordDepositMatchBonusCredit({
          data: {
            profileId: updated.profileId,
            bookieName: updated.Bookie.name,
            amount: Number(updated.amount),
            notes: updated.notes || undefined,
            bonusCreditId: updated.id,
            entryDate: updated.date.toISOString().split('T')[0],
          },
        })

        await prisma.depositMatch.update({
          where: { id: updated.id },
          data: { journalEntryId: journalResult.journalEntry.id },
        })
        updated.journalEntryId = journalResult.journalEntry.id
      } catch (error) {
        console.error('Failed to create new journal entry:', error)
      }
    }

    return toDepositMatchRecord(updated)
  })

/**
 * Delete a deposit match record
 * Also voids the linked journal entry
 */
export const deleteDepositMatch = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const prisma = await getPrisma()
    const existing = await prisma.depositMatch.findUnique({
      where: { id: data.id },
    })

    if (!existing) {
      throw new Error(`Deposit match ${data.id} not found`)
    }

    // Void the journal entry if it exists
    if (existing.journalEntryId) {
      try {
        await voidBonusCredit({
          data: {
            journalEntryId: existing.journalEntryId,
            reason: 'Deposit match deleted',
          },
        })
      } catch (error) {
        console.error('Failed to void journal entry:', error)
      }
    }

    // Delete the deposit match
    await prisma.depositMatch.delete({
      where: { id: data.id },
    })

    return { success: true }
  })

/**
 * Get summary of deposit matches grouped by bookie
 */
export const getDepositMatchSummaryByBookie = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId?: string }) => d)
  .handler(
    async ({
      data,
    }): Promise<{ bookieId: number; bookieName: string; totalAmount: number; count: number }[]> => {
      const prisma = await getPrisma()
      const profileId = data.profileId || (await getDefaultProfileId())

      const results = await prisma.depositMatch.groupBy({
        by: ['bookieId'],
        where: { profileId },
        _sum: { amount: true },
        _count: { id: true },
      })

      // Get bookie names
      const bookieIds = results.map((r) => r.bookieId)
      const bookies = await prisma.bookie.findMany({
        where: { id: { in: bookieIds } },
        select: { id: true, name: true },
      })
      const bookieMap = new Map(bookies.map((b) => [b.id, b.name]))

      return results
        .map((r) => ({
          bookieId: r.bookieId,
          bookieName: bookieMap.get(r.bookieId) || 'Unknown',
          totalAmount: Number(r._sum.amount || 0),
          count: r._count.id,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
    }
  )

/**
 * Get total deposit match amount for a profile
 */
export const getDepositMatchTotal = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId?: string }) => d)
  .handler(async ({ data }): Promise<{ total: number; count: number }> => {
    const prisma = await getPrisma()
    const profileId = data.profileId || (await getDefaultProfileId())

    const result = await prisma.depositMatch.aggregate({
      where: { profileId },
      _sum: { amount: true },
      _count: { id: true },
    })

    return {
      total: Number(result._sum.amount || 0),
      count: result._count.id,
    }
  })
