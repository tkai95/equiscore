'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { Menu, X, ChevronDown } from 'lucide-react'
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

// ── Nav data ─────────────────────────────────────────────────────────────────

type MenuKey = 'who' | 'how' | 'trust' | 'company'

const WHO_INDIVIDUALS = [
  { href: '/for/account-closed', label: 'Account deactivated or closed' },
  { href: '/for/migrants', label: 'Migrants & newcomers' },
  { href: '/for/gig-workers', label: 'Gig workers & self-employed' },
  { href: '/for/thin-file', label: 'Thin credit file' },
]

const WHO_ORGS = [
  { href: '/for/banks', label: 'Banks & fintechs' },
  { href: '/for/landlords', label: 'Landlords & letting agents' },
  { href: '/for/utilities', label: 'Utility providers' },
  { href: '/for/lenders', label: 'Credit & lending providers' },
]

const HOW_LINKS = [
  { href: '/how-it-works', label: 'How EquiScore works' },
  { href: '/how-it-works/privacy', label: 'Privacy & security' },
  { href: '/how-it-works/sharing', label: 'Sharing your profile' },
]

const TRUST_LINKS = [
  { href: '/trust-portfolio', label: 'What is a Trust Portfolio?' },
  { href: '/trust-portfolio/improve-your-score', label: 'Improving your score' },
  { href: '/trust-portfolio/how-it-helps', label: 'How it can help you' },
]

const COMPANY_LINKS = [
  { href: '/mission', label: 'Our mission' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
  { href: '/faq', label: 'FAQ' },
  { href: '/partners', label: 'Partner with us' },
]

// ── Shared link item ─────────────────────────────────────────────────────────

function DLink({
  href,
  label,
  accent,
  onClick,
}: {
  href: string
  label: string
  accent?: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-teal/10 ${
        accent ? 'font-semibold text-teal' : 'text-cream hover:text-teal'
      }`}
    >
      {label}
    </Link>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

interface LandingNavProps {
  dark?: boolean
}

export function LandingNav({ dark = false }: LandingNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState<MenuKey | null>(null)
  const [activeDesktop, setActiveDesktop] = useState<MenuKey | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openDesktop = (key: MenuKey) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setActiveDesktop(key)
  }

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setActiveDesktop(null), 120)
  }

  const closeAll = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setActiveDesktop(null)
    setMobileOpen(false)
    setMobileExpanded(null)
  }

  const navBg = dark ? 'bg-ink border-ink-border' : 'bg-cream-surface border-[#D8D6C9]'
  const labelColor = dark ? 'text-cream hover:text-teal' : 'text-charcoal-mid hover:text-charcoal'
  const triggerCls = `flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${labelColor}`

  const MOBILE_MENUS: { key: MenuKey; label: string; links: { href: string; label: string; accent?: boolean }[] }[] = [
    { key: 'who', label: 'Who We Help', links: [...WHO_INDIVIDUALS, ...WHO_ORGS] },
    { key: 'how', label: 'How It Works', links: HOW_LINKS },
    { key: 'trust', label: 'Trust Portfolio', links: TRUST_LINKS },
    { key: 'company', label: 'Company', links: COMPANY_LINKS },
  ]

  return (
    <nav className={`sticky top-0 z-40 border-b ${navBg}`}>
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

        {/* Logo */}
        <Link href="/" onClick={closeAll}>
          <Image
            src="/logo.png"
            alt="Equiscore"
            width={140}
            height={38}
            priority
            className={dark ? 'brightness-0 invert' : ''}
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">

          {/* Who We Help — 2-column dropdown */}
          <div className="relative" onMouseEnter={() => openDesktop('who')} onMouseLeave={scheduleClose}>
            <button className={triggerCls}>
              Who We Help
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${activeDesktop === 'who' ? 'rotate-180' : ''}`} />
            </button>
            {activeDesktop === 'who' && (
              <div
                className="absolute left-0 top-full z-50 mt-2 w-[500px] rounded-xl border border-ink-border bg-ink p-5 shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
                onMouseEnter={() => openDesktop('who')}
                onMouseLeave={scheduleClose}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-cream/40">Individuals</p>
                    {WHO_INDIVIDUALS.map((l) => <DLink key={l.href} {...l} onClick={closeAll} />)}
                  </div>
                  <div>
                    <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-cream/40">Organisations</p>
                    {WHO_ORGS.map((l) => <DLink key={l.href} {...l} onClick={closeAll} />)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* How It Works */}
          <div className="relative" onMouseEnter={() => openDesktop('how')} onMouseLeave={scheduleClose}>
            <button className={triggerCls}>
              How It Works
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${activeDesktop === 'how' ? 'rotate-180' : ''}`} />
            </button>
            {activeDesktop === 'how' && (
              <div
                className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-ink-border bg-ink p-3 shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
                onMouseEnter={() => openDesktop('how')}
                onMouseLeave={scheduleClose}
              >
                {HOW_LINKS.map((l) => <DLink key={l.href} {...l} onClick={closeAll} />)}
              </div>
            )}
          </div>

          {/* Trust Portfolio */}
          <div className="relative" onMouseEnter={() => openDesktop('trust')} onMouseLeave={scheduleClose}>
            <button className={triggerCls}>
              Trust Portfolio
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${activeDesktop === 'trust' ? 'rotate-180' : ''}`} />
            </button>
            {activeDesktop === 'trust' && (
              <div
                className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-ink-border bg-ink p-3 shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
                onMouseEnter={() => openDesktop('trust')}
                onMouseLeave={scheduleClose}
              >
                {TRUST_LINKS.map((l) => <DLink key={l.href} {...l} onClick={closeAll} />)}
              </div>
            )}
          </div>

          {/* Company */}
          <div className="relative" onMouseEnter={() => openDesktop('company')} onMouseLeave={scheduleClose}>
            <button className={triggerCls}>
              Company
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${activeDesktop === 'company' ? 'rotate-180' : ''}`} />
            </button>
            {activeDesktop === 'company' && (
              <div
                className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-ink-border bg-ink p-3 shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
                onMouseEnter={() => openDesktop('company')}
                onMouseLeave={scheduleClose}
              >
                {COMPANY_LINKS.map((l) => <DLink key={l.href} {...l} onClick={closeAll} />)}
              </div>
            )}
          </div>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden items-center md:flex">
          {isPublicSite ? (
            <RegisterInterestButton label="Join the waitlist" variant="primary" />
          ) : (
            <DevNavCTAs />
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex items-center justify-center md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen
            ? <X className={`h-5 w-5 ${dark ? 'text-cream' : 'text-charcoal-mid'}`} />
            : <Menu className={`h-5 w-5 ${dark ? 'text-cream' : 'text-charcoal-mid'}`} />
          }
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-ink-border bg-ink px-4 py-4 md:hidden">
          <div className="space-y-1">
            {MOBILE_MENUS.map(({ key, label, links }) => (
              <div key={key}>
                <button
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-cream"
                  onClick={() => setMobileExpanded(mobileExpanded === key ? null : key)}
                >
                  {label}
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mobileExpanded === key ? 'rotate-180' : ''}`} />
                </button>
                {mobileExpanded === key && (
                  <div className="mt-1 space-y-0.5 pl-3">
                    {links.map((l) => <DLink key={l.href} {...l} onClick={closeAll} />)}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-ink-border pt-4">
            {isPublicSite ? (
              <RegisterInterestButton label="Join the waitlist" variant="primary" />
            ) : (
              <DevNavMobileCTAs onClose={closeAll} />
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
