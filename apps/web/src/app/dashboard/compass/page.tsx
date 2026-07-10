import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { CompassView } from '@/components/compass/compass-view'

export const metadata = { title: 'Compass' }

export default function CompassPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')
  // Entitlement is enforced by the API guard and reflected in the view
  // (an upsell renders when Compass is not enabled for the account).
  return <CompassView />
}
