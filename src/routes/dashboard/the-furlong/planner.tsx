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
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import { Archive, RotateCcw, Trash2, Lock, HelpCircle, Calendar } from 'lucide-react'
import dayjs, { type Dayjs } from 'dayjs'
import {
  ImportButton,
  PlannerCalendar,
  RacingPlanDataGrid,
  TimezoneSelector,
  useTimezone,
  LockInDialog,
  MobileCalendarDrawer,
  MobilePlannerBottomNav,
  DEFAULT_STATE_COMMISSIONS,
  parseRacingPlanExcel,
  getSupportedDateFormats,
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

// Storage key for persisting planner session
const PLANNER_SESSION_KEY = 'elitemb-planner-session'

// Load plans from localStorage
function loadPlannerSession(): Record<string, RacingPlanEntry[]> {
  try {
    const stored = localStorage.getItem(PLANNER_SESSION_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (err) {
    console.error('Failed to load planner session:', err)
  }
  return {}
}

// Save plans to localStorage
function savePlannerSession(plans: Record<string, RacingPlanEntry[]>) {
  try {
    localStorage.setItem(PLANNER_SESSION_KEY, JSON.stringify(plans))
  } catch (err) {
    console.error('Failed to save planner session:', err)
  }
}

function PlannerPage() {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs())
  const [plansByDate, setPlansByDate] = useState<Record<string, RacingPlanEntry[]>>(loadPlannerSession)
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

  // Mobile detection and state
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileCalendarOpen, setMobileCalendarOpen] = useState(false)
  const mobileFileInputRef = useRef<HTMLInputElement>(null)

  // Load archived dates on mount
  useEffect(() => {
    setArchivedDates(getArchivedDates())
  }, [])

  // Save plans to localStorage whenever they change
  useEffect(() => {
    savePlannerSession(plansByDate)
  }, [plansByDate])

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

  // Get count of selectable entries (non-skipped races)
  const totalSelectableCount = useMemo(() => {
    return currentEntries.filter((e) => !e.skip).length
  }, [currentEntries])

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

      // Check if file date differs from selected calendar date OR if no date could be detected
      if (!result.detectedDate || result.detectedDate !== selectedDateStr) {
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
    // Pass state commissions to auto-populate Comm% based on track location
    lockInPlanEntries(selectedEntries, selectedDateStr, mode === 'append', DEFAULT_STATE_COMMISSIONS)
    setLockInDialogOpen(false)
    setSelectedEntryIds([])
    setSuccessMessage(`Locked in ${selectedEntries.length} race(s) to tracker`)
    setSuccess(true)

    // Navigate to tracker
    navigate({ to: '/dashboard/the-furlong/racing-tracker' })
  }

  // Mobile file input handler
  const handleMobileFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      await handleFileSelect(file)
    }
    // Reset input so same file can be selected again
    event.target.value = ''
  }

  const handleMobileImportClick = () => {
    mobileFileInputRef.current?.click()
  }

  return (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      // Add bottom padding on mobile for bottom navigation
      pb: isMobile ? '80px' : 0,
    }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: isMobile ? 2 : 3 }}>
        Planner
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, minHeight: 0 }}>
        {/* Calendar Section - Desktop only, Horizontal Collapsible */}
        {!isMobile && (
          <Box sx={{ flexShrink: 0 }}>
            <PlannerCalendar
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              datesWithPlans={datesWithPlans}
              expanded={calendarExpanded}
              onToggleExpand={handleToggleCalendar}
            />
          </Box>
        )}

        {/* Data Grid Section - Expands to fill available space */}
        <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Paper sx={{ p: isMobile ? 1.5 : 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Header - Different layout for mobile vs desktop */}
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              flexWrap: isMobile ? 'wrap' : 'nowrap',
              gap: isMobile ? 1 : 0,
            }}>
              {/* Date display with calendar button on mobile */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isMobile && (
                  <Button
                    onClick={() => setMobileCalendarOpen(true)}
                    variant="outlined"
                    size="small"
                    startIcon={<Calendar size={16} />}
                    sx={{
                      borderColor: '#d1d5db',
                      color: '#374151',
                      backgroundColor: '#fff',
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 1.5,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      '&:hover': {
                        backgroundColor: '#f9fafb',
                        borderColor: '#3b82f6',
                      },
                      '&:active': {
                        backgroundColor: '#eff6ff',
                      },
                    }}
                  >
                    {selectedDate?.format('ddd, MMM D')}
                  </Button>
                )}
                {!isMobile && (
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    {selectedDateDisplay}
                  </Typography>
                )}
              </Box>

              {/* Desktop toolbar */}
              {!isMobile && (
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
                  <ImportButton onFileSelect={handleFileSelect} loading={loading} />
                </Box>
              )}

              {/* Mobile timezone selector - compact */}
              {isMobile && (
                <TimezoneSelector
                  selectedDate={selectedDateStr}
                  value={timezone}
                  onChange={setTimezone}
                />
              )}
            </Box>

            {/* Archive Menu - shared between mobile and desktop */}
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

            <Box sx={{ flexGrow: 1, position: 'relative' }}>
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

              {/* Loading Overlay */}
              {(loading || validating) && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1000,
                    borderRadius: 1,
                  }}
                >
                  <CircularProgress size={48} thickness={4} sx={{ mb: 2 }} />
                  <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {loading ? 'Importing racing plan...' : 'Validating race times...'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobilePlannerBottomNav
          onCalendarOpen={() => setMobileCalendarOpen(true)}
          onLockInClick={handleLockInClick}
          onArchiveClick={handleArchiveClick}
          onImportClick={handleMobileImportClick}
          selectedCount={selectedEntryIds.length}
          hasArchive={currentDateHasArchive}
          loading={loading}
        />
      )}

      {/* Mobile Calendar Drawer */}
      {isMobile && (
        <MobileCalendarDrawer
          open={mobileCalendarOpen}
          onClose={() => setMobileCalendarOpen(false)}
          onOpen={() => setMobileCalendarOpen(true)}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          datesWithPlans={datesWithPlans}
        />
      )}

      {/* Hidden file input for mobile import */}
      <input
        type="file"
        ref={mobileFileInputRef}
        style={{ display: 'none' }}
        accept=".xlsx,.xls"
        onChange={handleMobileFileChange}
      />

      {/* Bet Back Column Validation Dialog */}
      <Dialog open={betBackColumnDialog} onClose={handleBetBackColumnCancel}>
        <DialogTitle>Which column has Bet Back Options?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            We couldn't find the "Bet Back Options" column automatically.
          </DialogContentText>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <DialogContentText sx={{ fontWeight: 500, mb: 0 }}>
              Please tell me which column the Bet Back Options start in:
            </DialogContentText>
            <Tooltip
              title="Look at your Excel file and find the column letter (like U, V, or W) where 'Bet Back Options' begins."
              arrow
              placement="right"
            >
              <IconButton size="small" sx={{ color: 'primary.main' }}>
                <HelpCircle size={18} />
              </IconButton>
            </Tooltip>
          </Box>
          <TextField
            autoFocus
            margin="dense"
            label="Column Letter"
            value={betBackColumn}
            onChange={(e) => setBetBackColumn(e.target.value.trim().toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && betBackColumn.match(/^[A-Z]{1,2}$/)) {
                e.preventDefault()
                handleBetBackColumnConfirm()
              }
            }}
            placeholder="U"
            helperText="Examples: U, V, W, AA, AB"
            sx={{ mt: 2, width: 160 }}
            inputProps={{ maxLength: 3, style: { textTransform: 'uppercase' } }}
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
          {pendingImport?.detectedDate ? (
            <>
              <DialogContentText>
                The file <strong>{pendingImport?.fileName}</strong> appears to be for{' '}
                <strong>{formatDetectedDate(pendingImport.detectedDate)}</strong>,
                but you have selected <strong>{selectedDateDisplay}</strong> on the calendar.
              </DialogContentText>
              <DialogContentText sx={{ mt: 2 }}>
                Do you want to import this data to the selected calendar date ({selectedDateDisplay})?
              </DialogContentText>
            </>
          ) : (
            <>
              <DialogContentText>
                Could not detect a date from the filename <strong>{pendingImport?.fileName}</strong>.
              </DialogContentText>
              <DialogContentText sx={{ mt: 2 }}>
                <strong>Supported filename formats:</strong>
              </DialogContentText>
              <DialogContentText component="div" sx={{ mt: 1, pl: 2 }}>
                {getSupportedDateFormats().map((format, idx) => (
                  <div key={idx}>• {format}</div>
                ))}
              </DialogContentText>
              <DialogContentText sx={{ mt: 2 }}>
                Do you want to import this file to the selected calendar date ({selectedDateDisplay})?
              </DialogContentText>
            </>
          )}
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
        totalSelectableCount={totalSelectableCount}
      />

      <Snackbar
        open={success}
        autoHideDuration={5000}
        onClose={() => setSuccess(false)}
        message={successMessage || `Successfully imported ${currentEntries.length} entries for ${selectedDateDisplay}`}
      />
    </Box>
  )
}
