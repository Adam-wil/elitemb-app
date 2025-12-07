import { createFileRoute } from '@tanstack/react-router'
import { Box, Typography, Paper } from '@mui/material'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Dashboard
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Welcome to your EliteMB dashboard.
        </Typography>
      </Paper>
    </Box>
  )
}
