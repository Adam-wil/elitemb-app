/**
 * Bookie Database Server Functions
 *
 * TanStack Start server functions for Bookie reference data and notes.
 * These run on the server to access the PostgreSQL database via Prisma.
 *
 * DO NOT use 'use server' directive - TanStack Start handles this via createServerFn()
 */

import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma'

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Get default profile ID (creates one if needed)
 */
async function getDefaultProfileId(): Promise<string> {
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
 * Get all bookies
 */
export const getAllBookies = createServerFn({ method: 'GET' }).handler(async () => {
  const bookies = await prisma.bookie.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })

  return { bookies }
})

/**
 * Get bookie by ID
 */
export const getBookieById = createServerFn({ method: 'GET' })
  .inputValidator((d: { bookieId: number }) => d)
  .handler(async ({ data }) => {
    const bookie = await prisma.bookie.findUnique({
      where: { id: data.bookieId },
    })

    return { bookie }
  })

/**
 * Get bookie by name (normalized lookup)
 */
export const getBookieByName = createServerFn({ method: 'GET' })
  .inputValidator((d: { name: string }) => d)
  .handler(async ({ data }) => {
    const normalizedName = data.name.toLowerCase().trim()

    const bookie = await prisma.bookie.findUnique({
      where: { normalizedName },
    })

    return { bookie }
  })

/**
 * Search bookies by partial name match
 */
export const searchBookies = createServerFn({ method: 'GET' })
  .inputValidator((d: { query: string; limit?: number }) => d)
  .handler(async ({ data }) => {
    const bookies = await prisma.bookie.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: data.query, mode: 'insensitive' } },
          { normalizedName: { contains: data.query.toLowerCase(), mode: 'insensitive' } },
        ],
      },
      take: data.limit || 20,
      orderBy: { name: 'asc' },
    })

    return { bookies }
  })

/**
 * Get bookie note for current profile
 */
export const getBookieNote = createServerFn({ method: 'GET' })
  .inputValidator((d: { bookieId: number }) => d)
  .handler(async ({ data }) => {
    const profileId = await getDefaultProfileId()

    const note = await prisma.bookieNote.findUnique({
      where: {
        profileId_bookieId: {
          profileId,
          bookieId: data.bookieId,
        },
      },
    })

    return { note }
  })

/**
 * Save bookie note for current profile
 */
export const saveBookieNote = createServerFn({ method: 'POST' })
  .inputValidator((d: { bookieId: number; content: string }) => d)
  .handler(async ({ data }) => {
    const profileId = await getDefaultProfileId()

    const note = await prisma.bookieNote.upsert({
      where: {
        profileId_bookieId: {
          profileId,
          bookieId: data.bookieId,
        },
      },
      update: {
        content: data.content,
      },
      create: {
        profileId,
        bookieId: data.bookieId,
        content: data.content,
      },
    })

    return { note }
  })

/**
 * Delete bookie note for current profile
 */
export const deleteBookieNote = createServerFn({ method: 'POST' })
  .inputValidator((d: { bookieId: number }) => d)
  .handler(async ({ data }) => {
    const profileId = await getDefaultProfileId()

    await prisma.bookieNote.deleteMany({
      where: {
        profileId,
        bookieId: data.bookieId,
      },
    })

    return { success: true }
  })

/**
 * Get all bookie notes for current profile
 */
export const getAllBookieNotes = createServerFn({ method: 'GET' }).handler(async () => {
  const profileId = await getDefaultProfileId()

  const notes = await prisma.bookieNote.findMany({
    where: { profileId },
    include: {
      bookie: {
        select: { id: true, name: true },
      },
    },
  })

  return { notes }
})

/**
 * Get state commission rates
 */
export const getStateCommissionRates = createServerFn({ method: 'GET' }).handler(async () => {
  const rates = await prisma.stateCommissionRate.findMany({
    orderBy: { code: 'asc' },
  })

  return { rates }
})

/**
 * Get tracks for a state
 */
export const getTracksByState = createServerFn({ method: 'GET' })
  .inputValidator((d: { stateCode: string }) => d)
  .handler(async ({ data }) => {
    const tracks = await prisma.track.findMany({
      where: {
        stateCode: data.stateCode,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    })

    return { tracks }
  })

/**
 * Get all tracks
 */
export const getAllTracks = createServerFn({ method: 'GET' }).handler(async () => {
  const tracks = await prisma.track.findMany({
    where: { isActive: true },
    include: {
      state: {
        select: { code: true, name: true, defaultRate: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  return { tracks }
})

/**
 * Get track by name
 */
export const getTrackByName = createServerFn({ method: 'GET' })
  .inputValidator((d: { name: string }) => d)
  .handler(async ({ data }) => {
    const track = await prisma.track.findFirst({
      where: {
        name: { equals: data.name.toUpperCase(), mode: 'insensitive' },
      },
      include: {
        state: {
          select: { code: true, name: true, defaultRate: true },
        },
      },
    })

    return { track }
  })
