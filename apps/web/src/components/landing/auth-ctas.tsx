'use client'

import Link from 'next/link'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { ArrowRight } from 'lucide-react'

// Auth-gated CTAs (Sign in / Build my profile / dashboard) used on the open
// (main) and invitation (dev) builds. Named `Dev*` for back-compat with
// existing imports; the neutral aliases below are preferred for new code.

export function DevNavCTAs() {
  return (
    <>
      <SignedOut>
        <div className="flex items-center gap-5">
          <Link href="/sign-in" className="text-sm text-cream/70 transition-colors hover:text-cream">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-teal-dark"
          >
            Build my profile
          </Link>
        </div>
      </SignedOut>
      <SignedIn>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-teal-dark"
          >
            Go to dashboard
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </SignedIn>
    </>
  )
}

export function DevNavMobileCTAs({ onClose }: { onClose: () => void }) {
  return (
    <>
      <SignedOut>
        <Link
          href="/sign-in"
          className="text-sm font-medium text-cream/60 hover:text-cream"
          onClick={onClose}
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-lg bg-teal px-4 py-2 text-center text-sm font-semibold text-ink transition-colors hover:bg-teal-dark"
          onClick={onClose}
        >
          Build my profile
        </Link>
      </SignedOut>
      <SignedIn>
        <Link
          href="/dashboard"
          className="rounded-lg bg-teal px-4 py-2 text-center text-sm font-semibold text-ink transition-colors hover:bg-teal-dark"
          onClick={onClose}
        >
          Go to dashboard
        </Link>
      </SignedIn>
    </>
  )
}

export function DevHeroCTAs() {
  return (
    <>
      <SignedOut>
        <Link
          href="/sign-up"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-teal px-6 py-3 text-sm font-semibold text-ink shadow-[0_0_24px_rgba(0,200,150,0.3)] transition-all hover:bg-teal-dark hover:shadow-[0_0_32px_rgba(0,200,150,0.4)]"
        >
          Build my profile <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/#how-it-works"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-cream/20 px-6 py-3 text-sm font-semibold text-cream transition-colors hover:border-cream/40"
        >
          See how it works <ArrowRight className="h-4 w-4" />
        </Link>
      </SignedOut>
      <SignedIn>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-teal px-6 py-3.5 text-base font-semibold text-ink shadow-[0_0_24px_rgba(0,200,150,0.3)] transition-all hover:bg-teal-dark"
        >
          View my dashboard <ArrowRight className="h-5 w-5" />
        </Link>
      </SignedIn>
    </>
  )
}

export function DevBottomCTA() {
  return (
    <>
      <SignedOut>
        <Link
          href="/sign-up"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal px-8 py-4 text-base font-semibold text-ink shadow-sm transition-colors hover:bg-teal-dark"
        >
          Build my profile <ArrowRight className="h-5 w-5" />
        </Link>
      </SignedOut>
      <SignedIn>
        <Link
          href="/dashboard"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal px-8 py-4 text-base font-semibold text-ink shadow-sm transition-colors hover:bg-teal-dark"
        >
          Go to my dashboard <ArrowRight className="h-5 w-5" />
        </Link>
      </SignedIn>
    </>
  )
}

// ── Neutral aliases (preferred for new call sites) ───────────────────────────

export const NavAuthCTAs = DevNavCTAs
export const NavAuthMobileCTAs = DevNavMobileCTAs
export const HeroAuthCTAs = DevHeroCTAs
export const BottomAuthCTA = DevBottomCTA
