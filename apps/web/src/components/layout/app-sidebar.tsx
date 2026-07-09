'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  ShieldCheck,
  BarChart2,
  User,
  Landmark,
  FileText,
  Share2,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PROFILE_SUB_PATHS = [
  '/dashboard/profile',
  '/dashboard/connections',
  '/dashboard/documents',
  '/dashboard/share',
]

const PROFILE_ITEMS = [
  { href: '/dashboard/profile', label: 'My Profile', icon: User },
  { href: '/dashboard/connections', label: 'Connections', icon: Landmark },
  { href: '/dashboard/documents', label: 'Documents', icon: FileText },
  { href: '/dashboard/share', label: 'Share Profile', icon: Share2 },
]

export function AppSidebar() {
  const pathname = usePathname()

  const isInProfile = PROFILE_SUB_PATHS.some((p) => pathname.startsWith(p))
  const [profileOpen, setProfileOpen] = useState(isInProfile)

  // Auto-expand when navigating into a profile sub-page
  useEffect(() => {
    if (isInProfile) setProfileOpen(true)
  }, [isInProfile])

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[#D8D6C9] bg-cream-surface">
      <div className="border-b border-[#D8D6C9] px-6 py-5">
        <Link href="/">
          <Image src="/logo.png" alt="Equiscore" width={160} height={42} priority />
        </Link>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {/* Dashboard */}
        <NavLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} pathname={pathname} exact />

        {/* My Trust Score */}
        <NavLink href="/dashboard/trust-score" label="My Trust Score" icon={ShieldCheck} pathname={pathname} />

        {/* Analytics */}
        <NavLink href="/dashboard/analytics" label="Analytics" icon={BarChart2} pathname={pathname} />

        {/* My Profile — expandable group */}
        <div>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isInProfile
                ? 'bg-cream text-brand'
                : 'text-charcoal-mid hover:bg-cream hover:text-charcoal'
            )}
          >
            <User className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left">My Profile</span>
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', profileOpen && 'rotate-180')}
            />
          </button>

          {profileOpen && (
            <div className="ml-4 mt-1 space-y-0.5 border-l border-[#D8D6C9] pl-3">
              {PROFILE_ITEMS.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                      isActive
                        ? 'font-medium text-brand'
                        : 'text-charcoal-mid hover:bg-cream hover:text-charcoal'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    {label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Account — Clerk UserButton handles settings, sign-out, manage account */}
      <div className="border-t border-[#D8D6C9] px-4 py-4">
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              rootBox: 'w-full',
              userButtonTrigger:
                'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-charcoal-mid hover:bg-cream hover:text-charcoal transition-colors',
              userButtonBox: 'flex-row-reverse gap-3',
              userButtonOuterIdentifier: 'text-sm text-charcoal-mid',
            },
          }}
          showName
        />
      </div>
    </aside>
  )
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  exact,
}: {
  href: string
  label: string
  icon: React.ElementType
  pathname: string
  exact?: boolean
}) {
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        isActive ? 'bg-cream text-brand' : 'text-charcoal-mid hover:bg-cream hover:text-charcoal'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {label}
    </Link>
  )
}
