/**
 * Account Code Generator Utility
 *
 * Generates sequential account codes within specified ranges.
 * Used for on-demand provisioning of bookie and bank accounts.
 */

import prisma from '@/lib/prisma'

/**
 * Account code ranges for different account types
 */
export const ACCOUNT_CODE_RANGES = {
  BOOKIE_CASH: { start: '1001', end: '1199' },
  BOOKIE_BONUS: { start: '1201', end: '1299' },
  BANK: { start: '1401', end: '1499' },
  BETFAIR_AVAILABLE: { start: '1501', end: '1599' },
  PENDING_BETFAIR_DEPOSIT: { start: '2001', end: '2099' },
  // Per-bookie income/expense accounts (children of parent system accounts)
  RACING_INCOME: { start: '4101', end: '4199' },
  BONUS_DEPOSIT_MATCH_RACING_INCOME: { start: '4201', end: '4299' },
  BONUS_DEPOSIT_MATCH_SPORTS_INCOME: { start: '4301', end: '4399' }, // Reserved for future sports module
  RACING_EXPENSE: { start: '5101', end: '5199' },
} as const

export type AccountCodeRange = keyof typeof ACCOUNT_CODE_RANGES

/**
 * Generate the next available account code within a range
 *
 * @param profileId - Profile to check existing codes for
 * @param rangeStart - Start of code range (inclusive)
 * @param rangeEnd - End of code range (inclusive)
 * @returns Next available code as string
 * @throws Error if range is exhausted
 */
export async function generateNextAccountCode(
  profileId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<string> {
  // Find the highest code currently in use within the range
  const existing = await prisma.account.findMany({
    where: {
      profileId,
      code: {
        gte: rangeStart,
        lte: rangeEnd,
      },
    },
    select: { code: true },
    orderBy: { code: 'desc' },
    take: 1,
  })

  // If no existing accounts, start at rangeStart
  if (existing.length === 0) {
    return rangeStart
  }

  // Calculate next code
  const nextCode = (parseInt(existing[0].code, 10) + 1).toString()

  // Check if range is exhausted
  if (parseInt(nextCode, 10) > parseInt(rangeEnd, 10)) {
    throw new Error(`Account code range exhausted: ${rangeStart}-${rangeEnd}`)
  }

  return nextCode
}

/**
 * Generate next code for a specific account type
 */
export async function generateCodeForType(
  profileId: string,
  type: AccountCodeRange
): Promise<string> {
  const range = ACCOUNT_CODE_RANGES[type]
  return generateNextAccountCode(profileId, range.start, range.end)
}
