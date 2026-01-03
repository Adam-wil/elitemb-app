/**
 * Account Code Generator Utility
 *
 * Generates sequential account codes within specified ranges.
 * Used for on-demand provisioning of bookie and bank accounts.
 */

import { ACCOUNT_CODE_RANGES, type AccountCodeRange } from './accountCodeRanges'

// Dynamic import helper - prevents prisma from being bundled for client
async function getPrisma() {
  const { default: prisma } = await import('@/lib/prisma.server')
  return prisma
}

// Re-export constants for server-side consumers
export { ACCOUNT_CODE_RANGES, type AccountCodeRange } from './accountCodeRanges'

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
  const prisma = await getPrisma()

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
