'use client'

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  FormControlLabel,
  Radio,
  RadioGroup,
} from '@mui/material'
import { Lock, AlertTriangle } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import type { RacingPlanEntry } from '../types'

interface LockInDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (mode: 'append' | 'replace') => void
  selectedEntries: RacingPlanEntry[]
  date: string
  dateDisplay: string
  existingTrackerCount: number
  totalSelectableCount?: number
}

export function LockInDialog({
  open,
  onClose,
  onConfirm,
  selectedEntries,
  date,
  dateDisplay,
  existingTrackerCount,
  totalSelectableCount = 0,
}: LockInDialogProps) {
  const [mode, setMode] = useState<'append' | 'replace'>('append')

  // Check for time sequence issues
  const sortedByTime = [...selectedEntries].sort((a, b) => a.time.localeCompare(b.time))
  const isOutOfSequence = selectedEntries.some((entry, idx) => {
    const sortedIdx = sortedByTime.findIndex((e) => e.id === entry.id)
    return sortedIdx !== idx
  })

  // Check for entries without bookie selections
  const entriesWithoutBookies = selectedEntries.filter(
    (e) => e.selectedNormalBookies.length === 0 && e.selectedBetBackBookies.length === 0
  )

  // Check for unselected races
  const unselectedCount = totalSelectableCount - selectedEntries.length

  const handleConfirm = useCallback(() => {
    onConfirm(mode)
    onClose()
  }, [mode, onConfirm, onClose])

  // Handle Enter key to submit
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleConfirm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handleConfirm])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Lock size={20} />
        Lock In Races
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Lock in {selectedEntries.length} race(s) for {dateDisplay} to the tracker.
        </Typography>

        {/* Warnings */}
        {isOutOfSequence && (
          <Alert severity="warning" sx={{ mb: 2 }} icon={<AlertTriangle size={18} />}>
            Selected races are out of time sequence. They will be sorted by time in the tracker.
          </Alert>
        )}

        {entriesWithoutBookies.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {entriesWithoutBookies.length} race(s) have no bookie selections. You can add bet
            details in the tracker.
          </Alert>
        )}

        {unselectedCount > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }} icon={<AlertTriangle size={18} />}>
            {unselectedCount} race(s) are not selected and will not be locked in. Review the planner to ensure you haven't missed any races.
          </Alert>
        )}

        {/* Existing tracker warning */}
        {existingTrackerCount > 0 && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="info" sx={{ mb: 1 }}>
              The tracker already has {existingTrackerCount} race(s) for this date.
            </Alert>
            <RadioGroup value={mode} onChange={(e) => setMode(e.target.value as 'append' | 'replace')}>
              <FormControlLabel
                value="append"
                control={<Radio size="small" />}
                label={
                  <Typography variant="body2">
                    Append - Add to existing races (skip duplicates)
                  </Typography>
                }
              />
              <FormControlLabel
                value="replace"
                control={<Radio size="small" />}
                label={
                  <Typography variant="body2">
                    Replace - Clear existing and add new races
                  </Typography>
                }
              />
            </RadioGroup>
          </Box>
        )}

        {/* Race list preview */}
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Races to lock in:
        </Typography>
        <Box
          sx={{
            maxHeight: 200,
            overflow: 'auto',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <List dense disablePadding>
            {sortedByTime.map((entry, idx) => (
              <Box key={entry.id}>
                {idx > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography variant="body2" fontWeight={500}>
                          {entry.time}
                        </Typography>
                        <Typography variant="body2">{entry.track}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          R{entry.raceNumber}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {entry.selectedNormalBookies.length > 0 && (
                          <>Normal: {entry.selectedNormalBookies.join(', ')}</>
                        )}
                        {entry.selectedNormalBookies.length > 0 &&
                          entry.selectedBetBackBookies.length > 0 &&
                          ' | '}
                        {entry.selectedBetBackBookies.length > 0 && (
                          <>Bet Back: {entry.selectedBetBackBookies.join(', ')}</>
                        )}
                      </Typography>
                    }
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          startIcon={<Lock size={16} />}
          autoFocus
        >
          Lock In {selectedEntries.length} Race{selectedEntries.length !== 1 ? 's' : ''}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
