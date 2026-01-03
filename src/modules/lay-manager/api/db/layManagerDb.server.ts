/**
 * Lay Manager Database Server Functions
 *
 * TanStack Start server functions for Lay Manager database operations.
 * These run on the server to access the PostgreSQL database via Prisma.
 *
 * DO NOT use 'use server' directive - TanStack Start handles this via createServerFn()
 */

import { createServerFn } from '@tanstack/react-start'
import type { UnitTier, RaceOutcome } from '@prisma/client'

// Dynamic import helper - prevents prisma from being bundled for client
async function getPrisma() {
  const { default: prisma } = await import('@/lib/prisma.server')
  return prisma
}
import { recordMatchedBetPlaced, recordMatchedBetBackWins, recordMatchedBetLayWins } from '@/modules/the-furlong/api/db/layManagerJournalHooks.server'

// ============================================================================
// Types
// ============================================================================

export interface LayEntryInput {
  date: string // YYYY-MM-DD
  time: string // HH:mm
  track: string
  raceNumber: number
  meetingId?: number
  selectionName: string
  selectionNumber: number
  backBookie: string
  backStake: number
  backOdds: number
  backCommissionPercent?: number
  layBookie: string
  layStake: number
  layOdds: number
  layCommissionPercent?: number
  unitTier?: UnitTier
  selectedNormalBookies?: string[]
  selectedBetBackBookies?: string[]
  promoDetails?: Record<string, unknown>
}

export interface LayEntryUpdate {
  selectionName?: string
  selectionNumber?: number
  backBookie?: string
  backStake?: number
  backOdds?: number
  backCommissionPercent?: number
  layBookie?: string
  layStake?: number
  layOdds?: number
  layCommissionPercent?: number
  unitTier?: UnitTier
  outcome?: RaceOutcome
  outcomeNotes?: string
  profitLoss?: number
  autoResult?: Record<string, unknown>
  lastPolledAt?: string
  pollAttempts?: number
  readOnly?: boolean
}

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Get default profile ID (creates one if needed)
 */
async function getDefaultProfileId(): Promise<string> {
  const prisma = await getPrisma()
  let user = await prisma.user.findUnique({
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

/**
 * Get lay manager entries for a specific date
 */
export const getLayEntriesByDate = createServerFn({ method: 'GET' })
  .inputValidator((d: { date: string }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const profileId = await getDefaultProfileId()
    const date = new Date(data.date)

    const entries = await prisma.layManagerEntry.findMany({
      where: {
        profileId,
        date,
      },
      orderBy: [{ time: 'asc' }, { track: 'asc' }, { raceNumber: 'asc' }],
    })

    return { entries }
  })

/**
 * Get lay manager entries for a date range (for dashboard metrics)
 */
export const getLayEntriesByDateRange = createServerFn({ method: 'GET' })
  .inputValidator((d: { startDate: string; endDate: string }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const profileId = await getDefaultProfileId()
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)

    const entries = await prisma.layManagerEntry.findMany({
      where: {
        profileId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: [{ date: 'desc' }, { time: 'asc' }],
    })

    return { entries }
  })

/**
 * Create a new lay manager entry
 */
export const createLayEntry = createServerFn({ method: 'POST' })
  .inputValidator((d: { entry: LayEntryInput; linkedBonusId?: string }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const profileId = await getDefaultProfileId()
    const { entry, linkedBonusId } = data

    const created = await prisma.layManagerEntry.create({
      data: {
        profileId,
        date: new Date(entry.date),
        time: entry.time,
        track: entry.track,
        raceNumber: entry.raceNumber,
        meetingId: entry.meetingId || null,
        selectionName: entry.selectionName,
        selectionNumber: entry.selectionNumber,
        backBookie: entry.backBookie,
        backStake: entry.backStake,
        backOdds: entry.backOdds,
        backCommissionPercent: entry.backCommissionPercent || null,
        layBookie: entry.layBookie || 'Betfair',
        layStake: entry.layStake,
        layOdds: entry.layOdds,
        layCommissionPercent: entry.layCommissionPercent || null,
        unitTier: entry.unitTier || 'NEUTRAL',
        selectedNormalBookies: entry.selectedNormalBookies || [],
        selectedBetBackBookies: entry.selectedBetBackBookies || [],
        promoDetails: entry.promoDetails || {},
        linkedBonusId: linkedBonusId || null,
      },
    })

    // Trigger journal hook to record the matched bet placement
    try {
      // Look up bookie by name
      const bookie = await prisma.bookie.findFirst({
        where: { name: entry.backBookie },
      })

      if (bookie) {
        await recordMatchedBetPlaced({
          data: {
            profileId,
            layManagerEntryId: created.id,
            backBookieId: bookie.id,
            backStake: entry.backStake,
            backOdds: entry.backOdds,
            isBonusBet: !!linkedBonusId,
            layStake: entry.layStake,
            layOdds: entry.layOdds,
            horseName: entry.selectionName,
            track: entry.track,
            raceNumber: entry.raceNumber,
            entryDate: entry.date,
          },
        })
      }
    } catch (error) {
      // Log error but don't fail the entry creation
      console.error('Failed to record journal entry for matched bet:', error)
    }

    return { entry: created }
  })

/**
 * Update an existing lay manager entry
 */
export const updateLayEntry = createServerFn({ method: 'POST' })
  .inputValidator((d: { entryId: string; updates: LayEntryUpdate }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const { entryId, updates } = data

    // Get current entry to check for outcome transitions
    const current = await prisma.layManagerEntry.findUnique({
      where: { id: entryId },
    })

    // Convert dates if needed
    const updateData: Record<string, unknown> = { ...updates }
    if (updates.lastPolledAt) {
      updateData.lastPolledAt = new Date(updates.lastPolledAt)
    }

    const updated = await prisma.layManagerEntry.update({
      where: { id: entryId },
      data: updateData,
    })

    // Trigger journal hooks for outcome transitions
    if (current && updates.outcome) {
      const isWin = updates.outcome === 'WIN'
      const isLoss = updates.outcome === 'LOSS'
      const wasAlreadySettled =
        current.outcome === 'WIN' ||
        current.outcome === 'LOSS' ||
        current.outcome === 'SCRATCHED' ||
        current.outcome === 'REFUND' ||
        current.outcome === 'DEAD_HEAT'

      if (!wasAlreadySettled) {
        const bookie = await prisma.bookie.findFirst({
          where: { name: current.backBookie },
        })

        if (bookie) {
          if (isWin) {
            // Back wins (horse wins) - lay side loses
            try {
              await recordMatchedBetBackWins({
                data: {
                  profileId: current.profileId,
                  layManagerEntryId: entryId,
                  backBookieId: bookie.id,
                  backStake: Number(current.backStake),
                  backOdds: Number(current.backOdds),
                  isBonusBet: !!current.linkedBonusId,
                  layStake: Number(current.layStake),
                  layOdds: Number(current.layOdds),
                  horseName: current.selectionName,
                  track: current.track,
                  raceNumber: current.raceNumber,
                  entryDate: current.date.toISOString().split('T')[0],
                },
              })
            } catch (error) {
              console.error('Failed to record journal entry for back wins settlement:', error)
            }
          } else if (isLoss) {
            // Lay wins (horse loses) - back side loses
            try {
              await recordMatchedBetLayWins({
                data: {
                  profileId: current.profileId,
                  layManagerEntryId: entryId,
                  backBookieId: bookie.id,
                  backStake: Number(current.backStake),
                  isBonusBet: !!current.linkedBonusId,
                  layStake: Number(current.layStake),
                  layOdds: Number(current.layOdds),
                  layCommissionPercent: current.layCommissionPercent ? Number(current.layCommissionPercent) : 5,
                  horseName: current.selectionName,
                  track: current.track,
                  raceNumber: current.raceNumber,
                  entryDate: current.date.toISOString().split('T')[0],
                },
              })
            } catch (error) {
              console.error('Failed to record journal entry for lay wins settlement:', error)
            }
          }
        }
      }
    }

    return { entry: updated }
  })

/**
 * Delete a lay manager entry
 */
export const deleteLayEntry = createServerFn({ method: 'POST' })
  .inputValidator((d: { entryId: string }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    await prisma.layManagerEntry.delete({
      where: { id: data.entryId },
    })

    return { success: true }
  })

/**
 * Batch update outcomes (for auto-result processing)
 */
export const batchUpdateLayOutcomes = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      updates: Array<{
        entryId: string
        outcome: RaceOutcome
        autoResult: Record<string, unknown>
        profitLoss?: number
      }>
    }) => d
  )
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    // Get current entries to check for outcome transitions
    const entryIds = data.updates.map((u) => u.entryId)
    const currentEntries = await prisma.layManagerEntry.findMany({
      where: { id: { in: entryIds } },
    })
    const currentMap = new Map(currentEntries.map((e) => [e.id, e]))

    // Perform updates
    const results = await Promise.all(
      data.updates.map((update) =>
        prisma.layManagerEntry.update({
          where: { id: update.entryId },
          data: {
            outcome: update.outcome,
            autoResult: update.autoResult,
            profitLoss: update.profitLoss,
            lastPolledAt: new Date(),
          },
        })
      )
    )

    // Trigger journal hooks for entries transitioning to WIN or LOSS
    for (const update of data.updates) {
      const current = currentMap.get(update.entryId)
      if (!current) continue

      const isWin = update.outcome === 'WIN'
      const isLoss = update.outcome === 'LOSS'
      const wasAlreadySettled =
        current.outcome === 'WIN' ||
        current.outcome === 'LOSS' ||
        current.outcome === 'SCRATCHED' ||
        current.outcome === 'REFUND' ||
        current.outcome === 'DEAD_HEAT'

      if (!wasAlreadySettled && (isWin || isLoss)) {
        const bookie = await prisma.bookie.findFirst({
          where: { name: current.backBookie },
        })

        if (bookie) {
          if (isWin) {
            // Back wins (horse wins) - lay side loses
            try {
              await recordMatchedBetBackWins({
                data: {
                  profileId: current.profileId,
                  layManagerEntryId: update.entryId,
                  backBookieId: bookie.id,
                  backStake: Number(current.backStake),
                  backOdds: Number(current.backOdds),
                  isBonusBet: !!current.linkedBonusId,
                  layStake: Number(current.layStake),
                  layOdds: Number(current.layOdds),
                  horseName: current.selectionName,
                  track: current.track,
                  raceNumber: current.raceNumber,
                  entryDate: current.date.toISOString().split('T')[0],
                },
              })
            } catch (error) {
              console.error('Failed to record journal entry for back wins settlement:', error)
            }
          } else if (isLoss) {
            // Lay wins (horse loses) - back side loses
            try {
              await recordMatchedBetLayWins({
                data: {
                  profileId: current.profileId,
                  layManagerEntryId: update.entryId,
                  backBookieId: bookie.id,
                  backStake: Number(current.backStake),
                  isBonusBet: !!current.linkedBonusId,
                  layStake: Number(current.layStake),
                  layOdds: Number(current.layOdds),
                  layCommissionPercent: current.layCommissionPercent ? Number(current.layCommissionPercent) : 5,
                  horseName: current.selectionName,
                  track: current.track,
                  raceNumber: current.raceNumber,
                  entryDate: current.date.toISOString().split('T')[0],
                },
              })
            } catch (error) {
              console.error('Failed to record journal entry for lay wins settlement:', error)
            }
          }
        }
      }
    }

    return { updated: results.length }
  })

/**
 * Get summary statistics for a date range
 */
export const getLayManagerSummary = createServerFn({ method: 'GET' })
  .inputValidator((d: { startDate: string; endDate: string }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const profileId = await getDefaultProfileId()
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)

    const entries = await prisma.layManagerEntry.findMany({
      where: {
        profileId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        outcome: true,
        profitLoss: true,
        backBookie: true,
        layBookie: true,
        track: true,
      },
    })

    // Calculate summary
    const total = entries.length
    const wins = entries.filter((e) => e.outcome === 'WIN').length
    const losses = entries.filter((e) => e.outcome === 'LOSS').length
    const pending = entries.filter((e) => e.outcome === 'PENDING').length
    const totalProfitLoss = entries.reduce(
      (sum, e) => sum + (e.profitLoss ? Number(e.profitLoss) : 0),
      0
    )

    // Group by back bookie
    const byBackBookie = entries.reduce(
      (acc, e) => {
        if (!acc[e.backBookie]) {
          acc[e.backBookie] = { count: 0, wins: 0, profitLoss: 0 }
        }
        acc[e.backBookie].count++
        if (e.outcome === 'WIN') acc[e.backBookie].wins++
        acc[e.backBookie].profitLoss += e.profitLoss ? Number(e.profitLoss) : 0
        return acc
      },
      {} as Record<string, { count: number; wins: number; profitLoss: number }>
    )

    return {
      summary: {
        total,
        wins,
        losses,
        pending,
        winRate: total > 0 ? (wins / total) * 100 : 0,
        totalProfitLoss,
        byBackBookie,
      },
    }
  })
