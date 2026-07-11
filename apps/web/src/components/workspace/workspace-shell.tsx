'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  FileClock,
  Gauge,
  Landmark,
  ListChecks,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EquiScoreLogo } from '@/components/brand/logo'

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

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const base = organisationBase(pathname)

  return (
    <div className="flex h-screen overflow-hidden bg-surface-page">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface-sidebar lg:flex">
        <div className="px-6 pb-5 pt-7">
          <Link href="/" aria-label="EquiScore home">
            <EquiScoreLogo width={140} />
          </Link>
          <div className="mt-5 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand">
            <Building2 className="h-4 w-4" />
            Company workspace
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          <WorkspaceLink href="/workspace" label="Organisations" icon={Landmark} pathname={pathname} exact />
          {base && (
            <>
              <div className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-content-muted">
                Current organisation
              </div>
              {ORG_NAV.map((item) => (
                <WorkspaceLink
                  key={item.label}
                  href={`${base}${item.href}`}
                  label={item.label}
                  icon={item.icon}
                  pathname={pathname}
                  exact={item.href === ''}
                />
              ))}
            </>
          )}
        </nav>

        <div className="border-t border-line px-4 py-3">
          <UserButton afterSignOutUrl="/" showName />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface-card px-4 lg:hidden">
          <Link href="/workspace" className="flex items-center gap-2 text-sm font-semibold text-content">
            <Users className="h-4 w-4" />
            Company workspace
          </Link>
          <UserButton afterSignOutUrl="/" />
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

function WorkspaceLink({
  href,
  label,
  icon: Icon,
  pathname,
  exact,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  pathname: string
  exact?: boolean
}) {
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-brand-50 text-brand' : 'text-content-secondary hover:bg-surface-hover hover:text-content'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  )
}
