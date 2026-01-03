/**
 * Development Seed Script
 *
 * Creates REALISTIC test data to prove the betting → Journal → Ledger flow works:
 * 1. Creates bookies in Bookie table
 * 2. Seeds system accounts
 * 3. Creates Lay Manager entries (triggers BET_PLACED journal)
 * 4. Creates Racing Tracker entries (triggers BET_PLACED journal)
 * 5. Sets outcomes WIN/LOSS (triggers BET_SETTLED journal)
 * 6. Result: Transactions visible in Ledger for each bookie
 *
 * Only for development/testing - not for production use.
 */

import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma'
import { seedSystemAccounts } from './accountSeeder.server'
import {
  recordMatchedBetPlaced,
  recordMatchedBetBackWins,
  recordMatchedBetLayWins,
} from '@/modules/the-furlong/api/db/layManagerJournalHooks.server'
import {
  recordRacingBetPlaced,
  recordRacingWin,
  recordRacingLoss,
  recordRacingVoid,
} from '@/modules/the-furlong/api/db/racingJournalHooks.server'
import type { RaceOutcome } from '@prisma/client'

// ============================================================================
// Types
// ============================================================================

interface DevSeedResult {
  profileId: string
  bookieAccounts: number
  systemAccounts: number
  layManagerEntries: number
  racingTrackerEntries: number
  journalEntries: number
  message: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get or create the default profile for seeding
 */
async function getOrCreateDefaultProfile(): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user: any = await prisma.user.findUnique({
    where: { email: 'default@elitemb.local' },
    include: { Profile: { where: { isDefault: true } } },
  })

  if (!user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user = await (prisma.user.create as any)({
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newProfile = await (prisma.profile.create as any)({
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
 * Get or create a bookie in the Bookie table
 */
async function getOrCreateBookie(
  name: string,
  isExchange: boolean
): Promise<number> {
  const normalizedName = name.toLowerCase().replace(/\s+/g, '-')

  let bookie = await prisma.bookie.findFirst({
    where: {
      OR: [{ name }, { normalizedName }],
    },
  })

  if (!bookie) {
    bookie = await prisma.bookie.create({
      data: {
        name,
        normalizedName,
        isExchange,
        horseSystem: isExchange ? 'Exchange' : 'Back Bookie',
        updatedAt: new Date(),
      },
    })
  }

  return bookie.id
}

// ============================================================================
// Main Seed Function - Uses REAL Lay Manager flow
// ============================================================================

/**
 * Seed development data using the ACTUAL Lay Manager → Journal flow
 *
 * This proves the integration works by:
 * 1. Creating Lay Manager entries (triggers BET_PLACED journal via hook)
 * 2. Setting outcomes (triggers BET_SETTLED journal via hook)
 * 3. Result: Real transactions in Ledger
 */
export const seedDevData = createServerFn({ method: 'POST' })
  .inputValidator((d: { force?: boolean }) => d)
  .handler(async ({ data }): Promise<DevSeedResult> => {
    const { force = false } = data

    // Get or create default profile
    const profileId = await getOrCreateDefaultProfile()

    // Check if already seeded (unless force)
    if (!force) {
      const existingLayEntries = await prisma.layManagerEntry.count({
        where: { profileId },
      })
      const existingRacingEntries = await prisma.racingTrackerEntry.count({
        where: { profileId },
      })
      if (existingLayEntries > 0 || existingRacingEntries > 0) {
        return {
          profileId,
          bookieAccounts: 0,
          systemAccounts: 0,
          layManagerEntries: 0,
          racingTrackerEntries: 0,
          journalEntries: 0,
          message: 'Entries already exist. Use force=true to reseed.',
        }
      }
    }

    // If forcing, clear existing test data
    if (force) {
      // Delete journal lines first (FK constraint)
      await prisma.journalLine.deleteMany({
        where: { JournalEntry: { profileId } },
      })
      await prisma.journalEntry.deleteMany({ where: { profileId } })
      await prisma.layManagerEntry.deleteMany({ where: { profileId } })
      await prisma.racingTrackerEntry.deleteMany({ where: { profileId } })
      await prisma.account.deleteMany({ where: { profileId, isSystem: false } })
    }

    // Step 1: Ensure bookies exist in Bookie table and store their IDs
    const bookieConfigs = [
      { name: 'Sportsbet', isExchange: false },
      { name: 'PointsBet', isExchange: false },
      { name: 'Neds', isExchange: false },
      { name: 'Betfair', isExchange: true },
    ]

    const bookieIdMap = new Map<string, number>()
    for (const config of bookieConfigs) {
      const bookieId = await getOrCreateBookie(config.name, config.isExchange)
      bookieIdMap.set(config.name, bookieId)
    }

    // Step 2: Seed system accounts (BACK_BET_WINS, LAY_BET_PAYOUTS, etc.)
    await seedSystemAccounts({ data: { profileId } })
    const systemAccounts = await prisma.account.count({
      where: { profileId, isSystem: true },
    })

    // Step 3: Create Lay Manager entries with outcomes
    // This uses the REAL flow: createLayEntry → recordMatchedBetPlaced
    // Then: updateLayEntry with outcome → recordMatchedBetBackWins/LayWins

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]

    const testBets = [
      // 1/W - Sportsbet WIN (1st place, back wins)
      {
        date: twoDaysAgo,
        time: '14:30',
        track: 'Flemington',
        raceNumber: 5,
        selectionName: 'Thunder Strike',
        selectionNumber: 3,
        backBookie: 'Sportsbet',
        backStake: 50,
        backOdds: 3.5,
        layBookie: 'Betfair',
        layStake: 48,
        layOdds: 3.6,
        outcome: 'WIN' as RaceOutcome,
        isBonus: false,
      },
      // 2/L - PointsBet LOSS (2nd place, back loses)
      {
        date: yesterday,
        time: '15:00',
        track: 'Randwick',
        raceNumber: 3,
        selectionName: 'Speed Demon',
        selectionNumber: 7,
        backBookie: 'PointsBet',
        backStake: 40,
        backOdds: 4.0,
        layBookie: 'Betfair',
        layStake: 38,
        layOdds: 4.2,
        outcome: 'LOSS' as RaceOutcome,
        isBonus: false,
      },
      // BONUS WIN - Neds bonus bet that won
      {
        date: yesterday,
        time: '16:30',
        track: 'Caulfield',
        raceNumber: 7,
        selectionName: 'Golden Arrow',
        selectionNumber: 1,
        backBookie: 'Neds',
        backStake: 100,
        backOdds: 2.8,
        layBookie: 'Betfair',
        layStake: 95,
        layOdds: 2.9,
        outcome: 'WIN' as RaceOutcome,
        isBonus: true,
      },
      // BONUS LOSS - Sportsbet bonus bet that lost
      {
        date: twoDaysAgo,
        time: '12:00',
        track: 'Moonee Valley',
        raceNumber: 4,
        selectionName: 'Lucky Charm',
        selectionNumber: 8,
        backBookie: 'Sportsbet',
        backStake: 50,
        backOdds: 4.5,
        layBookie: 'Betfair',
        layStake: 47,
        layOdds: 4.7,
        outcome: 'LOSS' as RaceOutcome,
        isBonus: true,
      },
      // PENDING - No outcome yet
      {
        date: today,
        time: '13:00',
        track: 'Eagle Farm',
        raceNumber: 2,
        selectionName: 'Morning Star',
        selectionNumber: 5,
        backBookie: 'Sportsbet',
        backStake: 30,
        backOdds: 5.0,
        layBookie: 'Betfair',
        layStake: 28,
        layOdds: 5.2,
        outcome: 'PENDING' as RaceOutcome,
        isBonus: false,
      },
    ]

    let layEntriesCreated = 0
    let journalEntriesCreated = 0

    const errors: string[] = []

    for (const bet of testBets) {
      try {
        // Get bookie ID from our map
        const bookieId = bookieIdMap.get(bet.backBookie)
        if (!bookieId) {
          errors.push(`${bet.selectionName}: Bookie "${bet.backBookie}" not in map`)
          continue
        }

        // Create the Lay Manager entry directly via Prisma
        const entry = await prisma.layManagerEntry.create({
          data: {
            id: crypto.randomUUID(),
            profileId,
            date: new Date(bet.date),
            time: bet.time,
            track: bet.track,
            raceNumber: bet.raceNumber,
            selectionName: bet.selectionName,
            selectionNumber: bet.selectionNumber,
            backBookie: bet.backBookie,
            backStake: bet.backStake,
            backOdds: bet.backOdds,
            layBookie: bet.layBookie,
            layStake: bet.layStake,
            layOdds: bet.layOdds,
            outcome: 'PENDING',
            updatedAt: new Date(),
          },
        })
        layEntriesCreated++

        // Call journal hook for BET_PLACED
        await recordMatchedBetPlaced({
          data: {
            profileId,
            layManagerEntryId: entry.id,
            backBookieId: bookieId,
            backStake: bet.backStake,
            backOdds: bet.backOdds,
            isBonusBet: bet.isBonus,
            layStake: bet.layStake,
            layOdds: bet.layOdds,
            horseName: bet.selectionName,
            track: bet.track,
            raceNumber: bet.raceNumber,
            entryDate: bet.date,
          },
        })
        journalEntriesCreated++

        // If outcome is WIN or LOSS, update and create settlement journal
        if (bet.outcome === 'WIN' || bet.outcome === 'LOSS') {
          // Update the entry outcome
          await prisma.layManagerEntry.update({
            where: { id: entry.id },
            data: { outcome: bet.outcome },
          })

          // Call appropriate settlement hook
          if (bet.outcome === 'WIN') {
            await recordMatchedBetBackWins({
              data: {
                profileId,
                layManagerEntryId: entry.id,
                backBookieId: bookieId,
                backStake: bet.backStake,
                backOdds: bet.backOdds,
                isBonusBet: bet.isBonus,
                layStake: bet.layStake,
                layOdds: bet.layOdds,
                horseName: bet.selectionName,
                track: bet.track,
                raceNumber: bet.raceNumber,
                entryDate: bet.date,
              },
            })
          } else {
            await recordMatchedBetLayWins({
              data: {
                profileId,
                layManagerEntryId: entry.id,
                backBookieId: bookieId,
                backStake: bet.backStake,
                isBonusBet: bet.isBonus,
                layStake: bet.layStake,
                layOdds: bet.layOdds,
                layCommissionPercent: 5,
                horseName: bet.selectionName,
                track: bet.track,
                raceNumber: bet.raceNumber,
                entryDate: bet.date,
              },
            })
          }
          journalEntriesCreated++
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        errors.push(`LayMgr ${bet.selectionName}: ${msg}`)
      }
    }

    // =========================================================================
    // Step 4: Create Racing Tracker entries (No Lay Table)
    // These are single-sided back bets without lay coverage
    // =========================================================================

    const racingTestBets = [
      // 1/W - TAB WIN (back bet wins, no lay)
      {
        date: twoDaysAgo,
        time: '12:15',
        track: 'Randwick',
        raceNumber: 1,
        selectionName: 'Fast Tracker',
        selectionNumber: 4,
        backBookie: 'Sportsbet',
        backStake: 25,
        backOdds: 4.0,
        outcome: 'WIN' as RaceOutcome,
        isBonus: false,
      },
      // 2/L - Promo bet that lost (qualifies for bonus)
      {
        date: yesterday,
        time: '13:45',
        track: 'Flemington',
        raceNumber: 4,
        selectionName: 'Promo Runner',
        selectionNumber: 2,
        backBookie: 'PointsBet',
        backStake: 50,
        backOdds: 3.0,
        outcome: 'LOSS' as RaceOutcome,
        isBonus: false,
      },
      // Bonus bet WIN - Free bet that won
      {
        date: yesterday,
        time: '15:00',
        track: 'Caulfield',
        raceNumber: 6,
        selectionName: 'Bonus Winner',
        selectionNumber: 1,
        backBookie: 'Neds',
        backStake: 50,
        backOdds: 5.5,
        outcome: 'WIN' as RaceOutcome,
        isBonus: true,
      },
      // Bonus bet LOSS - Free bet that lost
      {
        date: twoDaysAgo,
        time: '14:30',
        track: 'Moonee Valley',
        raceNumber: 3,
        selectionName: 'Bonus Loser',
        selectionNumber: 6,
        backBookie: 'Sportsbet',
        backStake: 25,
        backOdds: 6.0,
        outcome: 'LOSS' as RaceOutcome,
        isBonus: true,
      },
      // SCRATCHED - Horse scratched, refund
      {
        date: yesterday,
        time: '16:00',
        track: 'Eagle Farm',
        raceNumber: 8,
        selectionName: 'Scratchy',
        selectionNumber: 9,
        backBookie: 'PointsBet',
        backStake: 30,
        backOdds: 3.5,
        outcome: 'SCRATCHED' as RaceOutcome,
        isBonus: false,
      },
      // PENDING - Race not yet run
      {
        date: today,
        time: '14:00',
        track: 'Rosehill',
        raceNumber: 5,
        selectionName: 'Pending Pick',
        selectionNumber: 3,
        backBookie: 'Sportsbet',
        backStake: 40,
        backOdds: 2.8,
        outcome: 'PENDING' as RaceOutcome,
        isBonus: false,
      },
    ]

    let racingEntriesCreated = 0

    for (const bet of racingTestBets) {
      try {
        const bookieId = bookieIdMap.get(bet.backBookie)
        if (!bookieId) {
          errors.push(`Racing ${bet.selectionName}: Bookie "${bet.backBookie}" not in map`)
          continue
        }

        // Create Racing Tracker entry
        // Note: linkedBonusId has FK constraint, so we don't set it for test data
        // The isBonusBet flag is passed to journal hooks instead
        const entry = await prisma.racingTrackerEntry.create({
          data: {
            id: crypto.randomUUID(),
            profileId,
            date: new Date(bet.date),
            time: bet.time,
            track: bet.track,
            raceNumber: bet.raceNumber,
            selectionName: bet.selectionName,
            selectionNumber: bet.selectionNumber,
            backBookie: bet.backBookie,
            backStake: bet.backStake,
            backOdds: bet.backOdds,
            // No lay for racing tracker (single-sided)
            layBookie: null,
            layStake: null,
            layOdds: null,
            outcome: 'PENDING',
            updatedAt: new Date(),
          },
        })
        racingEntriesCreated++

        // Call journal hook for BET_PLACED
        await recordRacingBetPlaced({
          data: {
            profileId,
            trackerEntryId: entry.id,
            bookieId,
            stake: bet.backStake,
            isBonusBet: bet.isBonus,
            horseName: bet.selectionName,
            track: bet.track,
            raceNumber: bet.raceNumber,
            entryDate: bet.date,
          },
        })
        journalEntriesCreated++

        // If outcome is WIN, LOSS, or SCRATCHED, update and create settlement journal
        if (bet.outcome === 'WIN' || bet.outcome === 'LOSS' || bet.outcome === 'SCRATCHED') {
          // Update the entry outcome
          await prisma.racingTrackerEntry.update({
            where: { id: entry.id },
            data: { outcome: bet.outcome },
          })

          if (bet.outcome === 'WIN') {
            await recordRacingWin({
              data: {
                profileId,
                trackerEntryId: entry.id,
                bookieId,
                stake: bet.backStake,
                odds: bet.backOdds,
                isBonusBet: bet.isBonus,
                horseName: bet.selectionName,
                track: bet.track,
                raceNumber: bet.raceNumber,
                entryDate: bet.date,
              },
            })
          } else if (bet.outcome === 'LOSS') {
            await recordRacingLoss({
              data: {
                profileId,
                trackerEntryId: entry.id,
                bookieId,
                stake: bet.backStake,
                isBonusBet: bet.isBonus,
                horseName: bet.selectionName,
                track: bet.track,
                raceNumber: bet.raceNumber,
                entryDate: bet.date,
              },
            })
          } else if (bet.outcome === 'SCRATCHED') {
            await recordRacingVoid({
              data: {
                profileId,
                trackerEntryId: entry.id,
                bookieId,
                stake: bet.backStake,
                isBonusBet: bet.isBonus,
                voidType: 'SCRATCHED',
                reason: 'Horse scratched - full refund',
                horseName: bet.selectionName,
                track: bet.track,
                raceNumber: bet.raceNumber,
                entryDate: bet.date,
              },
            })
          }
          journalEntriesCreated++
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        errors.push(`Racing ${bet.selectionName}: ${msg}`)
      }
    }

    if (errors.length > 0) {
      return {
        profileId,
        bookieAccounts: bookieConfigs.length,
        systemAccounts,
        layManagerEntries: layEntriesCreated,
        racingTrackerEntries: racingEntriesCreated,
        journalEntries: journalEntriesCreated,
        message: `ERRORS: ${errors.join(' | ')}`,
      }
    }

    return {
      profileId,
      bookieAccounts: bookieConfigs.length,
      systemAccounts,
      layManagerEntries: layEntriesCreated,
      racingTrackerEntries: racingEntriesCreated,
      journalEntries: journalEntriesCreated,
      message: `Created ${layEntriesCreated} Lay Manager + ${racingEntriesCreated} Racing Tracker entries with ${journalEntriesCreated} journal entries. Check the Ledger!`,
    }
  })

/**
 * Clear all dev data (for resetting)
 */
export const clearDevData = createServerFn({ method: 'POST' })
  .inputValidator((d: { profileId?: string; includeSystemAccounts?: boolean }) => d)
  .handler(async ({ data }): Promise<{ cleared: boolean; message: string }> => {
    const profileId = data.profileId || (await getOrCreateDefaultProfile())
    const includeSystemAccounts = data.includeSystemAccounts ?? false

    // Delete journal lines first (foreign key)
    await prisma.journalLine.deleteMany({
      where: {
        JournalEntry: { profileId },
      },
    })

    // Delete journal entries
    const deletedEntries = await prisma.journalEntry.deleteMany({
      where: { profileId },
    })

    // Delete Lay Manager entries
    const deletedLayEntries = await prisma.layManagerEntry.deleteMany({
      where: { profileId },
    })

    // Delete Racing Tracker entries
    const deletedRacingEntries = await prisma.racingTrackerEntry.deleteMany({
      where: { profileId },
    })

    // Delete accounts
    const deletedAccounts = await prisma.account.deleteMany({
      where: {
        profileId,
        // Only delete system accounts if explicitly requested
        ...(includeSystemAccounts ? {} : { isSystem: false }),
      },
    })

    return {
      cleared: true,
      message: `Cleared ${deletedEntries.count} journal entries, ${deletedLayEntries.count} Lay Manager entries, ${deletedRacingEntries.count} Racing Tracker entries, and ${deletedAccounts.count} accounts.`,
    }
  })
