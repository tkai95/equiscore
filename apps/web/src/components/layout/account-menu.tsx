'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useUser, useClerk } from '@clerk/nextjs'
import { User, Settings, LifeBuoy, LogOut, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

// EquiScore-owned account menu. Replaces the Clerk <UserButton> entirely —
// EquiScore UI on top, Clerk infrastructure underneath (useUser for identity,
// useClerk().signOut for session). Per the Profile/Account/Settings PRD:
//   - Opens above the identity chip (bottom-left).
//   - Items: Profile, Settings, Help & support, Sign out.
//   - Closes on outside-click / Escape.
//   - Compact, premium, native to the sidebar.
//   - Clerk UI is never launched from this menu.

const MENU_ITEMS = [
  { label: 'Profile', icon: User, href: '/dashboard/profile' },
  { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
  { label: 'Help & support', icon: LifeBuoy, href: '/dashboard/support' },
] as const

export function AccountMenu({ collapsed = false }: { collapsed?: boolean }) {
  const { user } = useUser()
  const { signOut } = useClerk()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const name = user?.fullName ?? user?.firstName ?? 'Account'
  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  const initials = (user?.firstName?.[0] ?? user?.fullName?.[0] ?? '?').toUpperCase()

  // Collapsed rail: just the avatar; menu opens above it.
  if (collapsed) {
    return (
      <div ref={containerRef} className="relative flex justify-center">
        {open && (
          <AccountMenuPanel
            name={name}
            email={email}
            onNavigate={() => setOpen(false)}
            onSignOut={() => void signOut({ redirectUrl: '/sign-in' })}
            className="absolute bottom-full left-0 mb-2 w-[260px]"
          />
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Open account menu"
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-active text-sm font-semibold text-white transition-colors hover:opacity-90"
        >
          {initials}
        </button>
      </div>
    )
  }

  // Expanded: identity chip + chevron; menu opens above.
  return (
    <div ref={containerRef} className="relative">
      {open && (
        <AccountMenuPanel
          name={name}
          email={email}
          onNavigate={() => setOpen(false)}
          onSignOut={() => void signOut({ redirectUrl: '/sign-in' })}
          className="absolute bottom-full left-0 mb-2 w-[260px]"
        />
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open account menu"
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white',
          open && 'bg-sidebar-hover text-white'
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sidebar-active text-xs font-semibold text-white">
          {initials}
        </span>
        <span className="min-w-0 flex-1 truncate text-left">{name}</span>
        <ChevronUp
          className={cn('h-4 w-4 shrink-0 text-sidebar-muted transition-transform', !open && 'rotate-180')}
        />
      </button>
    </div>
  )
}

// The floating menu panel — shared by collapsed + expanded layouts.
function AccountMenuPanel({
  name,
  email,
  onNavigate,
  onSignOut,
  className,
}: {
  name: string
  email: string
  onNavigate: () => void
  onSignOut: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'z-50 overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar text-white shadow-xl',
        className
      )}
    >
      {/* Identity header */}
      <div className="px-4 py-3">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        {email && <p className="truncate text-xs text-white/60">{email}</p>}
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Menu items */}
      <div className="p-2">
        {MENU_ITEMS.map(({ label, icon: Icon, href }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon className="h-4 w-4 shrink-0 text-white/60" />
            {label}
          </Link>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Sign out */}
      <div className="p-2">
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  )
}
