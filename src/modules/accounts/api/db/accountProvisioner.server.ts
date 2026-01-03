/**
 * Account Provisioner Server Functions
 *
 * TanStack Start server functions for on-demand account provisioning.
 * Creates accounts only when needed (not pre-created for all 110+ bookies).
 *
 * DO NOT use 'use server' directive - TanStack Start handles this via createServerFn()
 */

import { createServerFn } from '@tanstack/react-start'
import { generateCodeForType } from '../../utils/accountCodeGenerator.server'

// Dynamic import helper - prevents prisma from being bundled for client
async function getPrisma() {
  const { default: prisma } = await import('@/lib/prisma.server')
  return prisma
}

import type { Account } from '@prisma/client'

// ============================================================================
// Types
// ============================================================================

/**
 * Serialized Account type for TanStack Start RPC
 * Converts Prisma Decimal fields to number (Decimal has methods that can't be serialized)
 */
export type SerializedAccount = Omit<Account, 'actualBalance'> & {
  actualBalance: number | null
}

/**
 * Convert Prisma Account to serializable format
 */
function serializeAccount(account: Account): SerializedAccount {
  return {
    ...account,
    actualBalance: account.actualBalance ? Number(account.actualBalance) : null,
  }
}

export interface ProvisionBookieAccountsResult {
  cashAccount: SerializedAccount
  bonusAccount: SerializedAccount
  racingIncomeAccount: SerializedAccount
  racingExpenseAccount: SerializedAccount
  bonusDepositMatchIncomeAccount: SerializedAccount
  created: boolean
}

export interface ProvisionBankAccountResult {
  bankAccount: SerializedAccount
  created: boolean
}

export interface ProvisionBetfairAccountsResult {
  availableAccount: SerializedAccount
  created: boolean
}

export interface ProvisionPendingBetfairDepositResult {
  pendingAccount: SerializedAccount
  created: boolean
}

// ============================================================================
// Bookie Account Provisioning
// ============================================================================

/**
 * Provision Cash, Bonus, and per-bookie Income/Expense accounts for a bookie
 *
 * Creates five accounts:
 * - BOOKIE_CASH: Cash balance with the bookie
 * - BOOKIE_BONUS: Bonus/free bet balance with the bookie
 * - RACING_INCOME: Per-bookie racing income (profits)
 * - RACING_EXPENSE: Per-bookie racing expense (losses)
 * - BONUS_DEPOSIT_MATCH_RACING_INCOME: Per-bookie bonus/deposit match income
 *
 * This function is idempotent - returns existing accounts if already provisioned.
 *
 * Called when:
 * - User places first bet with a bookie
 * - User records first deposit to a bookie
 * - User manually adds a bookie account
 */
export const provisionBookieAccounts = createServerFn({ method: 'POST' })
  .inputValidator((d: { profileId: string; bookieId: number }) => d)
  .handler(async ({ data }): Promise<ProvisionBookieAccountsResult> => {
    const prisma = await getPrisma()
    const { profileId, bookieId } = data

    // Check if all 5 accounts already provisioned
    const existing = await prisma.account.findMany({
      where: {
        profileId,
        bookieId,
        subType: { in: ['BOOKIE_CASH', 'BOOKIE_BONUS', 'RACING_INCOME', 'RACING_EXPENSE', 'BONUS_DEPOSIT_MATCH_RACING_INCOME'] },
      },
    })

    // If all 5 accounts exist, return them
    if (existing.length === 5) {
      const cashAccount = existing.find((a) => a.subType === 'BOOKIE_CASH')
      const bonusAccount = existing.find((a) => a.subType === 'BOOKIE_BONUS')
      const racingIncomeAccount = existing.find((a) => a.subType === 'RACING_INCOME')
      const racingExpenseAccount = existing.find((a) => a.subType === 'RACING_EXPENSE')
      const bonusDepositMatchIncomeAccount = existing.find((a) => a.subType === 'BONUS_DEPOSIT_MATCH_RACING_INCOME')

      if (cashAccount && bonusAccount && racingIncomeAccount && racingExpenseAccount && bonusDepositMatchIncomeAccount) {
        return {
          cashAccount: serializeAccount(cashAccount),
          bonusAccount: serializeAccount(bonusAccount),
          racingIncomeAccount: serializeAccount(racingIncomeAccount),
          racingExpenseAccount: serializeAccount(racingExpenseAccount),
          bonusDepositMatchIncomeAccount: serializeAccount(bonusDepositMatchIncomeAccount),
          created: false,
        }
      }
    }

    // Get bookie details
    const bookie = await prisma.bookie.findUnique({
      where: { id: bookieId },
    })

    if (!bookie) {
      throw new Error(`Bookie not found: ${bookieId}`)
    }

    // Build map of existing accounts by subType for partial provisioning
    const existingBySubType = new Map(existing.map((a) => [a.subType, a]))

    // Helper to create account if not exists
    const createIfNotExists = async (
      subType: 'BOOKIE_CASH' | 'BOOKIE_BONUS' | 'RACING_INCOME' | 'RACING_EXPENSE' | 'BONUS_DEPOSIT_MATCH_RACING_INCOME',
      name: string,
      type: 'ASSET' | 'INCOME' | 'EXPENSE'
    ): Promise<Account> => {
      const existingAccount = existingBySubType.get(subType)
      if (existingAccount) {
        return existingAccount
      }

      const code = await generateCodeForType(profileId, subType)
      return prisma.account.create({
        data: {
          profileId,
          code,
          name,
          type,
          subType,
          bookieId: bookie.id,
          bookieName: bookie.name,
          isSystem: false,
          isActive: true,
        },
      })
    }

    // Create all accounts (existing ones are returned as-is)
    const [cashAccount, bonusAccount, racingIncomeAccount, racingExpenseAccount, bonusDepositMatchIncomeAccount] = await Promise.all([
      createIfNotExists('BOOKIE_CASH', `${bookie.name} Cash`, 'ASSET'),
      createIfNotExists('BOOKIE_BONUS', `${bookie.name} Bonus`, 'ASSET'),
      createIfNotExists('RACING_INCOME', `Racing Income: ${bookie.name}`, 'INCOME'),
      createIfNotExists('RACING_EXPENSE', `Racing Expense: ${bookie.name}`, 'EXPENSE'),
      createIfNotExists('BONUS_DEPOSIT_MATCH_RACING_INCOME', `Bonus Income: ${bookie.name}`, 'INCOME'),
    ])

    // Determine if any were created (not all existed before)
    const created = existing.length < 5

    return {
      cashAccount: serializeAccount(cashAccount),
      bonusAccount: serializeAccount(bonusAccount),
      racingIncomeAccount: serializeAccount(racingIncomeAccount),
      racingExpenseAccount: serializeAccount(racingExpenseAccount),
      bonusDepositMatchIncomeAccount: serializeAccount(bonusDepositMatchIncomeAccount),
      created,
    }
  })

/**
 * Get all bookie accounts for a profile
 */
export const getBookieAccounts = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId: string }) => d)
  .handler(async ({ data }): Promise<SerializedAccount[]> => {
    const prisma = await getPrisma()
    const { profileId } = data

    const accounts = await prisma.account.findMany({
      where: {
        profileId,
        subType: { in: ['BOOKIE_CASH', 'BOOKIE_BONUS', 'RACING_INCOME', 'RACING_EXPENSE', 'BONUS_DEPOSIT_MATCH_RACING_INCOME'] },
      },
      orderBy: [{ bookieName: 'asc' }, { subType: 'asc' }],
    })
    return accounts.map(serializeAccount)
  })

/**
 * Get bookie accounts for a specific bookie
 */
export const getBookieAccountsByBookieId = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId: string; bookieId: number }) => d)
  .handler(
    async ({
      data,
    }): Promise<{
      cashAccount: SerializedAccount | null
      bonusAccount: SerializedAccount | null
      racingIncomeAccount: SerializedAccount | null
      racingExpenseAccount: SerializedAccount | null
      bonusDepositMatchIncomeAccount: SerializedAccount | null
    }> => {
      const prisma = await getPrisma()
      const { profileId, bookieId } = data

      const accounts = await prisma.account.findMany({
        where: {
          profileId,
          bookieId,
          subType: { in: ['BOOKIE_CASH', 'BOOKIE_BONUS', 'RACING_INCOME', 'RACING_EXPENSE', 'BONUS_DEPOSIT_MATCH_RACING_INCOME'] },
        },
      })

      const find = (subType: string) => {
        const acc = accounts.find((a) => a.subType === subType)
        return acc ? serializeAccount(acc) : null
      }

      return {
        cashAccount: find('BOOKIE_CASH'),
        bonusAccount: find('BOOKIE_BONUS'),
        racingIncomeAccount: find('RACING_INCOME'),
        racingExpenseAccount: find('RACING_EXPENSE'),
        bonusDepositMatchIncomeAccount: find('BONUS_DEPOSIT_MATCH_RACING_INCOME'),
      }
    }
  )

// ============================================================================
// Bank Account Provisioning
// ============================================================================

/**
 * Provision a bank account
 *
 * Creates a BANK type account for tracking bank balances.
 * Supports multiple bank accounts per profile (e.g., "Bookie Bank", "Betfair Bank").
 *
 * This function is idempotent - returns existing account if already provisioned.
 */
export const provisionBankAccount = createServerFn({ method: 'POST' })
  .inputValidator((d: { profileId: string; bankName: string }) => d)
  .handler(async ({ data }): Promise<ProvisionBankAccountResult> => {
    const prisma = await getPrisma()
    const { profileId, bankName } = data

    if (!bankName.trim()) {
      throw new Error('Bank name is required')
    }

    // Check if already provisioned with this name
    const existing = await prisma.account.findFirst({
      where: {
        profileId,
        subType: 'BANK',
        bankName: bankName.trim(),
      },
    })

    if (existing) {
      return {
        bankAccount: serializeAccount(existing),
        created: false,
      }
    }

    // Generate code for new account
    const code = await generateCodeForType(profileId, 'BANK')

    // Create bank account
    const bankAccount = await prisma.account.create({
      data: {
        profileId,
        code,
        name: bankName.trim(),
        type: 'ASSET',
        subType: 'BANK',
        bankName: bankName.trim(),
        isSystem: false,
        isActive: true,
      },
    })

    return { bankAccount: serializeAccount(bankAccount), created: true }
  })

/**
 * Get all bank accounts for a profile
 */
export const getBankAccounts = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId: string }) => d)
  .handler(async ({ data }): Promise<SerializedAccount[]> => {
    const prisma = await getPrisma()
    const { profileId } = data

    const accounts = await prisma.account.findMany({
      where: {
        profileId,
        subType: 'BANK',
      },
      orderBy: { bankName: 'asc' },
    })
    return accounts.map(serializeAccount)
  })

// ============================================================================
// Betfair Account Provisioning
// ============================================================================

/**
 * Provision Betfair Available account
 *
 * Creates BETFAIR_AVAILABLE account for tracking exchange balance.
 * This function is idempotent - returns existing if already provisioned.
 *
 * Called when:
 * - User places first matched bet in Lay Manager
 * - User records first deposit to Betfair
 */
export const provisionBetfairAccounts = createServerFn({ method: 'POST' })
  .inputValidator((d: { profileId: string }) => d)
  .handler(async ({ data }): Promise<ProvisionBetfairAccountsResult> => {
    const prisma = await getPrisma()
    const { profileId } = data

    // Check if already provisioned
    const existing = await prisma.account.findFirst({
      where: {
        profileId,
        subType: 'BETFAIR_AVAILABLE',
      },
    })

    if (existing) {
      return {
        availableAccount: serializeAccount(existing),
        created: false,
      }
    }

    // Generate code for new account
    const code = await generateCodeForType(profileId, 'BETFAIR_AVAILABLE')

    // Create Betfair Available account
    const availableAccount = await prisma.account.create({
      data: {
        profileId,
        code,
        name: 'Betfair Available',
        type: 'ASSET',
        subType: 'BETFAIR_AVAILABLE',
        isSystem: false,
        isActive: true,
      },
    })

    return { availableAccount: serializeAccount(availableAccount), created: true }
  })

/**
 * Get Betfair account for a profile
 */
export const getBetfairAccount = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId: string }) => d)
  .handler(async ({ data }): Promise<SerializedAccount | null> => {
    const prisma = await getPrisma()
    const { profileId } = data

    const account = await prisma.account.findFirst({
      where: {
        profileId,
        subType: 'BETFAIR_AVAILABLE',
      },
    })
    return account ? serializeAccount(account) : null
  })

/**
 * Provision Pending Betfair Deposit account
 *
 * Creates PENDING_BETFAIR_DEPOSIT account for tracking funds in transit.
 * This is a LIABILITY account - represents money owed to Betfair balance.
 * This function is idempotent - returns existing if already provisioned.
 *
 * Called when:
 * - User initiates a deposit to Betfair (before funds arrive)
 */
export const provisionPendingBetfairDepositAccount = createServerFn({ method: 'POST' })
  .inputValidator((d: { profileId: string }) => d)
  .handler(async ({ data }): Promise<ProvisionPendingBetfairDepositResult> => {
    const prisma = await getPrisma()
    const { profileId } = data

    // Check if already provisioned
    const existing = await prisma.account.findFirst({
      where: {
        profileId,
        subType: 'PENDING_BETFAIR_DEPOSIT',
      },
    })

    if (existing) {
      return {
        pendingAccount: serializeAccount(existing),
        created: false,
      }
    }

    // Generate code for new account
    const code = await generateCodeForType(profileId, 'PENDING_BETFAIR_DEPOSIT')

    // Create Pending Betfair Deposit account (LIABILITY type)
    const pendingAccount = await prisma.account.create({
      data: {
        profileId,
        code,
        name: 'Pending Betfair Deposit',
        type: 'LIABILITY',
        subType: 'PENDING_BETFAIR_DEPOSIT',
        isSystem: false,
        isActive: true,
      },
    })

    return { pendingAccount: serializeAccount(pendingAccount), created: true }
  })

/**
 * Get Pending Betfair Deposit account for a profile
 */
export const getPendingBetfairDepositAccount = createServerFn({ method: 'GET' })
  .inputValidator((d: { profileId: string }) => d)
  .handler(async ({ data }): Promise<SerializedAccount | null> => {
    const prisma = await getPrisma()
    const { profileId } = data

    const account = await prisma.account.findFirst({
      where: {
        profileId,
        subType: 'PENDING_BETFAIR_DEPOSIT',
      },
    })
    return account ? serializeAccount(account) : null
  })
