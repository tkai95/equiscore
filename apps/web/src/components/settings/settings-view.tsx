'use client'

import { useState } from 'react'
import { useAuth, useUser, useClerk, SignOutButton } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  UserCog,
  Shield,
  Bell,
  Lock,
  SlidersHorizontal,
  LogOut,
  X,
  Download,
  AlertTriangle,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import { Card, PageLayout } from '@/components/ui'
import { SecuritySection } from '@/components/settings/security-section'

type SettingsSection = 'account' | 'security' | 'notifications' | 'privacy' | 'preferences'

const NAV: { id: SettingsSection; label: string; icon: LucideIcon }[] = [
  { id: 'account', label: 'Account', icon: UserCog },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & data', icon: Lock },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
]

interface UserProfile {
  profileStage: string
  createdAt: string
}

export function SettingsView() {
  const [section, setSection] = useState<SettingsSection>('account')

  return (
    <PageLayout>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-content">Settings</h1>
        <p className="mt-1 text-sm text-content-secondary">
          Manage your account, security, privacy and preferences.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Secondary nav */}
        <nav className="flex gap-1 overflow-x-auto lg:w-48 lg:shrink-0 lg:flex-col">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={cn(
                'flex shrink-0 items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors',
                section === id
                  ? 'bg-brand-50 text-brand-900'
                  : 'text-content-secondary hover:bg-surface-hover hover:text-content'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Section content */}
        <div className="min-w-0 flex-1 space-y-6">
          {section === 'account' && <AccountSection />}
          {section === 'security' && <SecuritySection />}
          {section === 'notifications' && <NotificationsSection />}
          {section === 'privacy' && <PrivacySection />}
          {section === 'preferences' && <PreferencesSection />}
        </div>
      </div>
    </PageLayout>
  )
}

// ── Shared row component ──────────────────────────────────────────────────

function SettingsRow({
  icon: Icon,
  title,
  description,
  value,
  action,
  destructive,
  onClick,
}: {
  icon: LucideIcon
  title: string
  description?: string
  value?: string
  action?: React.ReactNode
  destructive?: boolean
  onClick?: () => void
}) {
  const Component = onClick ? 'button' : 'div'
  return (
    <Component
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 border-b border-line-subtle px-4 py-4 text-left transition-colors last:border-0',
        onClick && 'hover:bg-surface-hover',
        destructive && 'text-danger-strong'
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          destructive ? 'bg-danger-soft text-danger-strong' : 'bg-brand-50 text-brand-900'
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', destructive ? 'text-danger-strong' : 'text-content')}>
          {title}
        </p>
        {description && (
          <p className={cn('mt-0.5 text-xs', destructive ? 'text-danger-strong/80' : 'text-content-muted')}>
            {description}
          </p>
        )}
      </div>
      {value && <span className="shrink-0 text-sm text-content-secondary">{value}</span>}
      {action && <div className="shrink-0">{action}</div>}
      {onClick && !action && <ChevronRight className="h-4 w-4 shrink-0 text-content-muted/60" />}
    </Component>
  )
}

// ── Account section ───────────────────────────────────────────────────────

function AccountSection() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const token = await getToken()
      return api.profile.get(token!) as Promise<UserProfile>
    },
  })
  void profile

  return (
    <Card padding="none">
      <div className="border-b border-line-subtle px-5 py-4">
        <h2 className="text-base font-semibold text-content">Account details</h2>
      </div>
      <div className="px-4 py-2">
        <SettingsRow
          icon={UserCog}
          title="Sign-in email"
          description="The email you use to sign in"
          value={user?.primaryEmailAddress?.emailAddress ?? '—'}
        />
        <SettingsRow
          icon={UserCog}
          title="Name"
          description="Your account name"
          value={user?.fullName ?? user?.firstName ?? '—'}
        />
        <SettingsRow
          icon={UserCog}
          title="Member since"
          value={user?.createdAt ? formatDate(user.createdAt.toISOString()) : '—'}
        />
      </div>
    </Card>
  )
}

// ── Notifications (placeholder) ───────────────────────────────────────────

function NotificationsSection() {
  return (
    <Card padding="none">
      <div className="border-b border-line-subtle px-5 py-4">
        <h2 className="text-base font-semibold text-content">Notifications</h2>
      </div>
      <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
        <Bell className="h-8 w-8 text-content-muted" />
        <p className="text-sm text-content-secondary">
          Notification preferences are coming soon. You currently receive important account and
          security updates by email.
        </p>
      </div>
    </Card>
  )
}

// ── Privacy & data ────────────────────────────────────────────────────────

function PrivacySection() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()
  const queryClient = useQueryClient()
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Data export — downloads the user's full data as JSON
  const exportMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return api.profile.exportData(token!)
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      a.download = `equiscore-data-${new Date().toISOString().slice(0, 10)}.json`
      window.document.body.appendChild(a)
      a.click()
      window.document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
  })

  // Account deletion — deletes DB user (cascades all data) + Clerk user
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      // 1. Delete the DB user (revokes shares, cascades all owned data)
      await api.profile.deleteAccount(token!)
      // 2. Delete the Clerk identity
      await user?.delete()
    },
    onSuccess: () => {
      void queryClient.clear()
      void signOut({ redirectUrl: '/' })
    },
    onError: (err) => {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account.')
    },
  })

  return (
    <>
      {/* Privacy controls */}
      <Card padding="none">
        <div className="border-b border-line-subtle px-5 py-4">
          <h2 className="text-base font-semibold text-content">Privacy controls</h2>
        </div>
        <div className="px-4 py-2">
          <SettingsRow
            icon={Download}
            title="Download my data"
            description="Export a copy of your EquiScore data as a JSON file"
            action={
              exportMutation.isPending ? (
                <span className="text-sm text-content-muted">Preparing…</span>
              ) : (
                <span
                  className="cursor-pointer text-sm font-medium text-brand-900"
                >
                  Download
                </span>
              )
            }
            onClick={() => exportMutation.mutate()}
          />
        </div>
      </Card>

      {/* Danger zone */}
      <Card padding="none">
        <div className="border-b border-danger-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-danger-strong">
            <AlertTriangle className="h-4 w-4" />
            Danger zone
          </h2>
        </div>
        <div className="px-4 py-2">
          {!deleteConfirm ? (
            <SettingsRow
              icon={X}
              title="Delete account"
              description="Permanently delete your EquiScore account and data. This cannot be undone."
              destructive
              action={
                <span className="rounded-lg border border-danger-border px-3 py-1.5 text-sm font-medium text-danger-strong">
                  Delete
                </span>
              }
              onClick={() => {
                setDeleteError('')
                setDeleteConfirm(true)
              }}
            />
          ) : (
            <div className="px-4 py-5">
              <div className="flex items-start gap-3 rounded-lg bg-danger-soft p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger-strong" />
                <div>
                  <p className="text-sm font-semibold text-danger-strong">
                    Delete your EquiScore account?
                  </p>
                  <p className="mt-1 text-sm text-danger-strong/90">
                    This will permanently remove your account, your Trust Profile, and revoke any
                    active sharing links. Some information may need to be retained where legally
                    required. This cannot be undone.
                  </p>
                  {deleteError && (
                    <p className="mt-2 text-xs text-danger-strong">{deleteError}</p>
                  )}
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      disabled={deleteMutation.isPending}
                      className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-content transition-colors hover:bg-surface-hover disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      className="rounded-lg bg-danger-strong px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                    >
                      {deleteMutation.isPending ? 'Deleting…' : 'Delete account permanently'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </>
  )
}

// ── Preferences (placeholder) ─────────────────────────────────────────────

function PreferencesSection() {
  return (
    <Card padding="none">
      <div className="border-b border-line-subtle px-5 py-4">
        <h2 className="text-base font-semibold text-content">Preferences</h2>
      </div>
      <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
        <SlidersHorizontal className="h-8 w-8 text-content-muted" />
        <p className="text-sm text-content-secondary">
          Preferences like language and timezone will be available here soon.
        </p>
      </div>
    </Card>
  )
}
