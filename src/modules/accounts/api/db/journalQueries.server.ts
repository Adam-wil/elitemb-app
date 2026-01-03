/**
 * Journal Queries Server Functions
 *
 * Server functions for querying journal entries and lines.
 * Used by components to display transaction history.
 */

import { createServerFn } from '@tanstack/react-start'
import type { JournalEntryType, BetType, AccountType } from '@prisma/client'

// Dynamic import helper - prevents prisma from being bundled for client
async function getPrisma() {
  const { default: prisma } = await import('@/lib/prisma.server')
  return prisma
}

// ============================================================================
// Types
// ============================================================================

/**
 * Input for fetching journal lines for an account
 */
interface GetJournalLinesInput {
  accountId: string
  profileId?: string // Optional - uses default profile if not provided
  limit?: number
  offset?: number
  startDate?: string // ISO date string for filtering
  endDate?: string // ISO date string for filtering
}

/**
 * Journal line with associated entry data
 */
export interface JournalLineWithEntry {
  id: string
  journalEntryId: string
  accountId: string
  debit: number
  credit: number
  memo: string | null
  journalEntry: {
    id: string
    entryDate: Date
    entryType: JournalEntryType
    description: string | null
    referenceType: string | null
    referenceId: string | null
    betType: BetType | null
    isVoid: boolean
    createdAt: Date
  }
}

/**
 * Input for fetching a single journal entry with all lines
 */
interface GetJournalEntryInput {
  journalEntryId: string
  profileId?: string // Optional - will use entry's profileId if not provided
}

/**
 * Full journal entry with all lines and account names
 */
export interface JournalEntryDetail {
  id: string
  profileId: string
  entryDate: Date
  entryType: JournalEntryType
  description: string | null
  referenceType: string | null
  referenceId: string | null
  betType: BetType | null
  isVoid: boolean
  voidReason: string | null
  voidedAt: Date | null
  createdAt: Date
  lines: Array<{
    id: string
    accountId: string
    accountCode: string
    accountName: string
    accountType: AccountType
    bookieName: string | null
    debit: number
    credit: number
    memo: string | null
  }>
}

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Get journal lines for a specific account with pagination
 * Returns lines in reverse chronological order (newest first)
 */
export const getJournalLinesForAccount = createServerFn({ method: 'GET' })
  .inputValidator((input: GetJournalLinesInput) => input)
  .handler(async ({ data }): Promise<JournalLineWithEntry[]> => {
    const prisma = await getPrisma()
    const { accountId, limit = 50, offset = 0, startDate, endDate } = data

    // Get profile ID from input or use the account's profile
    let profileId = data.profileId
    if (!profileId) {
      // Look up the account to get its profileId
      const accountLookup = await prisma.account.findUnique({
        where: { id: accountId },
        select: { profileId: true },
      })
      if (!accountLookup) {
        throw new Error('Account not found')
      }
      profileId = accountLookup.profileId
    }

    // Verify account belongs to profile
    const account = await prisma.account.findFirst({
      where: { id: accountId, profileId },
      select: { id: true },
    })

    if (!account) {
      throw new Error('Account not found or does not belong to this profile')
    }

    // Build date filter for JournalEntry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entryDateFilter: any = {}
    if (startDate) {
      entryDateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      entryDateFilter.lte = new Date(endDate)
    }

    // Fetch journal lines with entry data
    const lines = await prisma.journalLine.findMany({
      where: {
        accountId,
        JournalEntry: Object.keys(entryDateFilter).length > 0
          ? { entryDate: entryDateFilter }
          : undefined,
      },
      include: {
        JournalEntry: {
          select: {
            id: true,
            entryDate: true,
            entryType: true,
            description: true,
            referenceType: true,
            referenceId: true,
            betType: true,
            isVoid: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { JournalEntry: { entryDate: 'desc' } },
        { JournalEntry: { createdAt: 'desc' } },
      ],
      take: limit,
      skip: offset,
    })

    // Map to response type
    return lines.map((line) => ({
      id: line.id,
      journalEntryId: line.journalEntryId,
      accountId: line.accountId,
      debit: Number(line.debit),
      credit: Number(line.credit),
      memo: line.memo,
      journalEntry: {
        id: line.JournalEntry.id,
        entryDate: line.JournalEntry.entryDate,
        entryType: line.JournalEntry.entryType,
        description: line.JournalEntry.description,
        referenceType: line.JournalEntry.referenceType,
        referenceId: line.JournalEntry.referenceId,
        betType: line.JournalEntry.betType,
        isVoid: line.JournalEntry.isVoid,
        createdAt: line.JournalEntry.createdAt,
      },
    }))
  })

/**
 * Get a single journal entry with all its lines
 * Used for the detail view
 */
export const getJournalEntryDetail = createServerFn({ method: 'GET' })
  .inputValidator((input: GetJournalEntryInput) => input)
  .handler(async ({ data }): Promise<JournalEntryDetail | null> => {
    const prisma = await getPrisma()
    const { journalEntryId, profileId } = data

    // Build where clause - only include profileId if provided
    // Journal entry ID is unique, so we can query by just that
    const entry = await prisma.journalEntry.findFirst({
      where: {
        id: journalEntryId,
        ...(profileId ? { profileId } : {}),
      },
      include: {
        JournalLine: {
          include: {
            Account: {
              select: {
                code: true,
                name: true,
                type: true,
                bookieName: true,
              },
            },
          },
        },
      },
    })

    if (!entry) {
      return null
    }

    return {
      id: entry.id,
      profileId: entry.profileId,
      entryDate: entry.entryDate,
      entryType: entry.entryType,
      description: entry.description,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
      betType: entry.betType,
      isVoid: entry.isVoid,
      voidReason: entry.voidReason,
      voidedAt: entry.voidedAt,
      createdAt: entry.createdAt,
      lines: entry.JournalLine.map((line) => ({
        id: line.id,
        accountId: line.accountId,
        accountCode: line.Account.code,
        accountName: line.Account.name,
        accountType: line.Account.type,
        bookieName: line.Account.bookieName,
        debit: Number(line.debit),
        credit: Number(line.credit),
        memo: line.memo,
      })),
    }
  })
