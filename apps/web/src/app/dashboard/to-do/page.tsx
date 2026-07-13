import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ActionCentreView } from '@/components/dashboard/action-centre-view'

export const metadata = { title: 'To do' }

export default async function ToDoPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  return <ActionCentreView />
}
