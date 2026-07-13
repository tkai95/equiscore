import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { GoalsView } from '@/components/goals/goals-view'

export const metadata = { title: 'Goals' }

export default function GoalsPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  return <GoalsView />
}
