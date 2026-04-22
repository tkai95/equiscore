import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { BankConnectionsView } from '@/components/banking/bank-connections-view'

export const metadata = { title: 'Bank Connections' }

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: { bank_connected?: string; bank_error?: string }
}) {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  return (
    <BankConnectionsView
      bankConnected={searchParams.bank_connected === 'true'}
      bankError={searchParams.bank_error === 'true'}
    />
  )
}
