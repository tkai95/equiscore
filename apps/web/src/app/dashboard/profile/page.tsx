import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ProfileView } from '@/components/profile/profile-view'

export const metadata = { title: 'My Profile' }

export default async function ProfilePage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  return <ProfileView />
}
