'use client'

import { useState } from 'react'
import { useAuth, useUser, useClerk, SignOutButton } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  UserCog,
  Shield,
  Bell,
  Lock,
  SlidersHorizontal,
  LogOut,
  Key,
  Smartphone,
  Check,
  X,
  Download,
  AlertTriangle,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import { Card, PageLayout } from '@/components/ui'

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

// ── Security section ──────────────────────────────────────────────────────

function SecuritySection() {
  const { user } = useUser()
  const { signOut, openUserProfile } = useClerk()

  const connectedMethods = [
    { label: 'Google', connected: !!user?.externalAccounts?.find((a) => a.provider === 'google') },
    { label: 'Apple', connected: !!user?.externalAccounts?.find((a) => a.provider === 'apple') },
    { label: 'Email', connected: !!user?.primaryEmailAddress },
  ].filter((m) => m.connected)

  return (
    <>
      {/* Sign-in & security */}
      <Card padding="none">
        <div className="border-b border-line-subtle px-5 py-4">
          <h2 className="text-base font-semibold text-content">Sign-in & security</h2>
        </div>
        <div className="px-4 py-2">
          <SettingsRow
            icon={Key}
            title="Password"
            description={
              user?.passwordEnabled ? 'Password is set' : 'No password set'
            }
            value={user?.passwordEnabled ? 'Set' : 'Not set'}
            onClick={() => openUserProfile?.()}
          />
          <SettingsRow
            icon={Smartphone}
            title="2-step verification"
            description={
              user?.twoFactorEnabled
                ? 'Extra layer of security is active'
                : 'Add an extra layer of security'
            }
            value={user?.twoFactorEnabled ? 'Enabled' : 'Not enabled'}
            onClick={() => openUserProfile?.()}
          />
        </div>
      </Card>

      {/* Connected sign-in methods */}
      <Card padding="none">
        <div className="border-b border-line-subtle px-5 py-4">
          <h2 className="text-base font-semibold text-content">Connected sign-in methods</h2>
        </div>
        <div className="px-4 py-2">
          <SettingsRow
            icon={UserCog}
            title="Google"
            description="Sign in with your Google account"
            value={
              user?.externalAccounts?.find((a) => a.provider === 'google')
                ? 'Connected'
                : 'Not connected'
            }
            action={
              !user?.externalAccounts?.find((a) => a.provider === 'google') ? (
                <span className="text-sm font-medium text-brand-900">Connect</span>
              ) : (
                <Check className="h-4 w-4 text-success-strong" />
              )
            }
            onClick={() => openUserProfile?.()}
          />
          <SettingsRow
            icon={UserCog}
            title="Apple"
            description="Sign in with your Apple account"
            value={
              user?.externalAccounts?.find((a) => a.provider === 'apple')
                ? 'Connected'
                : 'Not connected'
            }
            action={
              !user?.externalAccounts?.find((a) => a.provider === 'apple') ? (
                <span className="text-sm font-medium text-brand-900">Connect</span>
              ) : (
                <Check className="h-4 w-4 text-success-strong" />
              )
            }
            onClick={() => openUserProfile?.()}
          />
          <SettingsRow
            icon={UserCog}
            title="Email"
            description="Your primary email address"
            value={
              user?.primaryEmailAddress ? 'Connected' : 'Not connected'
            }
            action={<Check className="h-4 w-4 text-success-strong" />}
          />
        </div>
      </Card>

      {/* Session */}
      <Card padding="none">
        <div className="border-b border-line-subtle px-5 py-4">
          <h2 className="text-base font-semibold text-content">Session</h2>
        </div>
        <div className="px-4 py-2">
          <SignOutButton redirectUrl="/sign-in">
            <button className="flex w-full items-center gap-3 border-b border-line-subtle px-4 py-4 text-left text-danger-strong transition-colors last:border-0 hover:bg-surface-hover">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger-strong">
                <LogOut className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-danger-strong">Sign out</p>
                <p className="mt-0.5 text-xs text-danger-strong/80">Sign out of this device</p>
              </div>
            </button>
          </SignOutButton>
        </div>
      </Card>
    </>
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
  const [deleteConfirm, setDeleteConfirm] = useState(false)

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
            description="Request a copy of your EquiScore data"
            action={<span className="text-sm font-medium text-brand-900">Request export</span>}
            onClick={() => alert('Data export is coming soon.')}
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
              onClick={() => setDeleteConfirm(true)}
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
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-content transition-colors hover:bg-surface-hover"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => alert('Account deletion requires verification. Please contact support@equiscore.app to complete this action.')}
                      className="rounded-lg bg-danger-strong px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
                    >
                      Delete account permanently
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
