import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ShareProfileView } from '@/components/share/share-profile-view'

export const metadata = { title: 'Sharing' }

export default async function SharePage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  // Goals (which drove the rental share-pack mode) have been removed. Any
  // legacy ?mode=rental&goalId=... links now fall through to generic sharing.
  return <ShareProfileView mode="generic" />
}
