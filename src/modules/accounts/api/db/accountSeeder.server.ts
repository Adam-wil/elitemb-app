/**
 * Account Seeder Server Functions
 *
 * TanStack Start server functions for seeding system accounts.
 * Creates all non-bookie accounts (Income, Expense, Equity, etc.) for a profile.
 *
 * DO NOT use 'use server' directive - TanStack Start handles this via createServerFn()
 */

import { createServerFn } from '@tanstack/react-start'
import { SYSTEM_ACCOUNTS } from '../../constants/systemAccounts'

import type { Account } from '@prisma/client'
import type { SerializedAccount } from './accountProvisioner.server'

// Dynamic import helper - prevents prisma from being bundled for client
async function getPrisma() {
  const { default: prisma } = await import('@/lib/prisma.server')
  return prisma
}

/**
 * Convert Prisma Account to serializable format
 * Duplicated from accountProvisioner.server.ts to avoid circular imports
 */
function serializeAccount(account: Account): SerializedAccount {
  return {
    ...account,
    actualBalance: account.actualBalance ? Number(account.actualBalance) : null,
  }
}

/**
 * Seed all system accounts for a profile
 *
 * Creates the 14 standard system accounts:
 * - Assets: Betfair Available, Pending Back Bets, Pending Lay Bets
 * - Liabilities: Betfair Lay Liability
 * - Equity: Manual Adjustments, Opening Balance Equity
 * - Income: Back Bet Wins, Lay Bet Wins, Bonus Income
 * - Expenses: Back Bet Losses, Lay Bet Payouts, Qualifying Loss, Betfair Commission, Bonus Expired
 *
 * This function is idempotent - safe to call multiple times.
 * Uses findFirst + create pattern for accounts with null bookieId.
 */
export const seedSystemAccounts = createServerFn({ method: 'POST' })
  .inputValidator((d: { profileId: string }) => d)
  .handler(async ({ data }): Promise<SerializedAccount[]> => {
    const prisma = await getPrisma()
    const { profileId } = data

    // Verify profile exists
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    })

    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`)
    }

    // Create all system accounts using findFirst + create for idempotency
    // Check by code since unique constraint is on (profileId, code)
    const results: Account[] = []

    for (const accountDef of SYSTEM_ACCOUNTS) {
      // Check if account already exists by code (unique constraint)
      const existing = await prisma.account.findFirst({
        where: {
          profileId,
          code: accountDef.code,
        },
      })

      if (existing) {
        results.push(existing)
      } else {
        // Create new account with generated ID
        const created = await prisma.account.create({
          data: {
            id: crypto.randomUUID(),
            profileId,
            code: accountDef.code,
            name: accountDef.name,
            type: accountDef.type,
            subType: accountDef.subType,
            isSystem: true,
            isActive: true,
          },
        })
        results.push(created)
      }
    }

    return results.map(serializeAccount)
  })

/**
 * Check if system accounts are seeded for a profile
 */
export const hasSystemAccounts = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId: string }) => d)
  .handler(async ({ data }): Promise<boolean> => {
    const prisma = await getPrisma()
    const { profileId } = data

    const count = await prisma.account.count({
      where: {
        profileId,
        isSystem: true,
      },
    })

    return count >= SYSTEM_ACCOUNTS.length
  })

/**
 * Get all system accounts for a profile
 */
export const getSystemAccounts = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId: string }) => d)
  .handler(async ({ data }): Promise<SerializedAccount[]> => {
    const prisma = await getPrisma()
    const { profileId } = data

    const accounts = await prisma.account.findMany({
      where: {
        profileId,
        isSystem: true,
      },
      orderBy: { code: 'asc' },
    })

    return accounts.map(serializeAccount)
  })
