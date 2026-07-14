'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, useAuth, useClerk, useUser } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  LifeBuoy,
  Lock,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { adminApi } from '@/lib/admin-api'
import { cn } from '@/lib/utils'
import { EquiScoreLogo, EquiScoreMark } from '@/components/brand/logo'
import { ChatWidget } from '@/components/chat/chat-widget'
import { Button } from '@/components/ui'

const ADMIN_NAV = [
  { href: '/admin', label: 'Overview', icon: ShieldCheck, exact: true },
  { href: '/admin/organisations', label: 'Organisations', icon: Building2 },
  { href: '/admin/consumers', label: 'Consumers', icon: Users },
  { href: '/admin/usage', label: 'Usage', icon: BarChart3 },
  { href: '/admin/activity', label: 'Activity', icon: Activity },
  { href: '/admin/internal-admins', label: 'Internal admins', icon: UserCog },
  { href: '/admin/audit', label: 'Admin audit', icon: ClipboardList },
]

function AdminNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
      {ADMIN_NAV.map((item) => (
        <NavLink
          key={item.label}
          href={item.href}
          label={item.label}
          icon={item.icon}
          pathname={pathname}
          exact={item.exact}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  )
}

function AdminFooter({ collapsed = false }: { collapsed?: boolean }) {
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

function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem('admin-sidebar-collapsed')
    if (saved === '1') setCollapsed(true)
  }, [])

  const toggle = () => {
    setCollapsed((current) => {
      const next = !current
      window.localStorage.setItem('admin-sidebar-collapsed', next ? '1' : '0')
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

      <AdminNav collapsed={collapsed} />
      <AdminFooter collapsed={collapsed} />
    </aside>
  )
}

function AdminMobileTopBar() {
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
        <Link href="/admin" aria-label="EquiScore admin">
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
              <Link href="/admin" aria-label="EquiScore admin" onClick={() => setOpen(false)}>
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
            <AdminNav onNavigate={() => setOpen(false)} />
            <AdminFooter />
          </div>
        </div>
      )}
    </>
  )
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded } = useAuth()
  const { signOut } = useClerk()
  const { user } = useUser()

  const {
    data: admin,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['admin-me'],
    enabled: isLoaded,
    retry: false,
    queryFn: async () => adminApi.me((await getToken())!),
  })

  if (!isLoaded || isLoading) return <AdminAccessLoading />

  if (isError || !admin) {
    return (
      <AdminAccessRequired
        email={user?.primaryEmailAddress?.emailAddress ?? null}
        error={(error as Error | undefined)?.message}
        onSwitchAccount={() => void signOut({ redirectUrl: '/sign-in' })}
      />
    )
  }

  return (
    <div className="bg-surface-page flex h-screen overflow-hidden">
      <AdminSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileTopBar />
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1200px]">{children}</div>
        </main>
      </div>

      <ChatWidget />
    </div>
  )
}

function AdminAccessLoading() {
  return (
    <div className="bg-surface-page flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <EquiScoreLogo width={150} />
        </div>
        <div className="border-line bg-surface-card rounded-card p-6">
          <div className="bg-surface-hover mb-4 h-5 w-40 animate-pulse rounded" />
          <div className="bg-surface-hover h-4 w-full animate-pulse rounded" />
          <div className="bg-surface-hover mt-2 h-4 w-2/3 animate-pulse rounded" />
        </div>
      </div>
    </div>
  )
}

function AdminAccessRequired({
  email,
  error,
  onSwitchAccount,
}: {
  email: string | null
  error?: string
  onSwitchAccount: () => void
}) {
  return (
    <div className="bg-surface-page flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex justify-center">
          <EquiScoreLogo width={150} />
        </div>

        <div className="border-line bg-surface-card rounded-card border p-6 text-center sm:p-8">
          <div className="bg-surface-inset text-brand mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-content text-2xl font-semibold tracking-tight">
            Admin access required
          </h1>
          <p className="text-content-secondary mx-auto mt-2 max-w-md text-sm">
            You are signed in{email ? ` as ${email}` : ''}, but this email has not been granted
            EquiScore internal admin access.
          </p>
          <p className="text-content-muted mx-auto mt-3 max-w-md text-sm">
            Ask an existing internal admin to invite this email, or switch to an authorised account.
            Signing in here does not grant partner or admin permissions.
          </p>
          {error && (
            <p className="text-content-muted bg-surface-inset mt-5 rounded-lg px-3 py-2 text-xs">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button type="button" onClick={onSwitchAccount}>
              Switch account
            </Button>
            <Link
              href="/"
              className="text-brand inline-flex items-center justify-center text-sm font-medium"
            >
              Go to consumer site
            </Link>
          </div>
        </div>
      </div>
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
        'relative flex h-11 items-center gap-3 rounded-lg pl-3 pr-2.5 text-sm font-medium transition-colors',
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
