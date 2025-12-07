import { createFileRoute } from '@tanstack/react-router'
import { Container, Typography, Box, Button, Stack } from '@mui/material'
import { Header } from '@/components/layout/Header'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <Box className="min-h-screen bg-gray-50">
      <Header />

      <Box className="pt-16">
        <Container maxWidth="lg" className="py-16">
          <Stack spacing={4} alignItems="center" className="text-center">
            <Typography
              variant="h2"
              component="h1"
              sx={{ fontWeight: 700 }}
            >
              Matched Betting Made Simple
            </Typography>

            <Typography
              variant="h5"
              color="text.secondary"
              sx={{ maxWidth: 600 }}
            >
              Track your bets, manage your bankroll, and scale your matched betting operations with confidence.
            </Typography>

            <Stack direction="row" spacing={2} className="pt-4">
              <Button
                variant="contained"
                size="large"
                href="/login"
                sx={{ textTransform: 'none', px: 4 }}
              >
                Get Started
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={{ textTransform: 'none', px: 4 }}
              >
                Learn More
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  )
}
