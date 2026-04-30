'use client'

import Link from 'next/link'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { ArrowRight } from 'lucide-react'

export function DevNavCTAs() {
  return (
    <>
      <SignedOut>
        <Link href="/sign-in" className="text-sm text-charcoal-mid hover:text-charcoal">
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-cream-surface transition-colors hover:bg-brand-dark"
        >
          Build my profile
        </Link>
      </SignedOut>
      <SignedIn>
        <Link
          href="/dashboard"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-cream-surface transition-colors hover:bg-brand-dark"
        >
          Go to dashboard
        </Link>
        <UserButton afterSignOutUrl="/" />
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
          className="text-sm font-medium text-charcoal-mid"
          onClick={onClose}
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-lg bg-brand px-4 py-2 text-center text-sm font-medium text-cream-surface hover:bg-brand-dark"
          onClick={onClose}
        >
          Build my profile
        </Link>
      </SignedOut>
      <SignedIn>
        <Link
          href="/dashboard"
          className="rounded-lg bg-brand px-4 py-2 text-center text-sm font-medium text-cream-surface hover:bg-brand-dark"
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
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-base font-semibold text-cream-surface shadow-sm transition-colors hover:bg-brand-dark"
        >
          Build my profile
        </Link>
        <Link
          href="/#how-it-works"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8D6C9] bg-cream-surface px-6 py-3.5 text-base font-semibold text-charcoal transition-colors hover:bg-cream"
        >
          See how it works <ArrowRight className="h-4 w-4" />
        </Link>
      </SignedOut>
      <SignedIn>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-base font-semibold text-cream-surface shadow-sm transition-colors hover:bg-brand-dark"
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
          className="inline-flex items-center gap-2 rounded-xl bg-cream-surface px-8 py-4 text-base font-semibold text-brand shadow-sm hover:bg-cream"
        >
          Build my profile <ArrowRight className="h-5 w-5" />
        </Link>
      </SignedOut>
      <SignedIn>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-cream-surface px-8 py-4 text-base font-semibold text-brand shadow-sm hover:bg-cream"
        >
          Go to my dashboard <ArrowRight className="h-5 w-5" />
        </Link>
      </SignedIn>
    </>
  )
}
