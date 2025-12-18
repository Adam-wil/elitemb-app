import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Box } from '@mui/material'
import { ConnectionSetup } from '@/modules/accounts/components'

export const Route = createFileRoute('/dashboard/accounts/setup')({
  component: AccountsSetupPage,
})

function AccountsSetupPage() {
  const navigate = useNavigate()

  const handleComplete = () => {
    navigate({ to: '/dashboard/accounts/overview' })
  }

  return (
    <Box sx={{ p: 3 }}>
      <ConnectionSetup onComplete={handleComplete} />
    </Box>
  )
}
