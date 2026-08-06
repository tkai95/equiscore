'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import {
  LayoutGrid,
  ListChecks,
  ShieldCheck,
  BarChart3,
  Share2,
  User,
  Settings,
  ChevronDown,
  Wallet,
  LifeBuoy,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EquiScoreLogo, EquiScoreMark } from '@/components/brand/logo'
import { useActionItems } from '@/lib/use-action-items'

type Leaf = { href: string; label: string; icon: LucideIcon }
type Group = { id: string; label: string; icon: LucideIcon; children: Leaf[] }

// IA organised around user jobs, not internal system structure. Trust Profile
// is the formal assessment/report, Goals applies it to a real-world outcome,
// and My Money carries the ongoing financial-coaching surface.
const GROUPS: Group[] = [
  {
    id: 'trust-profile',
    label: 'Trust Profile',
    icon: ShieldCheck,
    children: [
      { href: '/dashboard/trust-profile/assessment', label: 'Assessment', icon: ShieldCheck },
      { href: '/dashboard/trust-profile/financial-profile', label: 'Financial Profile', icon: BarChart3 },
    ],
  },
]

// ── Shared nav body (used by desktop rail and mobile drawer) ─────────────────

function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const { count } = useActionItems()

  return (
    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
      <NavLink
        href="/dashboard"
        label="Home"
        icon={LayoutGrid}
        pathname={pathname}
        exact
        collapsed={collapsed}
        onNavigate={onNavigate}
      />

      <div className="pt-2" />
      {GROUPS.map((group) => (
        <NavGroup
          key={group.id}
          group={group}
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}

      <div className="pt-2" />
      <NavLink
        href="/dashboard/my-money"
        label="My Money"
        icon={Wallet}
        pathname={pathname}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />
      <NavLink
        href="/dashboard/to-do"
        label="To do"
        icon={ListChecks}
        pathname={pathname}
        badge={count > 0 ? count : undefined}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />
      <NavLink
        href="/dashboard/share"
        label="Sharing"
        icon={Share2}
        pathname={pathname}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />
    </nav>
  )
}

function SidebarFooter({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={cn('border-t border-sidebar-border py-3', collapsed ? 'flex justify-center px-2' : 'px-4')}>
      <UserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            rootBox: 'w-full',
            userButtonTrigger: collapsed
              ? 'flex items-center justify-center rounded-lg p-1.5 hover:bg-sidebar-hover transition-colors'
              : 'w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-sidebar-muted hover:bg-sidebar-hover hover:text-white transition-colors',
            userButtonBox: collapsed ? '' : 'flex-row-reverse gap-3',
            userButtonOuterIdentifier: 'text-sm text-sidebar-text',
          },
        }}
        showName={!collapsed}
      >
        {/* Help & support and Privacy & security live in the account menu. */}
        <UserButton.MenuItems>
          <UserButton.Link
            label="Personal details"
            labelIcon={<User className="h-4 w-4" />}
            href="/dashboard/profile"
          />
          <UserButton.Link
            label="Account & security"
            labelIcon={<Settings className="h-4 w-4" />}
            href="/dashboard/settings"
          />
          <UserButton.Link
            label="Help & support"
            labelIcon={<LifeBuoy className="h-4 w-4" />}
            href="/faq"
          />
          <UserButton.Link
            label="Privacy & permissions"
            labelIcon={<Lock className="h-4 w-4" />}
            href="/security"
          />
        </UserButton.MenuItems>
      </UserButton>
    </div>
  )
}

// ── Desktop rail (collapsible) ───────────────────────────────────────────────

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false)

  // Persist the collapsed preference across navigations/sessions.
  useEffect(() => {
    const saved = window.localStorage.getItem('sidebar-collapsed')
    if (saved === '1') setCollapsed(true)
  }, [])
  const toggle = () => {
    setCollapsed((c) => {
      const next = !c
      window.localStorage.setItem('sidebar-collapsed', next ? '1' : '0')
      return next
    })
  }

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[76px]' : 'w-60',
      )}
    >
      {/* Logo + collapse toggle */}
      <div className={cn('flex items-center pb-6 pt-7', collapsed ? 'flex-col gap-4 px-2' : 'justify-between px-6')}>
        <Link href="/" aria-label="EquiScore home">
          {collapsed ? <EquiScoreMark size={30} className="brightness-0 invert" /> : <EquiScoreLogo width={140} className="brightness-0 invert" />}
        </Link>
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white"
        >
          {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
        </button>
      </div>

      <SidebarNav collapsed={collapsed} />
      <SidebarFooter collapsed={collapsed} />
    </aside>
  )
}

// ── Mobile top app bar + slide-over drawer ───────────────────────────────────

export function MobileTopBar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { count } = useActionItems()

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="relative -ml-1 rounded-md p-2 text-sidebar-text transition-colors hover:bg-sidebar-hover"
        >
          <Menu className="h-5 w-5" />
          {count > 0 && (
            <span
              className="absolute right-1 top-1 h-2 w-2 rounded-full bg-white"
              aria-label={`${count} outstanding actions`}
            />
          )}
        </button>
        <Link href="/" aria-label="EquiScore home">
          <EquiScoreLogo width={124} className="brightness-0 invert" />
        </Link>
        {/* Spacer to keep the logo centred against the menu button */}
        <span className="w-9" aria-hidden />
      </header>

      {/* Slide-over drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-charcoal/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85%] flex-col bg-sidebar shadow-xl">
            <div className="flex items-center justify-between px-6 pb-5 pt-6">
              <Link href="/" aria-label="EquiScore home" onClick={() => setOpen(false)}>
                <EquiScoreLogo width={140} className="brightness-0 invert" />
              </Link>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setOpen(false)} />
            <SidebarFooter />
          </div>
        </div>
      )}
    </>
  )
}

// ── Nav primitives ───────────────────────────────────────────────────────────

function NavGroup({
  group,
  pathname,
  collapsed = false,
  onNavigate,
}: {
  group: Group
  pathname: string
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const isInside = group.children.some(
    (c) => pathname === c.href || pathname.startsWith(c.href + '/'),
  )
  const [open, setOpen] = useState(isInside)
  useEffect(() => {
    if (isInside) setOpen(true)
  }, [isInside])

  const Icon = group.icon

  // Collapsed rail: the group becomes a single icon linking to its first child.
  if (collapsed) {
    const first = group.children[0]!
    return (
      <Link
        href={first.href}
        title={group.label}
        aria-label={group.label}
        onClick={onNavigate}
        className={cn(
          'flex h-11 items-center justify-center rounded-lg transition-colors',
          isInside ? 'bg-sidebar-active text-white' : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white',
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </Link>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          'flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
          isInside ? 'text-sidebar-text' : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white',
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="ml-[26px] mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
          {group.children.map(({ href, label, icon: LeafIcon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                  active
                    ? 'bg-sidebar-active font-medium text-white'
                    : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white',
                )}
              >
                <LeafIcon className="h-[15px] w-[15px] shrink-0" />
                {label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  exact,
  badge,
  muted,
  collapsed = false,
  onNavigate,
}: {
  href: string
  label: string
  icon: LucideIcon
  pathname: string
  exact?: boolean
  badge?: number
  muted?: boolean
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  if (collapsed) {
    return (
      <Link
        href={href}
        title={label}
        aria-label={badge != null ? `${label}, ${badge} outstanding` : label}
        aria-current={active ? 'page' : undefined}
        onClick={onNavigate}
        className={cn(
          'relative flex h-11 items-center justify-center rounded-lg transition-colors',
          active
            ? 'bg-sidebar-active text-white'
            : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white',
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        {badge != null && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-white" />
        )}
      </Link>
    )
  }

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={cn(
        'relative flex h-11 items-center gap-3 rounded-lg pl-3 pr-2.5 text-sm font-medium transition-colors',
        active
          ? 'bg-sidebar-active text-white'
          : muted
            ? 'text-sidebar-muted/80 hover:bg-sidebar-hover hover:text-white'
            : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white',
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      <span className="flex-1">{label}</span>
      {badge != null && (
        <span
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-semibold text-white"
          aria-label={`${badge} outstanding action${badge === 1 ? '' : 's'}`}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}
