import { redirect } from 'next/navigation'

export const metadata = { title: 'My Money' }

export default function CompassPage() {
  redirect('/dashboard/my-money')
}
