import { useState, useMemo, useCallback, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
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
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  TextField,
  InputAdornment,
} from '@mui/material'
import { Archive, RotateCcw, Trash2, Settings } from 'lucide-react'
import dayjs, { type Dayjs } from 'dayjs'
import {
  PlannerCalendar,
  TrackerDataGrid,
  TimezoneSelector,
  useTimezone,
  PollingIndicator,
  TrackerSidePanel,
  DEFAULT_AGGREGATE_COLUMNS,
  type AggregateColumn,
  useTrackerData,
  useResultPolling,
  archiveTrackerDay,
  restoreTrackerFromArchive,
  deleteArchivedTracker,
  hasArchivedTracker,
  getArchivedTrackerDates,
  getDefaultCommissionRate,
  setDefaultCommissionRate,
  createDefaultSummary,
  type TrackedRaceEntry,
  type RaceResultData,
  type RaceOutcome,
} from '@/modules/the-furlong'

export const Route = createFileRoute('/dashboard/the-furlong/racing-tracker')({
  component: RacingTrackerPage,
})

function RacingTrackerPage() {
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [calendarExpanded, setCalendarExpanded] = useState(true)
  const [pollingEnabled, setPollingEnabled] = useState(true)

  // Timezone state with persistence
  const { timezone, setTimezone } = useTimezone()

  // Archive state
  const [archivedDates, setArchivedDates] = useState<string[]>([])
  const [archiveMenuAnchor, setArchiveMenuAnchor] = useState<null | HTMLElement>(null)
  const [archiveConfirmDialog, setArchiveConfirmDialog] = useState(false)
  const [restoreConfirmDialog, setRestoreConfirmDialog] = useState(false)
  const [deleteArchiveDialog, setDeleteArchiveDialog] = useState(false)

  // Commission settings dialog
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false)
  const [defaultCommission, setDefaultCommission] = useState(getDefaultCommissionRate())

  // Side panel state
  const [sidePanelExpanded, setSidePanelExpanded] = useState(true)
  const [aggregateColumns, setAggregateColumns] = useState<AggregateColumn[]>(DEFAULT_AGGREGATE_COLUMNS)

  const selectedDateStr = selectedDate?.format('YYYY-MM-DD') || ''
  const selectedDateDisplay = selectedDate?.format('dddd, MMMM D, YYYY') || ''

  // Use tracker data hook
  const {
    data: trackerData,
    entries,
    updateEntry,
    updateResult,
    refresh,
    datesWithData,
  } = useTrackerData({ date: selectedDateStr })

  // Load archived dates on mount
  useEffect(() => {
    setArchivedDates(getArchivedTrackerDates())
  }, [])

  // Result update handler
  const handleResultUpdate = useCallback(
    (entryId: string, result: RaceResultData, outcome: RaceOutcome) => {
      updateResult(entryId, result, outcome)
    },
    [updateResult]
  )

  // Error handler for polling
  const handlePollingError = useCallback((entryId: string, error: Error) => {
    console.error(`Polling error for entry ${entryId}:`, error)
  }, [])

  // Use result polling hook
  const { status: pollingStatus, pollSingleRace } = useResultPolling({
    date: selectedDateStr,
    entries,
    enabled: pollingEnabled && entries.length > 0,
    intervalMs: 90000, // 1.5 minutes
    raceDelayMinutes: 2, // Wait 2 mins after race time before polling
    onResultUpdate: handleResultUpdate,
    onError: handlePollingError,
  })

  // Handle entry update
  const handleEntryUpdate = useCallback(
    (entryId: string, updates: Partial<TrackedRaceEntry>) => {
      updateEntry(entryId, updates)
    },
    [updateEntry]
  )

  // Handle manual refresh of single race result
  const handleRefreshResult = useCallback(
    async (entryId: string): Promise<RaceResultData | null> => {
      return await pollSingleRace(entryId)
    },
    [pollSingleRace]
  )

  const handleToggleCalendar = () => {
    setCalendarExpanded((prev) => !prev)
  }

  const handleTogglePolling = () => {
    setPollingEnabled((prev) => !prev)
  }

  const handleToggleSidePanel = () => {
    setSidePanelExpanded((prev) => !prev)
  }

  const handleToggleAggregate = (columnId: string) => {
    setAggregateColumns((prev) =>
      prev.map((col) => (col.id === columnId ? { ...col, enabled: !col.enabled } : col))
    )
  }

  // Get enabled aggregate column IDs
  const enabledAggregates = useMemo(
    () => aggregateColumns.filter((col) => col.enabled).map((col) => col.id),
    [aggregateColumns]
  )

  // Check if current date has an archive
  const currentDateHasArchive = hasArchivedTracker(selectedDateStr)
  const currentDateHasData = entries.length > 0

  // Archive handlers
  const handleArchiveClick = (event: React.MouseEvent<HTMLElement>) => {
    setArchiveMenuAnchor(event.currentTarget)
  }

  const handleArchiveMenuClose = () => {
    setArchiveMenuAnchor(null)
  }

  const handleArchiveTracker = () => {
    handleArchiveMenuClose()
    if (entries.length === 0) {
      setError('No tracker data to archive for this date')
      return
    }
    setArchiveConfirmDialog(true)
  }

  const handleConfirmArchive = () => {
    setArchiveConfirmDialog(false)
    archiveTrackerDay(selectedDateStr)
    setArchivedDates(getArchivedTrackerDates())
    setSuccessMessage(`Archived tracker for ${selectedDateDisplay}`)
    setSuccess(true)
  }

  const handleRestoreTracker = () => {
    handleArchiveMenuClose()
    if (!currentDateHasArchive) {
      setError('No archived tracker found for this date')
      return
    }
    if (entries.length > 0) {
      setRestoreConfirmDialog(true)
    } else {
      performRestore()
    }
  }

  const performRestore = () => {
    setRestoreConfirmDialog(false)
    restoreTrackerFromArchive(selectedDateStr)
    refresh()
    setSuccessMessage(`Restored archived tracker for ${selectedDateDisplay}`)
    setSuccess(true)
  }

  const handleDeleteArchive = () => {
    handleArchiveMenuClose()
    if (!currentDateHasArchive) {
      setError('No archived tracker found for this date')
      return
    }
    setDeleteArchiveDialog(true)
  }

  const handleConfirmDeleteArchive = () => {
    setDeleteArchiveDialog(false)
    deleteArchivedTracker(selectedDateStr)
    setArchivedDates(getArchivedTrackerDates())
    setSuccessMessage(`Deleted archived tracker for ${selectedDateDisplay}`)
    setSuccess(true)
  }

  // Commission settings handlers
  const handleCommissionSave = () => {
    setDefaultCommissionRate(defaultCommission)
    setCommissionDialogOpen(false)
    setSuccessMessage(`Default commission set to ${defaultCommission}%`)
    setSuccess(true)
  }

  // Summary data
  const summary = trackerData?.summary || createDefaultSummary()
  const totalProfit = trackerData?.totalProfit || 0

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Racing Tracker
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, minHeight: 0 }}>
        {/* Calendar Section */}
        <Box sx={{ flexShrink: 0 }}>
          <PlannerCalendar
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            datesWithPlans={datesWithData}
            expanded={calendarExpanded}
            onToggleExpand={handleToggleCalendar}
          />
        </Box>

        {/* Tracker Section */}
        <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Paper sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Toolbar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  {selectedDateDisplay}
                </Typography>
                <PollingIndicator status={pollingStatus} onToggle={handleTogglePolling} />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TimezoneSelector
                  selectedDate={selectedDateStr}
                  value={timezone}
                  onChange={setTimezone}
                />

                <Tooltip title="Commission settings">
                  <IconButton onClick={() => setCommissionDialogOpen(true)}>
                    <Settings size={20} />
                  </IconButton>
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
                  <MenuItem onClick={handleArchiveTracker} disabled={!currentDateHasData}>
                    <ListItemIcon>
                      <Archive size={18} />
                    </ListItemIcon>
                    <ListItemText>
                      {currentDateHasArchive ? 'Update Archive' : 'Archive Tracker'}
                    </ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleRestoreTracker} disabled={!currentDateHasArchive}>
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
              </Box>
            </Box>

            {/* Data Grid */}
            <Box sx={{ flexGrow: 1 }}>
              <TrackerDataGrid
                entries={entries}
                selectedDate={selectedDateDisplay}
                selectedDateISO={selectedDateStr}
                timezone={timezone}
                onEntryUpdate={handleEntryUpdate}
                onRefreshResult={handleRefreshResult}
                isPolling={pollingStatus.isPolling}
                enabledAggregates={enabledAggregates}
              />
            </Box>
          </Paper>
        </Box>

        {/* Side Panel */}
        <Box sx={{ flexShrink: 0 }}>
          <TrackerSidePanel
            expanded={sidePanelExpanded}
            onToggleExpand={handleToggleSidePanel}
            totalProfit={totalProfit}
            summary={summary}
            aggregateColumns={aggregateColumns}
            onToggleAggregate={handleToggleAggregate}
          />
        </Box>
      </Box>

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveConfirmDialog} onClose={() => setArchiveConfirmDialog(false)}>
        <DialogTitle>Archive Tracker</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {currentDateHasArchive
              ? `This will update the existing archive for ${selectedDateDisplay}. The previous archive will be replaced.`
              : `Archive the tracker data for ${selectedDateDisplay}? You can restore it later if needed.`}
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
            This will replace the current tracker data with the archived version. Any unsaved
            changes will be lost.
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
            Are you sure you want to delete the archived tracker for {selectedDateDisplay}? This
            cannot be undone.
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

      {/* Commission Settings Dialog */}
      <Dialog open={commissionDialogOpen} onClose={() => setCommissionDialogOpen(false)}>
        <DialogTitle>Commission Settings</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Set your default Betfair commission rate. This will be applied to new races when locked
            in. You can still override it per race in the tracker.
          </DialogContentText>
          <TextField
            label="Default Commission Rate"
            type="number"
            value={defaultCommission}
            onChange={(e) => setDefaultCommission(Number(e.target.value) || 0)}
            inputProps={{ step: 0.5, min: 0, max: 100 }}
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            }}
            fullWidth
            helperText="e.g., 5 for 5%, 2.5 for half-price specials"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommissionDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleCommissionSave} variant="contained" autoFocus>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={success}
        autoHideDuration={5000}
        onClose={() => setSuccess(false)}
        message={successMessage}
      />
    </Box>
  )
}
