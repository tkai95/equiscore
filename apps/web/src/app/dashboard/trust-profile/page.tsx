import { redirect } from 'next/navigation'

export const metadata = { title: 'Trust Profile' }

export default function TrustProfilePage() {
  redirect('/dashboard/trust-profile/assessment')
}
