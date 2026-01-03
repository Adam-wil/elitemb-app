/**
 * Racing Tracker Database Server Functions
 *
 * TanStack Start server functions for Racing Manager (The Furlong) database operations.
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
import {
  recordRacingBetPlaced,
  recordRacingWin,
  recordRacingLoss,
  recordRacingVoid,
  recordRacingDeadHeat,
  settleMultiLegBet,
} from './racingJournalHooks.server'
import { isMultiLegChild } from '@/modules/the-furlong/utils/multiLegHelpers.server'
import type { VoidType } from '@/modules/accounts/types/journal'

/**
 * Try to settle multi-leg parent when a child leg outcome is updated
 *
 * Settlement triggers:
 * - LOSS on any leg: Settle immediately (early loss)
 * - All legs settled: Settle with combined outcome
 *
 * @param childEntryId - The child leg entry that was just updated
 * @param outcome - The new outcome of the child leg
 */
async function trySettleMultiLegParent(
  childEntryId: string,
  outcome: RaceOutcome
): Promise<void> {
  const prisma = await getPrisma()

  // Get the child entry to find its parent
  const childEntry = await prisma.racingTrackerEntry.findUnique({
    where: { id: childEntryId },
    select: {
      parentBetId: true,
      isMultiLeg: true,
      profileId: true,
      backBookie: true,
    },
  })

  if (!childEntry || !isMultiLegChild(childEntry)) {
    return // Not a child leg, nothing to settle
  }

  const parentId = childEntry.parentBetId!

  // Get bookie ID for journal entry
  const bookie = await prisma.bookie.findFirst({
    where: { name: childEntry.backBookie },
  })

  // Early loss: Settle immediately if any leg loses
  if (outcome === 'LOSS') {
    try {
      await settleMultiLegBet({
        data: {
          profileId: childEntry.profileId,
          parentEntryId: parentId,
          model: 'racing',
          bookieId: bookie?.id,
        },
      })
    } catch (error) {
      console.error('Failed to settle multi-leg (early loss):', error)
    }
    return
  }

  // Check if all legs are now settled
  const siblings = await prisma.racingTrackerEntry.findMany({
    where: { parentBetId: parentId },
    select: { outcome: true },
  })

  const allSettled = siblings.every((s) => s.outcome !== 'PENDING')

  if (allSettled) {
    try {
      await settleMultiLegBet({
        data: {
          profileId: childEntry.profileId,
          parentEntryId: parentId,
          model: 'racing',
          bookieId: bookie?.id,
        },
      })
    } catch (error) {
      console.error('Failed to settle multi-leg (all legs settled):', error)
    }
  }
}

/**
 * Extract dead heat divisor from tracker entry data
 * Checks autoResult first, then outcomeNotes for patterns like "DH 1/3"
 */
function extractDeadHeatDivisor(
  autoResult: Record<string, unknown> | null,
  outcomeNotes: string | null
): number {
  // Check autoResult first (API data)
  if (autoResult) {
    if (typeof autoResult.deadHeatDivisor === 'number') {
      return autoResult.deadHeatDivisor
    }
    // If flagged as dead heat but no divisor, default to 2
    if (autoResult.deadHeat) {
      return 2
    }
  }

  // Check outcomeNotes for manual entry like "DH 1/3" or "Dead Heat 1/2"
  if (outcomeNotes) {
    const match = outcomeNotes.match(/(?:DH|Dead\s*Heat)\s*1\/(\d+)/i)
    if (match) {
      return parseInt(match[1], 10)
    }
  }

  // Default to 2-way dead heat
  return 2
}

// ============================================================================
// Types
// ============================================================================

export interface TrackerEntryInput {
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
  layBookie?: string
  layStake?: number
  layOdds?: number
  layCommissionPercent?: number
  unitTier?: UnitTier
  selectedNormalBookies?: string[]
  selectedBetBackBookies?: string[]
  promoDetails?: Record<string, unknown>
  planEntryId?: string
}

export interface TrackerEntryUpdate {
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

  // Find or create default user
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
 * Get tracker entries for a specific date
 */
export const getTrackerEntriesByDate = createServerFn({ method: 'GET' })
  .inputValidator((d: { date: string }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const profileId = await getDefaultProfileId()
    const date = new Date(data.date)

    const entries = await prisma.racingTrackerEntry.findMany({
      where: {
        profileId,
        date,
      },
      orderBy: [{ time: 'asc' }, { track: 'asc' }, { raceNumber: 'asc' }],
    })

    return { entries }
  })

/**
 * Get tracker entries for a date range (for dashboard metrics)
 */
export const getTrackerEntriesByDateRange = createServerFn({ method: 'GET' })
  .inputValidator((d: { startDate: string; endDate: string }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const profileId = await getDefaultProfileId()
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)

    const entries = await prisma.racingTrackerEntry.findMany({
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
 * Create a new tracker entry
 */
export const createTrackerEntry = createServerFn({ method: 'POST' })
  .inputValidator((d: { entry: TrackerEntryInput }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const profileId = await getDefaultProfileId()
    const { entry } = data

    const created = await prisma.racingTrackerEntry.create({
      data: {
        profileId,
        planEntryId: entry.planEntryId || null,
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
        layStake: entry.layStake || null,
        layOdds: entry.layOdds || null,
        layCommissionPercent: entry.layCommissionPercent || null,
        unitTier: entry.unitTier || 'NEUTRAL',
        selectedNormalBookies: entry.selectedNormalBookies || [],
        selectedBetBackBookies: entry.selectedBetBackBookies || [],
        promoDetails: entry.promoDetails || {},
      },
    })

    // Record journal entry for bet placement
    try {
      // Determine if this is a bonus bet (check linkedBonusId on tracker entry)
      const trackerWithBonus = await prisma.racingTrackerEntry.findUnique({
        where: { id: created.id },
        select: { linkedBonusId: true },
      })
      const isBonusBet = !!trackerWithBonus?.linkedBonusId

      // Get bookie ID from name
      const bookie = await prisma.bookie.findFirst({
        where: { name: entry.backBookie },
      })

      if (bookie) {
        await recordRacingBetPlaced({
          data: {
            profileId,
            trackerEntryId: created.id,
            bookieId: bookie.id,
            stake: Number(created.backStake),
            isBonusBet,
            horseName: created.selectionName,
            track: created.track,
            raceNumber: created.raceNumber,
            entryDate: created.date.toISOString().split('T')[0],
          },
        })
      }
    } catch (error) {
      // Log error but don't fail bet placement
      console.error('Failed to record journal entry for bet placement:', error)
    }

    return { entry: created }
  })

/**
 * Update an existing tracker entry
 */
export const updateTrackerEntry = createServerFn({ method: 'POST' })
  .inputValidator((d: { entryId: string; updates: TrackerEntryUpdate }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const { entryId, updates } = data

    // Get current entry to check for outcome transition
    const current = await prisma.racingTrackerEntry.findUnique({
      where: { id: entryId },
      select: {
        outcome: true,
        outcomeNotes: true,
        autoResult: true,
        profileId: true,
        backBookie: true,
        backStake: true,
        backOdds: true,
        linkedBonusId: true,
        selectionName: true,
        track: true,
        raceNumber: true,
        date: true,
      },
    })

    // Convert dates if needed
    const updateData: Record<string, unknown> = { ...updates }
    if (updates.lastPolledAt) {
      updateData.lastPolledAt = new Date(updates.lastPolledAt)
    }

    const updated = await prisma.racingTrackerEntry.update({
      where: { id: entryId },
      data: updateData,
    })

    // Trigger journal hook if outcome changed to WIN, LOSS, DEAD_HEAT, SCRATCHED, or REFUND
    if (current && updates.outcome) {
      const isWin = updates.outcome === 'WIN'
      const isLoss = updates.outcome === 'LOSS'
      const isDeadHeat = updates.outcome === 'DEAD_HEAT'
      const isVoid = updates.outcome === 'SCRATCHED' || updates.outcome === 'REFUND'
      const wasAlreadySettled =
        current.outcome === 'WIN' ||
        current.outcome === 'LOSS' ||
        current.outcome === 'DEAD_HEAT' ||
        current.outcome === 'SCRATCHED' ||
        current.outcome === 'REFUND'

      if ((isWin || isLoss || isDeadHeat || isVoid) && !wasAlreadySettled) {
        try {
          const bookie = await prisma.bookie.findFirst({
            where: { name: current.backBookie },
          })

          if (bookie) {
            if (isWin) {
              await recordRacingWin({
                data: {
                  profileId: current.profileId,
                  trackerEntryId: entryId,
                  bookieId: bookie.id,
                  stake: Number(current.backStake),
                  odds: Number(current.backOdds),
                  isBonusBet: !!current.linkedBonusId,
                  horseName: current.selectionName,
                  track: current.track,
                  raceNumber: current.raceNumber,
                  entryDate: current.date.toISOString().split('T')[0],
                },
              })
            } else if (isLoss) {
              await recordRacingLoss({
                data: {
                  profileId: current.profileId,
                  trackerEntryId: entryId,
                  bookieId: bookie.id,
                  stake: Number(current.backStake),
                  isBonusBet: !!current.linkedBonusId,
                  horseName: current.selectionName,
                  track: current.track,
                  raceNumber: current.raceNumber,
                  entryDate: current.date.toISOString().split('T')[0],
                },
              })
            } else if (isDeadHeat) {
              // Extract dead heat divisor from autoResult or outcomeNotes
              const autoResult = (updates.autoResult || current.autoResult) as Record<string, unknown> | null
              const outcomeNotes = updates.outcomeNotes || current.outcomeNotes
              const deadHeatDivisor = extractDeadHeatDivisor(autoResult, outcomeNotes)
              await recordRacingDeadHeat({
                data: {
                  profileId: current.profileId,
                  trackerEntryId: entryId,
                  bookieId: bookie.id,
                  stake: Number(current.backStake),
                  odds: Number(current.backOdds),
                  deadHeatDivisor,
                  isBonusBet: !!current.linkedBonusId,
                  horseName: current.selectionName,
                  track: current.track,
                  raceNumber: current.raceNumber,
                  entryDate: current.date.toISOString().split('T')[0],
                },
              })
            } else if (isVoid) {
              // Map RaceOutcome to VoidType
              const voidType: VoidType = updates.outcome === 'SCRATCHED' ? 'SCRATCHED' : 'REFUND'
              await recordRacingVoid({
                data: {
                  profileId: current.profileId,
                  trackerEntryId: entryId,
                  bookieId: bookie.id,
                  stake: Number(current.backStake),
                  isBonusBet: !!current.linkedBonusId,
                  voidType,
                  reason: updates.outcomeNotes || current.outcomeNotes || undefined,
                  horseName: current.selectionName,
                  track: current.track,
                  raceNumber: current.raceNumber,
                  entryDate: current.date.toISOString().split('T')[0],
                },
              })
            }
          }
        } catch (error) {
          // Log error but don't fail the update
          console.error(`Failed to record journal entry for ${updates.outcome} settlement:`, error)
        }

        // Try to settle multi-leg parent if this is a child leg
        try {
          await trySettleMultiLegParent(entryId, updates.outcome)
        } catch (error) {
          console.error('Failed to check multi-leg settlement:', error)
        }
      }
    }

    return { entry: updated }
  })

/**
 * Delete a tracker entry
 */
export const deleteTrackerEntry = createServerFn({ method: 'POST' })
  .inputValidator((d: { entryId: string }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    await prisma.racingTrackerEntry.delete({
      where: { id: data.entryId },
    })

    return { success: true }
  })

/**
 * Batch update outcomes (for auto-result processing)
 */
export const batchUpdateOutcomes = createServerFn({ method: 'POST' })
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
    const currentEntries = await prisma.racingTrackerEntry.findMany({
      where: { id: { in: entryIds } },
      select: {
        id: true,
        outcome: true,
        outcomeNotes: true,
        profileId: true,
        backBookie: true,
        backStake: true,
        backOdds: true,
        linkedBonusId: true,
        selectionName: true,
        track: true,
        raceNumber: true,
        date: true,
      },
    })
    const currentMap = new Map(currentEntries.map((e) => [e.id, e]))

    const results = await Promise.all(
      data.updates.map((update) =>
        prisma.racingTrackerEntry.update({
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

    // Trigger journal hooks for entries transitioning to WIN, LOSS, SCRATCHED, REFUND, or DEAD_HEAT
    for (const update of data.updates) {
      const current = currentMap.get(update.entryId)
      if (!current) continue

      const isWin = update.outcome === 'WIN'
      const isLoss = update.outcome === 'LOSS'
      const isVoid = update.outcome === 'SCRATCHED' || update.outcome === 'REFUND'
      const isDeadHeat = update.outcome === 'DEAD_HEAT'
      const wasAlreadySettled =
        current.outcome === 'WIN' ||
        current.outcome === 'LOSS' ||
        current.outcome === 'SCRATCHED' ||
        current.outcome === 'REFUND' ||
        current.outcome === 'DEAD_HEAT'

      if ((isWin || isLoss || isVoid || isDeadHeat) && !wasAlreadySettled) {
        try {
          const bookie = await prisma.bookie.findFirst({
            where: { name: current.backBookie },
          })

          if (bookie) {
            if (isWin) {
              await recordRacingWin({
                data: {
                  profileId: current.profileId,
                  trackerEntryId: update.entryId,
                  bookieId: bookie.id,
                  stake: Number(current.backStake),
                  odds: Number(current.backOdds),
                  isBonusBet: !!current.linkedBonusId,
                  horseName: current.selectionName,
                  track: current.track,
                  raceNumber: current.raceNumber,
                  entryDate: current.date.toISOString().split('T')[0],
                },
              })
            } else if (isLoss) {
              await recordRacingLoss({
                data: {
                  profileId: current.profileId,
                  trackerEntryId: update.entryId,
                  bookieId: bookie.id,
                  stake: Number(current.backStake),
                  isBonusBet: !!current.linkedBonusId,
                  horseName: current.selectionName,
                  track: current.track,
                  raceNumber: current.raceNumber,
                  entryDate: current.date.toISOString().split('T')[0],
                },
              })
            } else if (isVoid) {
              // Map RaceOutcome to VoidType
              const voidType: VoidType = update.outcome === 'SCRATCHED' ? 'SCRATCHED' : 'REFUND'
              await recordRacingVoid({
                data: {
                  profileId: current.profileId,
                  trackerEntryId: update.entryId,
                  bookieId: bookie.id,
                  stake: Number(current.backStake),
                  isBonusBet: !!current.linkedBonusId,
                  voidType,
                  reason: current.outcomeNotes || undefined,
                  horseName: current.selectionName,
                  track: current.track,
                  raceNumber: current.raceNumber,
                  entryDate: current.date.toISOString().split('T')[0],
                },
              })
            } else if (isDeadHeat) {
              // Extract dead heat divisor from autoResult
              const deadHeatDivisor = extractDeadHeatDivisor(
                update.autoResult as Record<string, unknown> | null,
                current.outcomeNotes
              )
              await recordRacingDeadHeat({
                data: {
                  profileId: current.profileId,
                  trackerEntryId: update.entryId,
                  bookieId: bookie.id,
                  stake: Number(current.backStake),
                  odds: Number(current.backOdds),
                  deadHeatDivisor,
                  isBonusBet: !!current.linkedBonusId,
                  horseName: current.selectionName,
                  track: current.track,
                  raceNumber: current.raceNumber,
                  entryDate: current.date.toISOString().split('T')[0],
                },
              })
            }
          }
        } catch (error) {
          console.error(`Failed to record journal entry for ${update.outcome} settlement:`, error)
        }

        // Try to settle multi-leg parent if this is a child leg
        try {
          await trySettleMultiLegParent(update.entryId, update.outcome)
        } catch (error) {
          console.error('Failed to check multi-leg settlement:', error)
        }
      }
    }

    return { updated: results.length }
  })

/**
 * Get summary statistics for a date range
 */
export const getTrackerSummary = createServerFn({ method: 'GET' })
  .inputValidator((d: { startDate: string; endDate: string }) => d)
  .handler(async ({ data }) => {
    const prisma = await getPrisma()
    const profileId = await getDefaultProfileId()
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)

    const entries = await prisma.racingTrackerEntry.findMany({
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

    // Group by bookie
    const byBookie = entries.reduce(
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
        byBookie,
      },
    }
  })
