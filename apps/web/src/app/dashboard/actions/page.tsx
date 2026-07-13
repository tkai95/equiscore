import { redirect } from 'next/navigation'

export const metadata = { title: 'To do' }

export default async function ActionsPage() {
  redirect('/dashboard/to-do')
}
