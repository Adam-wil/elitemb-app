import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Box,
  Typography,
  Alert,
  Snackbar,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
} from '@mui/material'
import { Archive, RotateCcw, Trash2, Lock } from 'lucide-react'
import dayjs, { type Dayjs } from 'dayjs'
import {
  ImportButton,
  PlannerCalendar,
  RacingPlanDataGrid,
  TimezoneSelector,
  useTimezone,
  LockInDialog,
  parseRacingPlanExcel,
  validateRaceTimes,
  archivePlan,
  getArchivedPlanByDate,
  getArchivedDates,
  hasArchivedPlan,
  deleteArchivedPlan,
  getTrackerData,
  lockInPlanEntries,
  type RacingPlanEntry,
  type ParseResult,
} from '@/modules/the-furlong'

export const Route = createFileRoute('/dashboard/the-furlong/planner')({
  component: PlannerPage,
})

function PlannerPage() {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs())
  const [plansByDate, setPlansByDate] = useState<Record<string, RacingPlanEntry[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [calendarExpanded, setCalendarExpanded] = useState(true)
  const [validating, setValidating] = useState(false)

  // Timezone state with persistence
  const { timezone, setTimezone } = useTimezone()

  // Date mismatch confirmation dialog state
  const [dateMismatchDialog, setDateMismatchDialog] = useState(false)
  const [pendingImport, setPendingImport] = useState<ParseResult | null>(null)

  // Bet Back column validation dialog state
  const [betBackColumnDialog, setBetBackColumnDialog] = useState(false)
  const [betBackColumn, setBetBackColumn] = useState('U')
  const pendingFileRef = useRef<File | null>(null)

  // Archive state
  const [archivedDates, setArchivedDates] = useState<string[]>([])
  const [archiveMenuAnchor, setArchiveMenuAnchor] = useState<null | HTMLElement>(null)
  const [archiveConfirmDialog, setArchiveConfirmDialog] = useState(false)
  const [restoreConfirmDialog, setRestoreConfirmDialog] = useState(false)
  const [deleteArchiveDialog, setDeleteArchiveDialog] = useState(false)

  // Lock-in state
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([])
  const [lockInDialogOpen, setLockInDialogOpen] = useState(false)

  // Load archived dates on mount
  useEffect(() => {
    setArchivedDates(getArchivedDates())
  }, [])

  const selectedDateStr = selectedDate?.format('YYYY-MM-DD') || ''
  const selectedDateDisplay = selectedDate?.format('dddd, MMMM D, YYYY') || ''

  const currentEntries = useMemo(
    () => plansByDate[selectedDateStr] || [],
    [plansByDate, selectedDateStr]
  )

  const datesWithPlans = useMemo(
    () => Object.keys(plansByDate).filter((date) => plansByDate[date].length > 0),
    [plansByDate]
  )

  // Get selected entries
  const selectedEntries = useMemo(
    () => currentEntries.filter((e) => selectedEntryIds.includes(e.id)),
    [currentEntries, selectedEntryIds]
  )

  // Get existing tracker count for this date
  const existingTrackerCount = useMemo(() => {
    const trackerData = getTrackerData(selectedDateStr)
    return trackerData?.entries.length || 0
  }, [selectedDateStr])

  // Clear selection when date changes
  useEffect(() => {
    setSelectedEntryIds([])
  }, [selectedDateStr])

  // Validate and update entries with API times
  const validateAndUpdateEntries = async (entries: RacingPlanEntry[], date: string) => {
    setValidating(true)
    try {
      const { validationResults, summary, correctedEntries } = await validateRaceTimes(entries, date)

      // Update entries with validation status and corrected times
      const validatedEntries = correctedEntries.map((entry) => {
        const validation = validationResults.get(entry.id)
        return {
          ...entry,
          timeValidationStatus: validation?.status || 'pending',
          apiTime: validation?.apiTime,
          timeDifferenceMinutes: validation?.timeDifferenceMinutes,
        } as RacingPlanEntry
      })

      // Update state with validated entries
      setPlansByDate((prev) => ({
        ...prev,
        [date]: validatedEntries,
      }))

      // Build success message
      let message = `Imported ${entries.length} entries.`
      if (summary.verified > 0) {
        message += ` ${summary.verified} times verified.`
      }
      if (summary.mismatches > 0) {
        message += ` ${summary.mismatches} times corrected from API.`
      }
      if (summary.notFound > 0) {
        message += ` ${summary.notFound} races not found in API.`
      }

      setSuccessMessage(message)
      setSuccess(true)
    } catch (err) {
      console.error('Validation error:', err)
      // Still save entries even if validation fails
      setPlansByDate((prev) => ({
        ...prev,
        [date]: entries.map((e) => ({ ...e, timeValidationStatus: 'pending' as const })),
      }))
      setSuccessMessage(`Imported ${entries.length} entries. Time validation unavailable.`)
      setSuccess(true)
    } finally {
      setValidating(false)
    }
  }

  const processImport = async (file: File, userBetBackColumn?: string) => {
    try {
      const result = await parseRacingPlanExcel(file,
        userBetBackColumn ? { betBackColumn: userBetBackColumn } : undefined
      )

      // If bet back column wasn't detected and user hasn't specified one, ask them
      if (!result.betBackColumnDetected && !userBetBackColumn) {
        pendingFileRef.current = file
        setBetBackColumnDialog(true)
        setLoading(false)
        return
      }

      // Check if file date differs from selected calendar date
      if (result.detectedDate && result.detectedDate !== selectedDateStr) {
        setPendingImport(result)
        setDateMismatchDialog(true)
        setLoading(false)
        return
      }

      // Import and validate times against API
      setLoading(false)
      await validateAndUpdateEntries(result.entries, selectedDateStr)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file')
      setLoading(false)
    }
  }

  const handleFileSelect = async (file: File) => {
    if (!selectedDate) return

    setLoading(true)
    setError(null)
    await processImport(file)
  }

  const handleBetBackColumnConfirm = async () => {
    setBetBackColumnDialog(false)
    if (!pendingFileRef.current) return

    setLoading(true)
    await processImport(pendingFileRef.current, betBackColumn)
    pendingFileRef.current = null
  }

  const handleBetBackColumnCancel = () => {
    setBetBackColumnDialog(false)
    pendingFileRef.current = null
  }

  const handleConfirmImport = async () => {
    if (!pendingImport) return

    setDateMismatchDialog(false)
    // Import and validate times against API
    await validateAndUpdateEntries(pendingImport.entries, selectedDateStr)
    setPendingImport(null)
  }

  const handleCancelImport = () => {
    setDateMismatchDialog(false)
    setPendingImport(null)
  }

  const handleToggleCalendar = () => {
    setCalendarExpanded((prev) => !prev)
  }

  // Handle entry updates (e.g., bookie selections)
  const handleEntriesChange = (updatedEntries: RacingPlanEntry[]) => {
    setPlansByDate((prev) => ({
      ...prev,
      [selectedDateStr]: updatedEntries,
    }))
  }

  const formatDetectedDate = (dateStr: string) => {
    return dayjs(dateStr).format('dddd, MMMM D, YYYY')
  }

  // Check if current date has an archive
  const currentDateHasArchive = hasArchivedPlan(selectedDateStr)
  const currentDateHasPlan = currentEntries.length > 0

  // Archive handlers
  const handleArchiveClick = (event: React.MouseEvent<HTMLElement>) => {
    setArchiveMenuAnchor(event.currentTarget)
  }

  const handleArchiveMenuClose = () => {
    setArchiveMenuAnchor(null)
  }

  const handleArchivePlan = () => {
    handleArchiveMenuClose()
    if (currentEntries.length === 0) {
      setError('No plan to archive for this date')
      return
    }
    setArchiveConfirmDialog(true)
  }

  const handleConfirmArchive = () => {
    setArchiveConfirmDialog(false)
    archivePlan(selectedDateStr, currentEntries)
    setArchivedDates(getArchivedDates())
    setSuccessMessage(`Archived plan for ${selectedDateDisplay}`)
    setSuccess(true)
  }

  const handleRestorePlan = () => {
    handleArchiveMenuClose()
    if (!currentDateHasArchive) {
      setError('No archived plan found for this date')
      return
    }
    // If there's already a plan, confirm before overwriting
    if (currentEntries.length > 0) {
      setRestoreConfirmDialog(true)
    } else {
      performRestore()
    }
  }

  const performRestore = () => {
    setRestoreConfirmDialog(false)
    const archived = getArchivedPlanByDate(selectedDateStr)
    if (archived) {
      setPlansByDate((prev) => ({
        ...prev,
        [selectedDateStr]: archived.entries,
      }))
      setSuccessMessage(`Restored archived plan for ${selectedDateDisplay}`)
      setSuccess(true)
    }
  }

  const handleDeleteArchive = () => {
    handleArchiveMenuClose()
    if (!currentDateHasArchive) {
      setError('No archived plan found for this date')
      return
    }
    setDeleteArchiveDialog(true)
  }

  const handleConfirmDeleteArchive = () => {
    setDeleteArchiveDialog(false)
    deleteArchivedPlan(selectedDateStr)
    setArchivedDates(getArchivedDates())
    setSuccessMessage(`Deleted archived plan for ${selectedDateDisplay}`)
    setSuccess(true)
  }

  // Lock-in handlers
  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedEntryIds(ids)
  }, [])

  const handleLockInClick = () => {
    if (selectedEntryIds.length === 0) {
      setError('Please select races to lock in')
      return
    }
    setLockInDialogOpen(true)
  }

  const handleLockInConfirm = (mode: 'append' | 'replace') => {
    lockInPlanEntries(selectedEntries, selectedDateStr, mode === 'append')
    setLockInDialogOpen(false)
    setSelectedEntryIds([])
    setSuccessMessage(`Locked in ${selectedEntries.length} race(s) to tracker`)
    setSuccess(true)

    // Navigate to tracker
    navigate({ to: '/dashboard/the-furlong/racing-tracker' })
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Planner
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, minHeight: 0 }}>
        {/* Calendar Section - Horizontal Collapsible */}
        <Box sx={{ flexShrink: 0 }}>
          <PlannerCalendar
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            datesWithPlans={datesWithPlans}
            expanded={calendarExpanded}
            onToggleExpand={handleToggleCalendar}
          />
        </Box>

        {/* Data Grid Section - Expands to fill available space */}
        <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Paper sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                {selectedDateDisplay}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TimezoneSelector
                  selectedDate={selectedDateStr}
                  value={timezone}
                  onChange={setTimezone}
                />

                {/* Lock-In Button */}
                <Tooltip title={selectedEntryIds.length > 0 ? `Lock in ${selectedEntryIds.length} race(s)` : 'Select races to lock in'}>
                  <span>
                    <Badge badgeContent={selectedEntryIds.length} color="primary">
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Lock size={16} />}
                        onClick={handleLockInClick}
                        disabled={selectedEntryIds.length === 0}
                      >
                        Lock In
                      </Button>
                    </Badge>
                  </span>
                </Tooltip>

                <Tooltip title="Archive options">
                  <IconButton
                    onClick={handleArchiveClick}
                    sx={{
                      color: currentDateHasArchive ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    <Archive size={20} />
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={archiveMenuAnchor}
                  open={Boolean(archiveMenuAnchor)}
                  onClose={handleArchiveMenuClose}
                >
                  <MenuItem onClick={handleArchivePlan} disabled={!currentDateHasPlan}>
                    <ListItemIcon>
                      <Archive size={18} />
                    </ListItemIcon>
                    <ListItemText>
                      {currentDateHasArchive ? 'Update Archive' : 'Archive Plan'}
                    </ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleRestorePlan} disabled={!currentDateHasArchive}>
                    <ListItemIcon>
                      <RotateCcw size={18} />
                    </ListItemIcon>
                    <ListItemText>Restore from Archive</ListItemText>
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleDeleteArchive} disabled={!currentDateHasArchive}>
                    <ListItemIcon>
                      <Trash2 size={18} color="#d32f2f" />
                    </ListItemIcon>
                    <ListItemText sx={{ color: 'error.main' }}>Delete Archive</ListItemText>
                  </MenuItem>
                </Menu>
                <ImportButton onFileSelect={handleFileSelect} loading={loading} />
              </Box>
            </Box>

            <Box sx={{ flexGrow: 1 }}>
              <RacingPlanDataGrid
                entries={currentEntries}
                selectedDate={selectedDateDisplay}
                selectedDateISO={selectedDateStr}
                timezone={timezone}
                onEntriesChange={handleEntriesChange}
                selectable
                selectedIds={selectedEntryIds}
                onSelectionChange={handleSelectionChange}
              />
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Bet Back Column Validation Dialog */}
      <Dialog open={betBackColumnDialog} onClose={handleBetBackColumnCancel}>
        <DialogTitle>Specify Bet Back Column</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Could not automatically detect the "Bet Back Options" column header in the Excel file.
          </DialogContentText>
          <DialogContentText sx={{ mt: 1 }}>
            Please enter the column letter where the Bet Back Options section starts (e.g., "U"):
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Column Letter"
            value={betBackColumn}
            onChange={(e) => setBetBackColumn(e.target.value.toUpperCase())}
            placeholder="U"
            sx={{ mt: 2, width: 120 }}
            inputProps={{ maxLength: 2, style: { textTransform: 'uppercase' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleBetBackColumnCancel} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleBetBackColumnConfirm}
            variant="contained"
            disabled={!betBackColumn.match(/^[A-Z]{1,2}$/)}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Date Mismatch Confirmation Dialog */}
      <Dialog open={dateMismatchDialog} onClose={handleCancelImport}>
        <DialogTitle>Date Mismatch Detected</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The file <strong>{pendingImport?.fileName}</strong> appears to be for{' '}
            <strong>{pendingImport?.detectedDate ? formatDetectedDate(pendingImport.detectedDate) : 'unknown date'}</strong>,
            but you have selected <strong>{selectedDateDisplay}</strong> on the calendar.
          </DialogContentText>
          <DialogContentText sx={{ mt: 2 }}>
            Do you want to import this data to the selected calendar date ({selectedDateDisplay})?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelImport} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmImport} variant="contained" autoFocus>
            Import to {selectedDate?.format('MMM D')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveConfirmDialog} onClose={() => setArchiveConfirmDialog(false)}>
        <DialogTitle>Archive Plan</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {currentDateHasArchive
              ? `This will update the existing archive for ${selectedDateDisplay}. The previous archive will be replaced.`
              : `Archive the current plan for ${selectedDateDisplay}? You can restore it later if needed.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveConfirmDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmArchive} variant="contained" autoFocus>
            {currentDateHasArchive ? 'Update Archive' : 'Archive'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreConfirmDialog} onClose={() => setRestoreConfirmDialog(false)}>
        <DialogTitle>Restore from Archive</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will replace the current plan with the archived version. Any unsaved changes will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreConfirmDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={performRestore} variant="contained" color="warning" autoFocus>
            Restore
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Archive Confirmation Dialog */}
      <Dialog open={deleteArchiveDialog} onClose={() => setDeleteArchiveDialog(false)}>
        <DialogTitle>Delete Archive</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the archived plan for {selectedDateDisplay}? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteArchiveDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmDeleteArchive} variant="contained" color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lock-In Dialog */}
      <LockInDialog
        open={lockInDialogOpen}
        onClose={() => setLockInDialogOpen(false)}
        onConfirm={handleLockInConfirm}
        selectedEntries={selectedEntries}
        date={selectedDateStr}
        dateDisplay={selectedDateDisplay}
        existingTrackerCount={existingTrackerCount}
      />

      <Snackbar
        open={success}
        autoHideDuration={5000}
        onClose={() => setSuccess(false)}
        message={successMessage || `Successfully imported ${currentEntries.length} entries for ${selectedDateDisplay}`}
      />

      {/* Validating overlay */}
      <Snackbar
        open={validating}
        message="Validating race times against PuntingForm API..."
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
