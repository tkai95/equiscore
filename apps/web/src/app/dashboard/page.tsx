import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { DashboardOverview } from '@/components/dashboard/dashboard-overview'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  return <DashboardOverview />
}
