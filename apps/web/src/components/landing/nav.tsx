'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { Menu, X } from 'lucide-react'
import { isPublicSite } from '@/lib/site'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'

const links = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/for-landlords', label: 'For landlords' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
]

export function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-40 border-b border-[#D8D6C9] bg-cream-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/">
          <Image src="/logo.png" alt="Equiscore" width={220} height={58} priority />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-base font-medium text-charcoal-mid transition-colors hover:text-charcoal"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {isPublicSite ? (
            <RegisterInterestButton label="Register your interest" variant="ghost" />
          ) : (
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
          )}
        </div>

        <button
          className="flex items-center justify-center md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? (
            <X className="h-5 w-5 text-charcoal-mid" />
          ) : (
            <Menu className="h-5 w-5 text-charcoal-mid" />
          )}
        </button>
      </div>

      {open && (
        <div className="border-t border-[#D8D6C9] bg-cream-surface px-6 py-5 md:hidden">
          <div className="flex flex-col gap-5">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-medium text-charcoal-mid hover:text-charcoal"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <hr className="border-[#D8D6C9]" />
            {isPublicSite ? (
              <RegisterInterestButton label="Register your interest" variant="ghost" />
            ) : (
              <>
                <SignedOut>
                  <Link
                    href="/sign-in"
                    className="text-sm font-medium text-charcoal-mid"
                    onClick={() => setOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/sign-up"
                    className="rounded-lg bg-brand px-4 py-2 text-center text-sm font-medium text-cream-surface hover:bg-brand-dark"
                    onClick={() => setOpen(false)}
                  >
                    Build my profile
                  </Link>
                </SignedOut>
                <SignedIn>
                  <Link
                    href="/dashboard"
                    className="rounded-lg bg-brand px-4 py-2 text-center text-sm font-medium text-cream-surface hover:bg-brand-dark"
                    onClick={() => setOpen(false)}
                  >
                    Go to dashboard
                  </Link>
                </SignedIn>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
