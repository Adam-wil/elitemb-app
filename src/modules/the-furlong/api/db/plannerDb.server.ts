/**
 * Racing Planner Database Server Functions
 *
 * TanStack Start server functions for Racing Planner database operations.
 * These run on the server to access the PostgreSQL database via Prisma.
 *
 * DO NOT use 'use server' directive - TanStack Start handles this via createServerFn()
 */

import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma'
import type { UnitTier, TimeValidationStatus } from '@prisma/client'

// ============================================================================
// Types
// ============================================================================

export interface PlanEntryInput {
  track: string
  raceNumber: number
  time: string // HH:mm
  skip?: boolean
  unitTier?: UnitTier
  normalPromosByBookie?: Record<string, string>
  betBackPromosByBookie?: Record<string, string>
  selectedNormalBookies?: string[]
  selectedBetBackBookies?: string[]
}

export interface PlanEntryUpdate {
  track?: string
  raceNumber?: number
  time?: string
  skip?: boolean
  unitTier?: UnitTier
  timeValidationStatus?: TimeValidationStatus
  apiTime?: string
  timeDifferenceMinutes?: number
  normalPromosByBookie?: Record<string, string>
  betBackPromosByBookie?: Record<string, string>
  selectedNormalBookies?: string[]
  selectedBetBackBookies?: string[]
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
 * Get plan entries for a specific date
 */
export const getPlanEntriesByDate = createServerFn({ method: 'GET' })
  .inputValidator((d: { date: string }) => d)
  .handler(async ({ data }) => {
    const profileId = await getDefaultProfileId()
    const date = new Date(data.date)

    const entries = await prisma.racingPlanEntry.findMany({
      where: {
        profileId,
        date,
      },
      orderBy: [{ time: 'asc' }, { track: 'asc' }, { raceNumber: 'asc' }],
    })

    return { entries }
  })

/**
 * Save all plan entries for a date (replaces existing)
 */
export const savePlanEntriesForDate = createServerFn({ method: 'POST' })
  .inputValidator((d: { date: string; entries: PlanEntryInput[] }) => d)
  .handler(async ({ data }) => {
    const profileId = await getDefaultProfileId()
    const date = new Date(data.date)

    // Use transaction to delete existing and create new
    await prisma.$transaction(async (tx) => {
      // Delete existing entries for this date
      await tx.racingPlanEntry.deleteMany({
        where: {
          profileId,
          date,
        },
      })

      // Create new entries
      if (data.entries.length > 0) {
        await tx.racingPlanEntry.createMany({
          data: data.entries.map((entry) => ({
            profileId,
            date,
            track: entry.track,
            raceNumber: entry.raceNumber,
            time: entry.time,
            skip: entry.skip ?? false,
            unitTier: entry.unitTier ?? 'NEUTRAL',
            normalPromosByBookie: entry.normalPromosByBookie ?? {},
            betBackPromosByBookie: entry.betBackPromosByBookie ?? {},
            selectedNormalBookies: entry.selectedNormalBookies ?? [],
            selectedBetBackBookies: entry.selectedBetBackBookies ?? [],
          })),
        })
      }
    })

    // Return the saved entries
    const savedEntries = await prisma.racingPlanEntry.findMany({
      where: {
        profileId,
        date,
      },
      orderBy: [{ time: 'asc' }, { track: 'asc' }, { raceNumber: 'asc' }],
    })

    return { entries: savedEntries }
  })

/**
 * Update a single plan entry
 */
export const updatePlanEntry = createServerFn({ method: 'POST' })
  .inputValidator((d: { entryId: string; updates: PlanEntryUpdate }) => d)
  .handler(async ({ data }) => {
    const { entryId, updates } = data

    const updated = await prisma.racingPlanEntry.update({
      where: { id: entryId },
      data: updates,
    })

    return { entry: updated }
  })

/**
 * Delete plan entries for a date
 */
export const deletePlanEntriesForDate = createServerFn({ method: 'POST' })
  .inputValidator((d: { date: string }) => d)
  .handler(async ({ data }) => {
    const profileId = await getDefaultProfileId()
    const date = new Date(data.date)

    await prisma.racingPlanEntry.deleteMany({
      where: {
        profileId,
        date,
      },
    })

    return { success: true }
  })

/**
 * Batch update time validation status
 */
export const batchUpdateTimeValidation = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      updates: Array<{
        entryId: string
        timeValidationStatus: TimeValidationStatus
        apiTime?: string
        timeDifferenceMinutes?: number
      }>
    }) => d
  )
  .handler(async ({ data }) => {
    const results = await Promise.all(
      data.updates.map((update) =>
        prisma.racingPlanEntry.update({
          where: { id: update.entryId },
          data: {
            timeValidationStatus: update.timeValidationStatus,
            apiTime: update.apiTime,
            timeDifferenceMinutes: update.timeDifferenceMinutes,
          },
        })
      )
    )

    return { updated: results.length }
  })

/**
 * Get plan entries for a date range
 */
export const getPlanEntriesByDateRange = createServerFn({ method: 'GET' })
  .inputValidator((d: { startDate: string; endDate: string }) => d)
  .handler(async ({ data }) => {
    const profileId = await getDefaultProfileId()
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)

    const entries = await prisma.racingPlanEntry.findMany({
      where: {
        profileId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: [{ date: 'desc' }, { time: 'asc' }, { track: 'asc' }],
    })

    return { entries }
  })

/**
 * Copy plan entries from one date to another
 */
export const copyPlanEntries = createServerFn({ method: 'POST' })
  .inputValidator((d: { fromDate: string; toDate: string }) => d)
  .handler(async ({ data }) => {
    const profileId = await getDefaultProfileId()
    const fromDate = new Date(data.fromDate)
    const toDate = new Date(data.toDate)

    // Get source entries
    const sourceEntries = await prisma.racingPlanEntry.findMany({
      where: {
        profileId,
        date: fromDate,
      },
    })

    if (sourceEntries.length === 0) {
      return { copied: 0 }
    }

    // Delete existing entries at target date
    await prisma.racingPlanEntry.deleteMany({
      where: {
        profileId,
        date: toDate,
      },
    })

    // Create copies at target date
    await prisma.racingPlanEntry.createMany({
      data: sourceEntries.map((entry) => ({
        profileId,
        date: toDate,
        track: entry.track,
        raceNumber: entry.raceNumber,
        time: entry.time,
        skip: entry.skip,
        unitTier: entry.unitTier,
        timeValidationStatus: 'PENDING' as TimeValidationStatus,
        normalPromosByBookie: entry.normalPromosByBookie as object,
        betBackPromosByBookie: entry.betBackPromosByBookie as object,
        selectedNormalBookies: entry.selectedNormalBookies,
        selectedBetBackBookies: entry.selectedBetBackBookies,
      })),
    })

    return { copied: sourceEntries.length }
  })
