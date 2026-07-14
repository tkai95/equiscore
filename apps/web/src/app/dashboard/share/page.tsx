import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ShareProfileView } from '@/components/share/share-profile-view'

export const metadata = { title: 'Sharing' }

export default async function SharePage({
  searchParams,
}: {
  searchParams: { mode?: string; goalId?: string }
}) {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  return (
    <ShareProfileView
      mode={searchParams.mode === 'rental' ? 'rental' : 'generic'}
      goalId={searchParams.goalId}
    />
  )
}
