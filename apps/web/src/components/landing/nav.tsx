'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { Menu, X } from 'lucide-react'
import { isPublicSite } from '@/lib/site'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'

const DevNavCTAs = dynamic(
  () => import('@/components/landing/dev-clerk-ctas').then((m) => m.DevNavCTAs),
  { ssr: false },
)

const DevNavMobileCTAs = dynamic(
  () => import('@/components/landing/dev-clerk-ctas').then((m) => m.DevNavMobileCTAs),
  { ssr: false },
)

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
            <DevNavCTAs />
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
              <DevNavMobileCTAs onClose={() => setOpen(false)} />
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
