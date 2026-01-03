/**
 * Tracker Journal Sync Server Functions
 *
 * TanStack Start server functions for syncing journal entries when
 * tracker entries are edited. Handles reversal chains and in-place updates.
 *
 * DO NOT use 'use server' directive - TanStack Start handles this via createServerFn()
 *
 * @see Story 3.13: Tracker Entry Edit Journal Update
 */

import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma'
import type { Prisma, JournalEntryType, BetType } from '@prisma/client'
import type {
  JournalEntryWithLines,
  UpdateTrackerEntryJournalInput,
  UpdateTrackerEntryJournalResult,
  ReverseJournalInput,
  ReverseJournalResult,
  CanEditTrackerEntryResult,
  TrackerEditValues,
  TrackerAuditTrailEntry,
} from '../../types/journal'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map Prisma result to JournalEntryWithLines type
 */
function mapToJournalEntryWithLines(entry: {
  id: string
  profileId: string
  entryDate: Date
  entryType: JournalEntryType
  description: string | null
  referenceType: string | null
  referenceId: string | null
  betType: BetType | null
  isVoid: boolean
  createdAt: Date
  JournalLine: Array<{
    id: string
    accountId: string
    debit: Prisma.Decimal | number
    credit: Prisma.Decimal | number
    memo: string | null
  }>
}): JournalEntryWithLines {
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
    createdAt: entry.createdAt,
    lines: entry.JournalLine.map((line) => ({
      id: line.id,
      accountId: line.accountId,
      debit: typeof line.debit === 'number' ? line.debit : Number(line.debit),
      credit: typeof line.credit === 'number' ? line.credit : Number(line.credit),
      memo: line.memo,
    })),
  }
}

/**
 * Detect what fields changed between old and new values
 */
function detectChanges(
  oldValues: TrackerEditValues,
  newValues: TrackerEditValues
): string[] {
  const changes: string[] = []

  if (oldValues.stake !== newValues.stake) changes.push('stake')
  if (oldValues.odds !== newValues.odds) changes.push('odds')
  if (oldValues.outcome !== newValues.outcome) changes.push('outcome')
  if (oldValues.bookieId !== newValues.bookieId) changes.push('bookieId')
  if (oldValues.isBonusBet !== newValues.isBonusBet) changes.push('isBonusBet')
  if (oldValues.layStake !== newValues.layStake) changes.push('layStake')
  if (oldValues.layOdds !== newValues.layOdds) changes.push('layOdds')

  return changes
}

// ============================================================================
// Reverse Journal Entry
// ============================================================================

/**
 * Reverse a journal entry
 *
 * Creates a reversal entry with swapped debits and credits.
 * Links the reversal to the original bidirectionally:
 * - Reversal.reversesEntryId -> Original
 * - Original.reversedByEntryId -> Reversal
 *
 * @param input - Original entry ID and reason
 * @returns The reversed entry and reversal entry
 *
 * @see Story 3.13: Tracker Entry Edit Journal Update
 */
export const reverseJournalEntry = createServerFn({ method: 'POST' })
  .inputValidator((input: ReverseJournalInput) => input)
  .handler(async ({ data }): Promise<ReverseJournalResult> => {
    const { originalEntryId, reason } = data

    // Find the original entry with lines
    const original = await prisma.journalEntry.findUnique({
      where: { id: originalEntryId },
      include: {
        JournalLine: {
          include: { Account: true },
        },
      },
    })

    if (!original) {
      throw new Error(`Journal entry not found: ${originalEntryId}`)
    }

    if (original.reversedByEntryId) {
      throw new Error('Entry has already been reversed')
    }

    if (original.isVoid) {
      throw new Error('Cannot reverse a voided entry')
    }

    // Create reversal entry with swapped debits/credits
    const result = await prisma.$transaction(async (tx) => {
      const reversalId = crypto.randomUUID()

      // Create the reversal entry
      const reversalEntry = await tx.journalEntry.create({
        data: {
          id: reversalId,
          profileId: original.profileId,
          entryDate: new Date(),
          entryType: 'REVERSAL',
          description: `Reversal: ${original.description || 'Entry reversed'}`,
          referenceType: original.referenceType,
          referenceId: original.referenceId,
          betType: original.betType,
          reversesEntryId: original.id,
          createdBy: reason || 'Entry correction',
        },
      })

      // Create reversed lines (swap debits and credits)
      const reversalLines = await Promise.all(
        original.JournalLine.map((line) =>
          tx.journalLine.create({
            data: {
              id: crypto.randomUUID(),
              journalEntryId: reversalId,
              accountId: line.accountId,
              debit: line.credit, // Swap: original credit becomes debit
              credit: line.debit, // Swap: original debit becomes credit
              memo: `Reversal of: ${line.memo || 'original entry'}`,
            },
          })
        )
      )

      // Mark original as reversed
      await tx.journalEntry.update({
        where: { id: originalEntryId },
        data: {
          reversedByEntryId: reversalId,
        },
      })

      return {
        reversalEntry: { ...reversalEntry, JournalLine: reversalLines },
        originalEntry: original,
      }
    })

    // Fetch updated original
    const updatedOriginal = await prisma.journalEntry.findUnique({
      where: { id: originalEntryId },
      include: { JournalLine: true },
    })

    return {
      reversedEntry: mapToJournalEntryWithLines(updatedOriginal!),
      reversalEntry: mapToJournalEntryWithLines(result.reversalEntry),
      message: `Entry reversed: ${original.description}`,
    }
  })

// ============================================================================
// Can Edit Tracker Entry
// ============================================================================

/**
 * Check if a tracker entry can be edited and what the implications are
 *
 * @param input - Entry type and ID
 * @returns Edit capabilities and requirements
 */
export const canEditTrackerEntry = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: {
      entryType: 'RACING_TRACKER' | 'LAY_MANAGER'
      entryId: string
      profileId: string
    }) => input
  )
  .handler(async ({ data }): Promise<CanEditTrackerEntryResult> => {
    const { entryType, entryId, profileId } = data

    // Find all non-voided journal entries for this tracker entry
    const referenceType = entryType === 'RACING_TRACKER' ? 'RACING_TRACKER' : 'LAY_MANAGER'

    const entries = await prisma.journalEntry.findMany({
      where: {
        profileId,
        referenceType,
        referenceId: entryId,
        isVoid: false,
        reversedByEntryId: null, // Not already reversed
      },
    })

    if (entries.length === 0) {
      return {
        canEdit: true,
        requiresReversal: false,
        hasPendingEntries: false,
        hasPostedEntries: false,
        message: 'No journal entries - can edit freely',
      }
    }

    // Check entry types to determine if pending or posted
    // BET_PLACED = pending, BET_SETTLED/LAY_SETTLED = posted
    const pendingTypes: JournalEntryType[] = ['BET_PLACED', 'LAY_PLACED']
    const postedTypes: JournalEntryType[] = ['BET_SETTLED', 'LAY_SETTLED']

    const hasPendingEntries = entries.some((e) => pendingTypes.includes(e.entryType))
    const hasPostedEntries = entries.some((e) => postedTypes.includes(e.entryType))

    if (hasPostedEntries) {
      return {
        canEdit: true,
        requiresReversal: true,
        hasPendingEntries,
        hasPostedEntries: true,
        message: 'Edit will create reversal entries for audit trail',
      }
    }

    if (hasPendingEntries) {
      return {
        canEdit: true,
        requiresReversal: false,
        hasPendingEntries: true,
        hasPostedEntries: false,
        message: 'Pending entries can be updated in place',
      }
    }

    return {
      canEdit: true,
      requiresReversal: false,
      hasPendingEntries: false,
      hasPostedEntries: false,
      message: 'Can edit',
    }
  })

// ============================================================================
// Update Tracker Entry Journal
// ============================================================================

/**
 * Update journal entries when a tracker entry is edited
 *
 * Behavior depends on entry status and change type:
 * - Pending + stake/odds change: Update in place
 * - Pending + bookie change: Reversal + new (different accounts)
 * - Posted + any change: Reversal + new entries
 *
 * @param input - Edit details including old and new values
 * @returns Updated entries and status
 *
 * @see Story 3.13: Tracker Entry Edit Journal Update
 */
export const updateTrackerEntryJournal = createServerFn({ method: 'POST' })
  .inputValidator((input: UpdateTrackerEntryJournalInput) => input)
  .handler(async ({ data }): Promise<UpdateTrackerEntryJournalResult> => {
    const { entryType, entryId, profileId, oldValues, newValues } = data

    const referenceType = entryType === 'RACING_TRACKER' ? 'RACING_TRACKER' : 'LAY_MANAGER'

    // Find existing journal entries for this tracker entry
    const existingEntries = await prisma.journalEntry.findMany({
      where: {
        profileId,
        referenceType,
        referenceId: entryId,
        isVoid: false,
        reversedByEntryId: null, // Not already reversed
      },
      include: { JournalLine: true },
      orderBy: { createdAt: 'desc' },
    })

    if (existingEntries.length === 0) {
      return {
        message: 'No journal entries found for this tracker entry',
      }
    }

    // Detect what changed
    const changes = detectChanges(oldValues, newValues)
    if (changes.length === 0) {
      return { message: 'No changes detected' }
    }

    const latestEntry = existingEntries[0]
    const pendingTypes: JournalEntryType[] = ['BET_PLACED', 'LAY_PLACED']
    const isPending = pendingTypes.includes(latestEntry.entryType)
    const requiresNewAccounts = changes.includes('bookieId')

    // Determine action based on status and change type
    if (isPending && !requiresNewAccounts) {
      // Can update in place for pending entries (unless bookie changed)
      return await updatePendingEntryInPlace(latestEntry, oldValues, newValues, changes)
    } else {
      // Need reversal for posted entries or bookie changes
      return await reverseAndPrepareForRecreate(
        profileId,
        referenceType,
        entryId,
        existingEntries,
        changes
      )
    }
  })

/**
 * Update a pending entry in place (no reversal needed)
 */
async function updatePendingEntryInPlace(
  entry: {
    id: string
    description: string | null
    JournalLine: Array<{
      id: string
      debit: Prisma.Decimal
      credit: Prisma.Decimal
    }>
  },
  oldValues: TrackerEditValues,
  newValues: TrackerEditValues,
  changes: string[]
): Promise<UpdateTrackerEntryJournalResult> {
  // Only stake changes affect journal amounts
  if (!changes.includes('stake')) {
    return {
      updatedInPlace: true,
      message: 'No journal amount changes needed (odds changes affect settlement, not placement)',
    }
  }

  const oldStake = oldValues.stake || 0
  const newStake = newValues.stake || 0

  if (oldStake === 0) {
    return {
      updatedInPlace: true,
      message: 'Cannot update - original stake was zero',
    }
  }

  const ratio = newStake / oldStake

  // Update journal lines proportionally
  await prisma.$transaction(async (tx) => {
    for (const line of entry.JournalLine) {
      const oldDebit = Number(line.debit)
      const oldCredit = Number(line.credit)

      await tx.journalLine.update({
        where: { id: line.id },
        data: {
          debit: oldDebit * ratio,
          credit: oldCredit * ratio,
        },
      })
    }

    // Update entry description if it contains stake amount
    if (entry.description) {
      const updatedDescription = entry.description.replace(
        new RegExp(`\\$${oldStake.toFixed(2)}`, 'g'),
        `$${newStake.toFixed(2)}`
      )

      await tx.journalEntry.update({
        where: { id: entry.id },
        data: { description: updatedDescription },
      })
    }
  })

  return {
    updatedInPlace: true,
    message: `Entry updated: stake changed from $${oldStake.toFixed(2)} to $${newStake.toFixed(2)}`,
  }
}

/**
 * Reverse existing entries and prepare for recreation
 *
 * This reverses all non-reversed entries for the tracker entry.
 * The caller should then trigger the appropriate hooks to create new entries.
 */
async function reverseAndPrepareForRecreate(
  profileId: string,
  referenceType: string,
  entryId: string,
  existingEntries: Array<{
    id: string
    description: string | null
    entryType: JournalEntryType
    reversedByEntryId: string | null
    JournalLine: Array<{
      id: string
      accountId: string
      debit: Prisma.Decimal
      credit: Prisma.Decimal
      memo: string | null
    }>
  }>,
  changes: string[]
): Promise<UpdateTrackerEntryJournalResult> {
  const reversedEntries: JournalEntryWithLines[] = []
  const reversalEntries: JournalEntryWithLines[] = []

  for (const entry of existingEntries) {
    if (entry.reversedByEntryId) continue // Skip already reversed

    const result = await reverseJournalEntry({
      data: {
        originalEntryId: entry.id,
        reason: `Tracker entry corrected: ${changes.join(', ')}`,
      },
    })

    reversedEntries.push(result.reversedEntry)
    reversalEntries.push(result.reversalEntry)
  }

  return {
    reversedEntries,
    reversalEntries,
    message: `Reversed ${reversedEntries.length} entries. New entries will be created by tracker hooks on next save.`,
  }
}

// ============================================================================
// Get Tracker Audit Trail
// ============================================================================

/**
 * Get full audit trail of journal entries for a tracker entry
 *
 * Includes original entries, reversals, and corrected entries.
 * Useful for displaying edit history.
 *
 * @param input - Entry type and ID
 * @returns Array of audit trail entries
 */
export const getTrackerAuditTrail = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: {
      entryType: 'RACING_TRACKER' | 'LAY_MANAGER'
      entryId: string
      profileId: string
    }) => input
  )
  .handler(async ({ data }): Promise<TrackerAuditTrailEntry[]> => {
    const { entryType, entryId, profileId } = data

    const referenceType = entryType === 'RACING_TRACKER' ? 'RACING_TRACKER' : 'LAY_MANAGER'

    const entries = await prisma.journalEntry.findMany({
      where: {
        profileId,
        referenceType,
        referenceId: entryId,
        isVoid: false,
      },
      include: {
        JournalLine: {
          include: { Account: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return entries.map((e) => ({
      id: e.id,
      entryDate: e.entryDate,
      description: e.description,
      entryType: e.entryType,
      isReversal: !!e.reversesEntryId,
      wasReversed: !!e.reversedByEntryId,
      lines: e.JournalLine.map((l) => ({
        accountName: l.Account.name,
        debit: Number(l.debit),
        credit: Number(l.credit),
      })),
    }))
  })

// ============================================================================
// Void Journal Entry (Alternative to Reversal)
// ============================================================================

/**
 * Void a journal entry instead of reversing it
 *
 * Use when an entry was created in error and should be hidden.
 * Voided entries are marked with isVoid=true and excluded from reports.
 *
 * @param input - Entry ID and reason
 * @returns The voided entry
 */
export const voidJournalEntry = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      journalEntryId: string
      reason: string
      profileId: string
    }) => input
  )
  .handler(async ({ data }): Promise<JournalEntryWithLines> => {
    const { journalEntryId, reason, profileId } = data

    const entry = await prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: { JournalLine: true },
    })

    if (!entry) {
      throw new Error(`Journal entry not found: ${journalEntryId}`)
    }

    if (entry.profileId !== profileId) {
      throw new Error('Journal entry does not belong to this profile')
    }

    if (entry.isVoid) {
      throw new Error('Entry is already voided')
    }

    const updated = await prisma.journalEntry.update({
      where: { id: journalEntryId },
      data: {
        isVoid: true,
        voidReason: reason,
        voidedAt: new Date(),
      },
      include: { JournalLine: true },
    })

    return mapToJournalEntryWithLines(updated)
  })
