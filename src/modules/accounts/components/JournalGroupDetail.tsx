/**
 * Journal Group Detail Component
 *
 * Modal dialog displaying full journal entry details:
 * - Entry metadata (date, type, description)
 * - All journal lines with account info
 * - Total debits/credits with balance check
 * - Reverse entry action
 */

import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material'
import {
  ArrowLeftRight,
  Calendar,
  FileText,
  Link as LinkIcon,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react'
import { useJournalEntryDetail } from '../hooks/useJournalEntryDetail'
import { reverseJournalEntry } from '../api/db/journalService.server'
import { formatCurrency } from '@/modules/the-furlong/hooks/useDashboardData'

// ============================================================================
// Types
// ============================================================================

export interface JournalGroupDetailProps {
  journalEntryId: string
  profileId?: string // Optional - server will query by entry ID alone
  open: boolean
  onClose: () => void
  onReversed?: () => void
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
 * Format date and time for display
 */
function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Entry type labels for display
 */
const ENTRY_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: 'Deposit',
  WITHDRAWAL: 'Withdrawal',
  TRANSFER: 'Transfer',
  BET_PLACED: 'Bet Placed',
  BET_SETTLED: 'Bet Settled',
  BONUS_CREDITED: 'Bonus Credited',
  BONUS_EXPIRED: 'Bonus Expired',
  ADJUSTMENT: 'Adjustment',
  REVERSAL: 'Reversal',
  BET: 'Bet',
  BONUS: 'Bonus',
}

// ============================================================================
// Component
// ============================================================================

export function JournalGroupDetail({
  journalEntryId,
  profileId,
  open,
  onClose,
  onReversed,
}: JournalGroupDetailProps) {
  const { entry, isLoading, isError, refetch } = useJournalEntryDetail({
    journalEntryId,
    profileId,
    enabled: open,
  })

  const [isReversing, setIsReversing] = useState(false)
  const [reverseError, setReverseError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  // Calculate totals
  const totals = useMemo(() => {
    if (!entry) return { debits: 0, credits: 0 }
    return {
      debits: entry.lines.reduce((sum, line) => sum + line.debit, 0),
      credits: entry.lines.reduce((sum, line) => sum + line.credit, 0),
    }
  }, [entry])

  // Handle reverse action
  const handleReverse = async () => {
    setIsReversing(true)
    setReverseError(null)

    try {
      await reverseJournalEntry({
        data: {
          journalEntryId,
          reason: 'User initiated reversal',
        },
      })
      await refetch()
      onReversed?.()
      setShowConfirm(false)
    } catch (err) {
      setReverseError(
        err instanceof Error ? err.message : 'Failed to reverse entry'
      )
    } finally {
      setIsReversing(false)
    }
  }

  // Handle close - reset state
  const handleClose = () => {
    setShowConfirm(false)
    setReverseError(null)
    onClose()
  }

  if (!open) return null

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ArrowLeftRight size={24} />
          <Typography variant="h6">Journal Entry Detail</Typography>
          {entry?.isVoid && (
            <Chip
              label="VOID"
              color="error"
              size="small"
              icon={<AlertTriangle size={14} />}
            />
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Loading State */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {isError && (
          <Alert severity="error">Failed to load entry details</Alert>
        )}

        {/* Not Found State */}
        {!isLoading && !isError && !entry && (
          <Alert severity="warning">Journal entry not found</Alert>
        )}

        {/* Entry Details */}
        {entry && (
          <>
            {/* Metadata Section */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 3, mb: 1, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Calendar size={16} />
                  <Typography variant="body2">
                    {formatDate(entry.entryDate)}
                  </Typography>
                </Box>
                <Chip
                  label={
                    ENTRY_TYPE_LABELS[entry.entryType] || entry.entryType
                  }
                  size="small"
                  variant="outlined"
                />
                {entry.betType && (
                  <Chip
                    label={entry.betType}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Recorded: {formatDateTime(entry.createdAt)}
              </Typography>

              {entry.description && (
                <Box
                  sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}
                >
                  <FileText size={16} style={{ marginTop: 2 }} />
                  <Typography variant="body2">{entry.description}</Typography>
                </Box>
              )}

              {entry.referenceType && entry.referenceId && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinkIcon size={16} />
                  <Typography
                    variant="body2"
                    color="primary"
                    sx={{ cursor: 'pointer' }}
                  >
                    {entry.referenceType}: {entry.referenceId}
                  </Typography>
                </Box>
              )}

              {entry.isVoid && entry.voidReason && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Void Reason:</strong> {entry.voidReason}
                  </Typography>
                  {entry.voidedAt && (
                    <Typography variant="caption" display="block">
                      Voided on {formatDate(entry.voidedAt)}
                    </Typography>
                  )}
                </Alert>
              )}
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Lines Table */}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Account</TableCell>
                  <TableCell align="right">Debit</TableCell>
                  <TableCell align="right">Credit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entry.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <Typography variant="body2">
                        {line.accountName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {line.accountCode}
                        {line.bookieName && ` - ${line.bookieName}`}
                      </Typography>
                      {line.memo && (
                        <Typography
                          variant="caption"
                          display="block"
                          color="text.secondary"
                          sx={{ fontStyle: 'italic' }}
                        >
                          {line.memo}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {line.debit > 0 && (
                        <Typography color="success.main">
                          {formatCurrency(line.debit)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {line.credit > 0 && (
                        <Typography color="error.main">
                          {formatCurrency(line.credit)}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Totals Row */}
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>
                    <Typography variant="subtitle2">Totals</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" color="success.main">
                      {formatCurrency(totals.debits)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" color="error.main">
                      {formatCurrency(totals.credits)}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* Balance Check */}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              {Math.abs(totals.debits - totals.credits) < 0.01 ? (
                <Chip label="Balanced" color="success" size="small" />
              ) : (
                <Chip label="UNBALANCED" color="error" size="small" />
              )}
            </Box>

            {/* Reverse Error */}
            {reverseError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {reverseError}
              </Alert>
            )}

            {/* Reversal Confirmation */}
            {showConfirm && !entry.isVoid && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Are you sure you want to reverse this entry? This will:
                </Typography>
                <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                  <li>Mark the original entry as void</li>
                  <li>Create a new entry with opposite amounts</li>
                </ul>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    onClick={handleReverse}
                    disabled={isReversing}
                  >
                    {isReversing ? 'Reversing...' : 'Yes, Reverse'}
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setShowConfirm(false)}
                    disabled={isReversing}
                  >
                    Cancel
                  </Button>
                </Box>
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        {entry && !entry.isVoid && !showConfirm && (
          <Button
            startIcon={<RotateCcw size={16} />}
            onClick={() => setShowConfirm(true)}
            color="warning"
          >
            Reverse Entry
          </Button>
        )}
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
