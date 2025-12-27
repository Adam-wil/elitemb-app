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
  useTheme,
  useMediaQuery,
} from '@mui/material'
import { Archive, RotateCcw, Trash2 } from 'lucide-react'
import dayjs, { type Dayjs } from 'dayjs'
import {
  PlannerCalendar,
  TrackerDataGrid,
  TimezoneSelector,
  useTimezone,
  PollingIndicator,
  TrackerSidePanel,
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_STATE_COMMISSIONS,
  type ColumnVisibility,
  type StateCommission,
  useTrackerData,
  useResultPolling,
  archiveTrackerDay,
  restoreTrackerFromArchive,
  deleteArchivedTracker,
  hasArchivedTracker,
  getArchivedTrackerDates,
  type TrackedRaceEntry,
  type RaceResultData,
  type RaceOutcome,
  MobileBottomNav,
  MobileCalendarDrawer,
  MobileSettingsDrawer,
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

  // Side panel state
  const [sidePanelExpanded, setSidePanelExpanded] = useState(true)
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility[]>(DEFAULT_COLUMN_VISIBILITY)
  const [stateCommissions, setStateCommissions] = useState<StateCommission[]>(DEFAULT_STATE_COMMISSIONS)

  // Mobile responsive
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [calendarDrawerOpen, setCalendarDrawerOpen] = useState(false)
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false)

  const selectedDateStr = selectedDate?.format('YYYY-MM-DD') || ''
  const selectedDateDisplay = selectedDate?.format('dddd, MMMM D, YYYY') || ''

  // Use tracker data hook
  const {
    data: trackerData,
    entries,
    addEntry,
    addEntryAbove,
    updateEntry,
    removeEntry,
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

  const handleToggleColumn = (columnId: string) => {
    setColumnVisibility((prev) =>
      prev.map((col) => (col.id === columnId ? { ...col, visible: !col.visible } : col))
    )
  }

  const handleUpdateStateCommission = (stateId: string, rate: number) => {
    setStateCommissions((prev) =>
      prev.map((state) => (state.id === stateId ? { ...state, rate } : state))
    )
  }

  // Convert column visibility array to model object for DataGrid
  const columnVisibilityModel = useMemo(
    () => Object.fromEntries(columnVisibility.map((col) => [col.id, col.visible])),
    [columnVisibility]
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

  // Mobile Layout
  if (isMobile) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', pb: '80px' }}>
        {/* Header */}
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
          No Lay Race Manager
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Mobile Toolbar */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
            p: 1.5,
            backgroundColor: '#f9fafb',
            borderRadius: 2,
            border: '1px solid #e5e7eb',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '0.9375rem' }}>
              {selectedDate?.format('ddd, MMM D')}
            </Typography>
            <PollingIndicator status={pollingStatus} onToggle={handleTogglePolling} />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Archive options">
              <IconButton
                onClick={handleArchiveClick}
                size="small"
                sx={{
                  color: currentDateHasArchive ? 'primary.main' : 'text.secondary',
                }}
              >
                <Archive size={18} />
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

        {/* Data Grid - Mobile */}
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          <TrackerDataGrid
            entries={entries}
            selectedDate={selectedDateDisplay}
            selectedDateISO={selectedDateStr}
            timezone={timezone}
            onEntryUpdate={handleEntryUpdate}
            onRefreshResult={handleRefreshResult}
            onAddEntry={addEntry}
            onAddEntryAbove={addEntryAbove}
            onDeleteEntry={removeEntry}
            isPolling={pollingStatus.isPolling}
            columnVisibility={columnVisibilityModel}
            stateCommissions={stateCommissions}
          />
        </Box>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          onCalendarClick={() => setCalendarDrawerOpen(true)}
          onSettingsClick={() => setSettingsDrawerOpen(true)}
          onAddClick={() => addEntry()}
          hasCalendarData={datesWithData.length > 0}
        />

        {/* Mobile Calendar Drawer */}
        <MobileCalendarDrawer
          open={calendarDrawerOpen}
          onClose={() => setCalendarDrawerOpen(false)}
          onOpen={() => setCalendarDrawerOpen(true)}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          datesWithPlans={datesWithData}
        />

        {/* Mobile Settings Drawer */}
        <MobileSettingsDrawer
          open={settingsDrawerOpen}
          onClose={() => setSettingsDrawerOpen(false)}
          onOpen={() => setSettingsDrawerOpen(true)}
          columnVisibility={columnVisibility}
          onToggleColumn={handleToggleColumn}
          stateCommissions={stateCommissions}
          onUpdateStateCommission={handleUpdateStateCommission}
        />

        {/* Dialogs */}
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

        <Snackbar
          open={success}
          autoHideDuration={5000}
          onClose={() => setSuccess(false)}
          message={successMessage}
        />
      </Box>
    )
  }

  // Desktop Layout
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        No Lay Race Manager
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
          <Paper
            elevation={0}
            sx={{
              p: 2,
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              border: '1.5px solid #d1d5db',
              borderRadius: 1,
            }}
          >
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
                onAddEntry={addEntry}
                onAddEntryAbove={addEntryAbove}
                onDeleteEntry={removeEntry}
                isPolling={pollingStatus.isPolling}
                columnVisibility={columnVisibilityModel}
                stateCommissions={stateCommissions}
              />
            </Box>
          </Paper>
        </Box>

        {/* Side Panel */}
        <Box sx={{ flexShrink: 0 }}>
          <TrackerSidePanel
            expanded={sidePanelExpanded}
            onToggleExpand={handleToggleSidePanel}
            columnVisibility={columnVisibility}
            onToggleColumn={handleToggleColumn}
            stateCommissions={stateCommissions}
            onUpdateStateCommission={handleUpdateStateCommission}
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

      <Snackbar
        open={success}
        autoHideDuration={5000}
        onClose={() => setSuccess(false)}
        message={successMessage}
      />
    </Box>
  )
}
