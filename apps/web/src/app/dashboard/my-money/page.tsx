import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { CompassView } from '@/components/compass/compass-view'

export const metadata = { title: 'My Money' }

export default function MyMoneyPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  return <CompassView />
}
