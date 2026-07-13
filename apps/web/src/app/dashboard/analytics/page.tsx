import { redirect } from 'next/navigation'

export const metadata = { title: 'Financial Profile' }

export default function AnalyticsPage() {
  redirect('/dashboard/trust-profile/financial-profile')
}
