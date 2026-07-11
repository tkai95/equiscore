'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Landmark, ChevronDown } from 'lucide-react'
import { api } from '@/lib/api'

/**
 * Connect a bank via Enable Banking (an alternative to TrueLayer). The user
 * picks their bank, we fetch the authorization URL and redirect. Free
 * "restricted production" lets you link your own real accounts for testing.
 */
export function EnableBankingConnect() {
  const { getToken } = useAuth()
  const [open, setOpen] = useState(false)
  const [aspsp, setAspsp] = useState('')

  const { data: banks = [], isLoading } = useQuery({
    queryKey: ['eb-aspsps', 'GB'],
    enabled: open,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => api.banking.enableBanking.aspsps((await getToken())!),
  })

  const connect = useMutation({
    mutationFn: async () => {
      const { url } = await api.banking.enableBanking.linkUrl((await getToken())!, aspsp)
      window.location.href = url
    },
  })

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-xs font-medium text-brand hover:text-brand-dark"
      >
        <Landmark className="h-3.5 w-3.5" />
        Or connect via Enable Banking (beta)
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-900">Connect via Enable Banking</p>
      <p className="mt-0.5 text-xs text-gray-500">Choose your bank, then authorise read-only access.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <select
            value={aspsp}
            onChange={(e) => setAspsp(e.target.value)}
            disabled={isLoading}
            className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm focus:border-brand focus:outline-none disabled:opacity-50"
          >
            <option value="">{isLoading ? 'Loading banks…' : 'Select your bank'}</option>
            {banks.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
        <button
          onClick={() => connect.mutate()}
          disabled={!aspsp || connect.isPending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-cream-surface hover:bg-brand-dark disabled:opacity-50"
        >
          {connect.isPending ? 'Redirecting…' : 'Connect'}
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>
      {connect.isError && <p className="mt-2 text-xs text-rose-600">Couldn&apos;t start the connection. Try again.</p>}
    </div>
  )
}
