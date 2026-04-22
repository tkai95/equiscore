import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SettingsView } from '@/components/settings/settings-view'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  return <SettingsView />
}
