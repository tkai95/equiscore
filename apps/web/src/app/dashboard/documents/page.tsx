import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { DocumentsView } from '@/components/documents/documents-view'

export const metadata = { title: 'Documents' }

export default async function DocumentsPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  return <DocumentsView />
}
