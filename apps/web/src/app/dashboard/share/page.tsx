import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ShareProfileView } from '@/components/share/share-profile-view'

export const metadata = { title: 'Sharing' }

export default async function SharePage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  return <ShareProfileView />
}
