import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AccountTransactionsView } from '@/components/banking/account-transactions-view'

export const metadata = { title: 'Account Transactions' }

export default async function AccountTransactionsPage({
  params,
}: {
  params: { accountId: string }
}) {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  return <AccountTransactionsView accountId={params.accountId} />
}
