import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from '@mui/material'
import type { RacingPlanEntry } from '../types'

interface PlanningTableProps {
  entries: RacingPlanEntry[]
}

export function PlanningTable({ entries }: PlanningTableProps) {
  if (entries.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No racing plan data. Import an Excel file to get started.
        </Typography>
      </Paper>
    )
  }

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'grey.100' }}>
            <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Course</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Race</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Horse</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Odds</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Stake</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Bookmaker</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id} hover>
              <TableCell>{entry.date}</TableCell>
              <TableCell>{entry.time}</TableCell>
              <TableCell>{entry.course}</TableCell>
              <TableCell>{entry.raceName}</TableCell>
              <TableCell sx={{ fontWeight: 500 }}>{entry.horse}</TableCell>
              <TableCell>{entry.odds ?? '-'}</TableCell>
              <TableCell>{entry.stake ? `£${entry.stake}` : '-'}</TableCell>
              <TableCell>{entry.bookmaker || '-'}</TableCell>
              <TableCell>{entry.notes || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
