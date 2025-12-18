import { createFileRoute } from '@tanstack/react-router'
import { AccountsDashboard } from '@/modules/accounts/components'

export const Route = createFileRoute('/dashboard/accounts/overview')({
  component: AccountsOverviewPage,
})

function AccountsOverviewPage() {
  return <AccountsDashboard />
}
