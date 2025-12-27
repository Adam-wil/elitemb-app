/**
 * Lay Manager Database Server Functions
 *
 * TanStack Start server functions for Lay Manager database operations.
 * These run on the server to access the PostgreSQL database via Prisma.
 *
 * DO NOT use 'use server' directive - TanStack Start handles this via createServerFn()
 */

import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma'
import type { UnitTier, RaceOutcome } from '@prisma/client'

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
  let user = await prisma.user.findUnique({
    where: { email: 'default@elitemb.local' },
    include: { profiles: { where: { isDefault: true } } },
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'default@elitemb.local',
        profiles: {
          create: {
            name: 'Default Profile',
            isDefault: true,
          },
        },
      },
      include: { profiles: { where: { isDefault: true } } },
    })
  }

  const profile = user.profiles[0]
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
  .inputValidator((d: { entry: LayEntryInput }) => d)
  .handler(async ({ data }) => {
    const profileId = await getDefaultProfileId()
    const { entry } = data

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
      },
    })

    return { entry: created }
  })

/**
 * Update an existing lay manager entry
 */
export const updateLayEntry = createServerFn({ method: 'POST' })
  .inputValidator((d: { entryId: string; updates: LayEntryUpdate }) => d)
  .handler(async ({ data }) => {
    const { entryId, updates } = data

    // Convert dates if needed
    const updateData: Record<string, unknown> = { ...updates }
    if (updates.lastPolledAt) {
      updateData.lastPolledAt = new Date(updates.lastPolledAt)
    }

    const updated = await prisma.layManagerEntry.update({
      where: { id: entryId },
      data: updateData,
    })

    return { entry: updated }
  })

/**
 * Delete a lay manager entry
 */
export const deleteLayEntry = createServerFn({ method: 'POST' })
  .inputValidator((d: { entryId: string }) => d)
  .handler(async ({ data }) => {
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

    return { updated: results.length }
  })

/**
 * Get summary statistics for a date range
 */
export const getLayManagerSummary = createServerFn({ method: 'GET' })
  .inputValidator((d: { startDate: string; endDate: string }) => d)
  .handler(async ({ data }) => {
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
