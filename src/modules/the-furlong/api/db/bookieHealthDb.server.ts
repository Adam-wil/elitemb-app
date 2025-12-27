/**
 * Bookie Health Database Server Functions
 *
 * TanStack Start server functions for managing bookie promo ratio configurations.
 * These run on the server to access the PostgreSQL database via Prisma.
 *
 * DO NOT use 'use server' directive - TanStack Start handles this via createServerFn()
 */

import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma'
import type {
  RatioTimeWindow,
  BookieAccountStatus,
  BookieUsageStats,
  ChipRatioStatus,
} from '../../types/bookieHealth'

// ============================================================================
// Helper Functions
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
 * Calculate start date based on time window
 */
function getTimeWindowStartDate(timeWindow: RatioTimeWindow): Date {
  const now = new Date()

  switch (timeWindow) {
    case 'DAILY':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())

    case 'WEEKLY': {
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday start
      const startDate = new Date(now)
      startDate.setDate(now.getDate() - diff)
      startDate.setHours(0, 0, 0, 0)
      return startDate
    }

    case 'MONTHLY':
      return new Date(now.getFullYear(), now.getMonth(), 1)

    default:
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
}

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Get all ratio configs for current profile
 */
export const getAllRatioConfigs = createServerFn({ method: 'GET' }).handler(
  async () => {
    const profileId = await getDefaultProfileId()

    const configs = await prisma.bookieRatioConfig.findMany({
      where: { profileId },
      include: {
        bookie: {
          select: {
            id: true,
            name: true,
            promoVolume: true,
            banRisk: true,
          },
        },
      },
      orderBy: { bookie: { name: 'asc' } },
    })

    return { configs }
  }
)

/**
 * Get ratio config for a specific bookie
 */
export const getRatioConfigByBookie = createServerFn({ method: 'GET' })
  .inputValidator((d: { bookieId: number }) => d)
  .handler(async ({ data }) => {
    const profileId = await getDefaultProfileId()

    const config = await prisma.bookieRatioConfig.findUnique({
      where: {
        profileId_bookieId: { profileId, bookieId: data.bookieId },
      },
      include: {
        bookie: { select: { id: true, name: true } },
      },
    })

    return { config }
  })

/**
 * Create or update ratio config for a bookie
 */
export const upsertRatioConfig = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      bookieId: number
      promoRatio?: number
      nonPromoRatio?: number
      timeWindow?: RatioTimeWindow
      warningThreshold?: number
      exceededThreshold?: number
      isEnabled?: boolean
    }) => d
  )
  .handler(async ({ data }) => {
    const profileId = await getDefaultProfileId()

    const config = await prisma.bookieRatioConfig.upsert({
      where: {
        profileId_bookieId: { profileId, bookieId: data.bookieId },
      },
      update: {
        promoRatio: data.promoRatio,
        nonPromoRatio: data.nonPromoRatio,
        timeWindow: data.timeWindow,
        warningThreshold: data.warningThreshold,
        exceededThreshold: data.exceededThreshold,
        isEnabled: data.isEnabled,
      },
      create: {
        profileId,
        bookieId: data.bookieId,
        promoRatio: data.promoRatio ?? 1,
        nonPromoRatio: data.nonPromoRatio ?? 3,
        timeWindow: data.timeWindow ?? 'WEEKLY',
        warningThreshold: data.warningThreshold ?? 80,
        exceededThreshold: data.exceededThreshold ?? 100,
        isEnabled: data.isEnabled ?? true,
      },
      include: {
        bookie: { select: { id: true, name: true } },
      },
    })

    return { config }
  })

/**
 * Update bookie account status
 */
export const updateBookieStatus = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { bookieId: number; status: BookieAccountStatus; notes?: string }) => d
  )
  .handler(async ({ data }) => {
    const profileId = await getDefaultProfileId()

    const config = await prisma.bookieRatioConfig.upsert({
      where: {
        profileId_bookieId: { profileId, bookieId: data.bookieId },
      },
      update: {
        status: data.status,
        statusNotes: data.notes,
        statusChangedAt: new Date(),
      },
      create: {
        profileId,
        bookieId: data.bookieId,
        status: data.status,
        statusNotes: data.notes,
        statusChangedAt: new Date(),
      },
      include: {
        bookie: { select: { id: true, name: true } },
      },
    })

    return { config }
  })

/**
 * Delete ratio config (returns to default)
 */
export const deleteRatioConfig = createServerFn({ method: 'POST' })
  .inputValidator((d: { bookieId: number }) => d)
  .handler(async ({ data }) => {
    const profileId = await getDefaultProfileId()

    await prisma.bookieRatioConfig.deleteMany({
      where: { profileId, bookieId: data.bookieId },
    })

    return { success: true }
  })

/**
 * Calculate current ratio usage for bookies with configs
 * Queries RacingTrackerEntry based on configured time windows
 */
export const getBookieUsageStats = createServerFn({ method: 'GET' })
  .inputValidator((d: { bookieIds?: number[] }) => d)
  .handler(async ({ data }) => {
    const profileId = await getDefaultProfileId()

    // Get all ratio configs
    const configs = await prisma.bookieRatioConfig.findMany({
      where: {
        profileId,
        isEnabled: true,
        ...(data.bookieIds ? { bookieId: { in: data.bookieIds } } : {}),
      },
      include: {
        bookie: { select: { id: true, name: true } },
      },
    })

    const stats: BookieUsageStats[] = []

    for (const config of configs) {
      const startDate = getTimeWindowStartDate(
        config.timeWindow as RatioTimeWindow
      )

      // Query tracker entries for this bookie in time window
      const entries = await prisma.racingTrackerEntry.findMany({
        where: {
          profileId,
          backBookie: config.bookie.name,
          date: { gte: startDate },
          outcome: { not: 'PENDING' }, // Only count completed bets
        },
        select: {
          promoType: true,
        },
      })

      // Count promo vs non-promo bets
      const promoBets = entries.filter(
        (e) => e.promoType && e.promoType !== 'none'
      ).length
      const nonPromoBets = entries.filter(
        (e) => !e.promoType || e.promoType === 'none'
      ).length

      // Calculate ratios
      const targetRatio = config.promoRatio / config.nonPromoRatio
      const currentRatio = nonPromoBets > 0 ? promoBets / nonPromoBets : null

      // Calculate how close to target (as percentage)
      // If target is 1:3 (0.333), and current is 1:2 (0.5), that's 150% of target
      const ratioPercentage =
        currentRatio !== null ? (currentRatio / targetRatio) * 100 : 0

      // Determine status
      let status: 'ok' | 'warning' | 'exceeded' = 'ok'
      if (ratioPercentage >= config.exceededThreshold) {
        status = 'exceeded'
      } else if (ratioPercentage >= config.warningThreshold) {
        status = 'warning'
      }

      stats.push({
        bookieId: config.bookie.id,
        bookieName: config.bookie.name,
        promoBets,
        nonPromoBets,
        totalBets: promoBets + nonPromoBets,
        currentRatio,
        targetRatio,
        ratioPercentage,
        status,
      })
    }

    return { stats }
  })

/**
 * Get usage stats for specific bookies (for planner display)
 * Optimized for quick lookup during chip rendering
 */
export const getBookieUsageForPlanner = createServerFn({ method: 'GET' })
  .inputValidator((d: { bookieNames: string[] }) => d)
  .handler(async ({ data }) => {
    const profileId = await getDefaultProfileId()

    if (data.bookieNames.length === 0) {
      return { usageMap: {} }
    }

    // Get bookies by name
    const bookies = await prisma.bookie.findMany({
      where: { name: { in: data.bookieNames } },
      select: { id: true, name: true },
    })

    const bookieIds = bookies.map((b) => b.id)

    // Get configs for these bookies
    const configs = await prisma.bookieRatioConfig.findMany({
      where: {
        profileId,
        isEnabled: true,
        bookieId: { in: bookieIds },
      },
      include: {
        bookie: { select: { id: true, name: true } },
      },
    })

    const usageMap: Record<string, ChipRatioStatus> = {}

    for (const config of configs) {
      const startDate = getTimeWindowStartDate(
        config.timeWindow as RatioTimeWindow
      )

      // Query tracker entries for this bookie in time window
      const entries = await prisma.racingTrackerEntry.findMany({
        where: {
          profileId,
          backBookie: config.bookie.name,
          date: { gte: startDate },
          outcome: { not: 'PENDING' },
        },
        select: {
          promoType: true,
        },
      })

      const promoBets = entries.filter(
        (e) => e.promoType && e.promoType !== 'none'
      ).length
      const nonPromoBets = entries.filter(
        (e) => !e.promoType || e.promoType === 'none'
      ).length

      const targetRatio = config.promoRatio / config.nonPromoRatio
      const currentRatio = nonPromoBets > 0 ? promoBets / nonPromoBets : null
      const ratioPercentage =
        currentRatio !== null ? (currentRatio / targetRatio) * 100 : 0

      let status: 'ok' | 'warning' | 'exceeded' = 'ok'
      if (ratioPercentage >= config.exceededThreshold) {
        status = 'exceeded'
      } else if (ratioPercentage >= config.warningThreshold) {
        status = 'warning'
      }

      usageMap[config.bookie.name] = {
        bookieName: config.bookie.name,
        status,
        ratioDisplay: `${promoBets}/${nonPromoBets}`,
        tooltipText: `${promoBets} promo, ${nonPromoBets} non-promo (target: ${config.promoRatio}:${config.nonPromoRatio})`,
      }
    }

    return { usageMap }
  })

/**
 * Get all bookies with their ratio config status (for Bookie Health UI)
 */
export const getAllBookiesWithHealth = createServerFn({ method: 'GET' }).handler(
  async () => {
    const profileId = await getDefaultProfileId()

    // Get all active bookies
    const bookies = await prisma.bookie.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        promoVolume: true,
        banRisk: true,
        statDecRisk: true,
      },
    })

    // Get existing configs
    const configs = await prisma.bookieRatioConfig.findMany({
      where: { profileId },
    })

    // Create a map of bookieId to config
    const configMap = new Map(configs.map((c) => [c.bookieId, c]))

    // Merge bookies with their configs
    const bookiesWithHealth = bookies.map((bookie) => {
      const config = configMap.get(bookie.id)
      return {
        ...bookie,
        ratioConfig: config
          ? {
              id: config.id,
              promoRatio: config.promoRatio,
              nonPromoRatio: config.nonPromoRatio,
              timeWindow: config.timeWindow,
              status: config.status,
              statusNotes: config.statusNotes,
              statusChangedAt: config.statusChangedAt?.toISOString() ?? null,
              warningThreshold: config.warningThreshold,
              exceededThreshold: config.exceededThreshold,
              isEnabled: config.isEnabled,
            }
          : null,
      }
    })

    return { bookies: bookiesWithHealth }
  }
)
