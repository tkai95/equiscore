'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { EquiScoreLogo } from '@/components/brand/logo'
import { isInvitationSite } from '@/lib/site'
import { api } from '@/lib/api'

// On the invitation site (dev), the dashboard is gated: a signed-in user must
// have an active DevAccess grant. Mirrors the AdminShell access-gate approach
// (a client-side check after auth resolves) so we avoid edge-middleware DB
// calls. On the open/public sites this renders children unchanged.
export function DevAccessGate({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, userId } = useAuth()

  const { data, isLoading } = useQuery({
    // Only run the check on the invitation site, once auth has resolved.
    enabled: isInvitationSite && isLoaded && !!userId,
    queryKey: ['dev-access'],
    queryFn: async () => {
      const token = await getToken()
      return api.auth.devAccess(token!)
    },
  })

  if (!isInvitationSite) return <>{children}</>

  // Still resolving auth or access — avoid flashing the gate.
  if (!isLoaded || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-page">
        <div className="bg-surface-hover h-6 w-40 animate-pulse rounded-card" />
      </div>
    )
  }

  if (data?.hasAccess) return <>{children}</>

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex justify-center">
          <EquiScoreLogo width={150} />
        </div>

        <div className="border-line bg-surface-card rounded-card border p-8 text-center">
          <div className="bg-surface-inset text-brand mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-content text-2xl font-semibold tracking-tight">Dev access required</h1>
          <p className="text-content-secondary mx-auto mt-2 max-w-md text-sm">
            Your account does not have access to the dev site. The dev site is invite-only.
          </p>
          <p className="text-content-muted mx-auto mt-3 max-w-md text-sm">
            Ask the EquiScore team to invite your email, then sign back in.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="text-brand inline-flex items-center justify-center text-sm font-medium"
            >
              Go to the main site
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
