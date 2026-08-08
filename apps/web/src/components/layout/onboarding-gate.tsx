'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useMe } from '@/lib/use-me'

// Forces new users through onboarding before they can use the dashboard.
//
// A brand-new sign-up has profileStage 'created' (the lazy-sync default).
// completeOnboarding advances it to 'profile_building'. Without this gate,
// a user who navigates away from /onboarding can reach /dashboard directly
// and see an empty, broken dashboard. This wrapper sends anyone whose
// profile is not yet started back to onboarding.
//
// No-op while auth or the profile is still loading (avoid a flash of redirect),
// and only active for signed-in users — the route is Clerk-protected already.
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useAuth()
  const { data: me, isLoading } = useMe()
  const router = useRouter()

  const stage = me?.profile?.profileStage
  const profileStarted = stage && stage !== 'created'

  useEffect(() => {
    // Only redirect once we're certain: auth resolved, user signed in, profile
    // fetched, and it's still at the pre-onboarding stage.
    if (isLoaded && userId && !isLoading && me && !profileStarted) {
      router.replace('/onboarding')
    }
  }, [isLoaded, userId, isLoading, me, profileStarted, router])

  // Still resolving auth or profile — render a neutral loader so the dashboard
  // never flashes for a half-finished onboarding user.
  if (isLoaded && userId && isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-page">
        <div className="bg-surface-hover h-6 w-40 animate-pulse rounded-card" />
      </div>
    )
  }

  return <>{children}</>
}
