import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { GoalsView } from '@/components/goals/goals-view'
import { showGoals } from '@/lib/site'

export const metadata = { title: 'Goals' }

export default function GoalsPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  // Goals is a dev-only feature (refined on the invitation site). Hide it on
  // the main/open site — a direct hit bounces to the dashboard.
  if (!showGoals) redirect('/dashboard')

  return <GoalsView />
}
