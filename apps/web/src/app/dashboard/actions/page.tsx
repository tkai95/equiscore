import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ActionCentreView } from '@/components/dashboard/action-centre-view'

export const metadata = { title: 'Action Centre' }

export default async function ActionsPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  return <ActionCentreView />
}
