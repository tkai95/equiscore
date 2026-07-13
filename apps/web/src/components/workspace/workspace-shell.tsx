'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import {
  Activity,
  BarChart3,
  Building2,
  ChevronDown,
  ClipboardList,
  FileClock,
  Gauge,
  Inbox,
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

type OrgNavItem =
  | { type: 'link'; href: string; label: string; icon: LucideIcon; exact?: boolean }
  | { type: 'group'; label: string; icon: LucideIcon; children: OrgNavChild[] }

type OrgNavChild = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

const ORG_NAV: OrgNavItem[] = [
  { type: 'link', href: '', label: 'Overview', icon: Gauge, exact: true },
  { type: 'link', href: '/assessments', label: 'Assessments', icon: ClipboardList },
  {
    type: 'group',
    label: 'Applicant intake',
    icon: Inbox,
    children: [
      { href: '/requests', label: 'Requests', icon: FileClock },
      { href: '/shared', label: 'Shared links', icon: ShieldCheck },
    ],
  },
  { type: 'link', href: '/policies', label: 'Policies', icon: ListChecks },
  {
    type: 'group',
    label: 'Settings',
    icon: Settings,
    children: [
      { href: '/settings', label: 'Team', icon: Users },
      { href: '/usage', label: 'Usage', icon: BarChart3 },
      { href: '/audit', label: 'Audit log', icon: Activity },
    ],
  },
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
            <div className="text-sidebar-muted px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide">
              Current organisation
            </div>
          )}
          {ORG_NAV.map((item) =>
            item.type === 'group' ? (
              <NavGroup
                key={item.label}
                base={base}
                item={item}
                pathname={pathname}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ) : (
              <NavLink
                key={item.label}
                href={`${base}${item.href}`}
                label={item.label}
                icon={item.icon}
                pathname={pathname}
                exact={item.exact}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            )
          )}
        </>
      )}
    </nav>
  )
}

function WorkspaceFooter({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div
      className={cn(
        'border-sidebar-border border-t py-3',
        collapsed ? 'flex justify-center px-2' : 'px-4'
      )}
    >
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
        <UserButton.MenuItems>
          <UserButton.Link
            label="Help & support"
            labelIcon={<LifeBuoy className="h-4 w-4" />}
            href="/faq"
          />
          <UserButton.Link
            label="Privacy & security"
            labelIcon={<Lock className="h-4 w-4" />}
            href="/security"
          />
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
        'border-sidebar-border bg-sidebar hidden shrink-0 flex-col border-r transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[76px]' : 'w-60'
      )}
    >
      <div
        className={cn(
          'flex items-center pb-6 pt-7',
          collapsed ? 'flex-col gap-4 px-2' : 'justify-between px-6'
        )}
      >
        <Link href="/" aria-label="EquiScore home">
          {collapsed ? (
            <EquiScoreMark size={30} className="brightness-0 invert" />
          ) : (
            <EquiScoreLogo width={140} className="brightness-0 invert" />
          )}
        </Link>
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="text-sidebar-muted hover:bg-sidebar-hover rounded-md p-1.5 transition-colors hover:text-white"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px]" />
          ) : (
            <PanelLeftClose className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="border-sidebar-border bg-sidebar-active mx-3 mb-3 rounded-lg border px-3 py-2">
          <div className="text-sidebar-text flex items-center gap-2 text-sm font-medium">
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
      <header className="border-sidebar-border bg-sidebar flex h-14 shrink-0 items-center justify-between border-b px-4 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="text-sidebar-text hover:bg-sidebar-hover relative -ml-1 rounded-md p-2 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/workspace" aria-label="Company workspace">
          <EquiScoreLogo width={124} className="brightness-0 invert" />
        </Link>
        <span className="w-9" aria-hidden />
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className="bg-charcoal/40 absolute inset-0"
          />
          <div className="bg-sidebar absolute inset-y-0 left-0 flex w-[280px] max-w-[85%] flex-col shadow-xl">
            <div className="flex items-center justify-between px-6 pb-5 pt-6">
              <Link href="/workspace" aria-label="Company workspace" onClick={() => setOpen(false)}>
                <EquiScoreLogo width={140} className="brightness-0 invert" />
              </Link>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="text-sidebar-muted hover:bg-sidebar-hover rounded-md p-1.5 transition-colors hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="border-sidebar-border bg-sidebar-active mx-3 mb-3 rounded-lg border px-3 py-2">
              <div className="text-sidebar-text flex items-center gap-2 text-sm font-medium">
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
    <div className="bg-surface-page flex h-screen overflow-hidden">
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
  nested = false,
  onNavigate,
}: {
  href: string
  label: string
  icon: LucideIcon
  pathname: string
  exact?: boolean
  collapsed?: boolean
  nested?: boolean
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
          active
            ? 'bg-sidebar-active text-sidebar-text'
            : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white'
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
        'relative flex items-center gap-3 rounded-lg pr-2.5 text-sm font-medium transition-colors',
        nested ? 'h-9 pl-3 text-[13px]' : 'h-11 pl-3',
        active
          ? 'bg-sidebar-active text-sidebar-text'
          : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white'
      )}
    >
      {active && (
        <span className="bg-sidebar-text absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full" />
      )}
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  )
}

function NavGroup({
  base,
  item,
  pathname,
  collapsed = false,
  onNavigate,
}: {
  base: string
  item: Extract<OrgNavItem, { type: 'group' }>
  pathname: string
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const childHrefs = item.children.map((child) => `${base}${child.href}`)
  const active = childHrefs.some((href) => pathname === href || pathname.startsWith(href + '/'))
  const [open, setOpen] = useState(active)
  const Icon = item.icon

  useEffect(() => {
    if (active) setOpen(true)
  }, [active])

  const firstChildHref = childHrefs[0] ?? base
  if (collapsed) {
    return (
      <Link
        href={firstChildHref}
        title={item.label}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        onClick={onNavigate}
        className={cn(
          'relative flex h-11 items-center justify-center rounded-lg transition-colors',
          active
            ? 'bg-sidebar-active text-sidebar-text'
            : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white'
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </Link>
    )
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'relative flex h-11 w-full items-center gap-3 rounded-lg pl-3 pr-2.5 text-left text-sm font-medium transition-colors',
          active
            ? 'bg-sidebar-active text-sidebar-text'
            : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white'
        )}
      >
        {active && (
          <span className="bg-sidebar-text absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full" />
        )}
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 transition-transform', open ? 'rotate-0' : '-rotate-90')}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div className="border-sidebar-border/70 ml-5 space-y-1 border-l pl-3">
          {item.children.map((child) => (
            <NavLink
              key={child.label}
              href={`${base}${child.href}`}
              label={child.label}
              icon={child.icon}
              pathname={pathname}
              exact={child.exact}
              nested
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
