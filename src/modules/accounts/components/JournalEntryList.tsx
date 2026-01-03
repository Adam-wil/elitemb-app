/**
 * Journal Entry List Component
 *
 * Displays journal lines for an account with:
 * - Reverse chronological order
 * - Running balance calculation
 * - Visual grouping by journal entry
 * - Pagination support
 */

import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  Button,
} from '@mui/material'
import { ChevronRight } from 'lucide-react'
import { useJournalLines } from '../hooks/useJournalLines'
import type { JournalLineWithEntry } from '../api/db/journalQueries.server'
import { formatCurrency } from '@/modules/the-furlong/hooks/useDashboardData'

// ============================================================================
// Types
// ============================================================================

export interface JournalEntryListProps {
  accountId: string
  profileId?: string
  pageSize?: number
  onEntryClick?: (journalEntryId: string) => void
  startDate?: string
  endDate?: string
}

interface JournalLineDisplay extends JournalLineWithEntry {
  runningBalance: number
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format date for display
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Entry type labels for display
 */
const ENTRY_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: 'Deposit',
  WITHDRAWAL: 'Withdrawal',
  BET: 'Bet',
  TRANSFER: 'Transfer',
  ADJUSTMENT: 'Adjustment',
  BONUS: 'Bonus',
  REVERSAL: 'Reversal',
}

// ============================================================================
// Component
// ============================================================================

export function JournalEntryList({
  accountId,
  profileId,
  pageSize = 50,
  onEntryClick,
  startDate,
  endDate,
}: JournalEntryListProps) {
  const { lines, isLoading, isLoadingMore, hasMore, loadMore } =
    useJournalLines({
      accountId,
      profileId,
      pageSize,
      startDate,
      endDate,
    })

  // Calculate running balances
  // Lines come in desc order, but we need to calculate balance from oldest to newest
  const linesWithBalance = useMemo((): JournalLineDisplay[] => {
    if (!lines.length) return []

    // Sort chronologically for balance calculation
    const sorted = [...lines].sort(
      (a, b) =>
        new Date(a.journalEntry.entryDate).getTime() -
        new Date(b.journalEntry.entryDate).getTime()
    )

    // Calculate running balance
    let runningBalance = 0
    const withBalances = sorted.map((line) => {
      // For asset accounts: debit increases, credit decreases
      runningBalance += line.debit - line.credit
      return { ...line, runningBalance }
    })

    // Return in reverse chronological order for display
    return withBalances.reverse()
  }, [lines])

  // Group by journalEntryId for visual separation
  const groupedLines = useMemo(() => {
    const groups: Array<{ entryId: string; lines: JournalLineDisplay[] }> = []
    let currentGroup: { entryId: string; lines: JournalLineDisplay[] } | null =
      null

    for (const line of linesWithBalance) {
      if (!currentGroup || currentGroup.entryId !== line.journalEntryId) {
        currentGroup = { entryId: line.journalEntryId, lines: [] }
        groups.push(currentGroup)
      }
      currentGroup.lines.push(line)
    }

    return groups
  }, [linesWithBalance])

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  // Empty state
  if (!lines.length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No journal entries found</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Debit</TableCell>
              <TableCell align="right">Credit</TableCell>
              <TableCell align="right">Balance</TableCell>
              {onEntryClick && <TableCell width={40} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {groupedLines.map((group, groupIndex) =>
              group.lines.map((line, lineIndex) => (
                <TableRow
                  key={line.id}
                  hover
                  onClick={() => onEntryClick?.(line.journalEntryId)}
                  sx={{
                    cursor: onEntryClick ? 'pointer' : 'default',
                    // Add border between groups
                    borderBottom:
                      lineIndex === group.lines.length - 1 &&
                      groupIndex < groupedLines.length - 1
                        ? '2px solid'
                        : undefined,
                    borderColor: 'divider',
                    // Void styling
                    opacity: line.journalEntry.isVoid ? 0.5 : 1,
                    textDecoration: line.journalEntry.isVoid
                      ? 'line-through'
                      : 'none',
                  }}
                >
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(line.journalEntry.entryDate)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {ENTRY_TYPE_LABELS[line.journalEntry.entryType] ||
                        line.journalEntry.entryType}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{ maxWidth: 200 }}
                      title={
                        line.journalEntry.description || line.memo || undefined
                      }
                    >
                      {line.journalEntry.description || line.memo || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {line.debit > 0 && (
                      <Typography color="success.main" variant="body2">
                        {formatCurrency(line.debit)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {line.credit > 0 && (
                      <Typography color="error.main" variant="body2">
                        {formatCurrency(line.credit)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      sx={{
                        color:
                          line.runningBalance >= 0
                            ? 'success.main'
                            : 'error.main',
                        fontWeight: 500,
                      }}
                    >
                      {formatCurrency(line.runningBalance)}
                    </Typography>
                  </TableCell>
                  {onEntryClick && (
                    <TableCell>
                      <IconButton size="small">
                        <ChevronRight size={16} />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Load More Button */}
      {hasMore && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Button
            onClick={loadMore}
            disabled={isLoadingMore}
            variant="outlined"
            startIcon={
              isLoadingMore ? <CircularProgress size={16} /> : undefined
            }
          >
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </Box>
      )}
    </Box>
  )
}
