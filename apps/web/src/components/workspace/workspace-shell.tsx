'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  FileClock,
  Gauge,
  Landmark,
  LifeBuoy,
  ListChecks,
  Lock,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EquiScoreLogo, EquiScoreMark } from '@/components/brand/logo'
import { ChatWidget } from '@/components/chat/chat-widget'

const ORG_NAV = [
  { href: '', label: 'Overview', icon: Gauge },
  { href: '/assessments', label: 'Assessments', icon: ClipboardList },
  { href: '/requests', label: 'Requests', icon: FileClock },
  { href: '/shared', label: 'Shared with us', icon: ShieldCheck },
  { href: '/policies', label: 'Policies', icon: ListChecks },
  { href: '/usage', label: 'Usage', icon: BarChart3 },
  { href: '/audit', label: 'Audit log', icon: Activity },
  { href: '/settings', label: 'Team & settings', icon: Settings },
]

function organisationBase(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean)
  const orgIndex = parts.indexOf('o')
  const slug = orgIndex >= 0 ? parts[orgIndex + 1] : undefined
  return slug ? `/workspace/o/${slug}` : null
}

function WorkspaceNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const base = organisationBase(pathname)

  return (
    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
      <NavLink
        href="/workspace"
        label="Organisations"
        icon={Landmark}
        pathname={pathname}
        exact
        collapsed={collapsed}
        onNavigate={onNavigate}
      />

      {base && (
        <>
          {!collapsed && (
            <div className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-content-muted">
              Current organisation
            </div>
          )}
          {ORG_NAV.map((item) => (
            <NavLink
              key={item.label}
              href={`${base}${item.href}`}
              label={item.label}
              icon={item.icon}
              pathname={pathname}
              exact={item.href === ''}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </>
      )}
    </nav>
  )
}

function WorkspaceFooter({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={cn('border-t border-[rgba(20,55,48,0.08)] py-3', collapsed ? 'flex justify-center px-2' : 'px-4')}>
      <UserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            rootBox: 'w-full',
            userButtonTrigger: collapsed
              ? 'flex items-center justify-center rounded-lg p-1.5 hover:bg-brand-50 transition-colors'
              : 'w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-charcoal-mid hover:bg-brand-50 hover:text-charcoal transition-colors',
            userButtonBox: collapsed ? '' : 'flex-row-reverse gap-3',
            userButtonOuterIdentifier: 'text-sm text-charcoal',
          },
        }}
        showName={!collapsed}
      >
        <UserButton.MenuItems>
          <UserButton.Link label="Help & support" labelIcon={<LifeBuoy className="h-4 w-4" />} href="/faq" />
          <UserButton.Link label="Privacy & security" labelIcon={<Lock className="h-4 w-4" />} href="/security" />
        </UserButton.MenuItems>
      </UserButton>
    </div>
  )
}

function WorkspaceSidebar() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem('workspace-sidebar-collapsed')
    if (saved === '1') setCollapsed(true)
  }, [])

  const toggle = () => {
    setCollapsed((current) => {
      const next = !current
      window.localStorage.setItem('workspace-sidebar-collapsed', next ? '1' : '0')
      return next
    })
  }

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-[rgba(20,55,48,0.08)] bg-surface-sidebar transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[76px]' : 'w-60',
      )}
    >
      <div className={cn('flex items-center pb-6 pt-7', collapsed ? 'flex-col gap-4 px-2' : 'justify-between px-6')}>
        <Link href="/" aria-label="EquiScore home">
          {collapsed ? <EquiScoreMark size={30} /> : <EquiScoreLogo width={140} />}
        </Link>
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="rounded-md p-1.5 text-charcoal-mid transition-colors hover:bg-brand-50 hover:text-charcoal"
        >
          {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
        </button>
      </div>

      {!collapsed && (
        <div className="mx-3 mb-3 rounded-lg border border-[rgba(20,55,48,0.08)] bg-brand-50 px-3 py-2">
          <div className="flex items-center gap-2 text-sm font-medium text-brand">
            <Building2 className="h-[18px] w-[18px]" />
            Company workspace
          </div>
        </div>
      )}

      <WorkspaceNav collapsed={collapsed} />
      <WorkspaceFooter collapsed={collapsed} />
    </aside>
  )
}

function WorkspaceMobileTopBar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(20,55,48,0.08)] bg-surface-sidebar px-4 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="relative -ml-1 rounded-md p-2 text-charcoal transition-colors hover:bg-brand-50"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/workspace" aria-label="Company workspace">
          <EquiScoreLogo width={124} />
        </Link>
        <span className="w-9" aria-hidden />
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-charcoal/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85%] flex-col bg-surface-sidebar shadow-xl">
            <div className="flex items-center justify-between px-6 pb-5 pt-6">
              <Link href="/workspace" aria-label="Company workspace" onClick={() => setOpen(false)}>
                <EquiScoreLogo width={140} />
              </Link>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-md p-1.5 text-charcoal-mid transition-colors hover:bg-brand-50 hover:text-charcoal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mx-3 mb-3 rounded-lg border border-[rgba(20,55,48,0.08)] bg-brand-50 px-3 py-2">
              <div className="flex items-center gap-2 text-sm font-medium text-brand">
                <Building2 className="h-[18px] w-[18px]" />
                Company workspace
              </div>
            </div>
            <WorkspaceNav onNavigate={() => setOpen(false)} />
            <WorkspaceFooter />
          </div>
        </div>
      )}
    </>
  )
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-page">
      <WorkspaceSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceMobileTopBar />
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <ChatWidget />
    </div>
  )
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  exact,
  collapsed = false,
  onNavigate,
}: {
  href: string
  label: string
  icon: LucideIcon
  pathname: string
  exact?: boolean
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  if (collapsed) {
    return (
      <Link
        href={href}
        title={label}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        onClick={onNavigate}
        className={cn(
          'relative flex h-11 items-center justify-center rounded-lg transition-colors',
          active ? 'bg-brand-100 text-brand' : 'text-charcoal-mid hover:bg-brand-50 hover:text-charcoal',
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
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
        active ? 'bg-brand-100 text-brand' : 'text-charcoal-mid hover:bg-brand-50 hover:text-charcoal',
      )}
    >
      {active && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand" />}
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  )
}
