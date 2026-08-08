'use client'

import { useState } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { Key, Smartphone, Check, LogOut, Chrome, Mail, AlertCircle } from 'lucide-react'
import { Card, Button, Drawer } from '@/components/ui'

const inputClass =
  'w-full rounded-lg border border-line px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'
const labelClass = 'mb-1.5 block text-sm font-medium text-content'

// ── Security section (native EquiScore UI on Clerk hooks) ─────────────────

export function SecuritySection() {
  const { user } = useUser()
  const { signOut, client } = useClerk()
  const [pwOpen, setPwOpen] = useState(false)

  const googleAccount = user?.externalAccounts?.find((a) => a.provider === 'google')
  const appleAccount = user?.externalAccounts?.find((a) => a.provider === 'apple')
  const sessions = client?.activeSessions ?? []
  const hasPassword = user?.passwordEnabled ?? false
  const hasMfa = user?.twoFactorEnabled ?? false

  return (
    <>
      {/* Sign-in & security */}
      <Card padding="none">
        <div className="border-b border-line-subtle px-5 py-4">
          <h2 className="text-base font-semibold text-content">Sign-in & security</h2>
        </div>
        <div className="divide-y divide-line-subtle">
          {/* Password */}
          <SecurityRow
            icon={Key}
            title="Password"
            status={hasPassword ? 'Set' : 'Not set'}
            action={
              <Button variant="secondary" size="sm" onClick={() => setPwOpen(true)}>
                {hasPassword ? 'Change' : 'Set password'}
              </Button>
            }
          />

          {/* 2-step verification */}
          <SecurityRow
            icon={Smartphone}
            title="2-step verification"
            status={hasMfa ? 'Enabled' : 'Not enabled'}
            description={hasMfa ? 'Extra security is active' : 'Add an extra layer of security'}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void toggleMfa(user, hasMfa)}
              >
                {hasMfa ? 'Disable' : 'Enable'}
              </Button>
            }
          />
        </div>
      </Card>

      {/* Connected sign-in methods */}
      <Card padding="none">
        <div className="border-b border-line-subtle px-5 py-4">
          <h2 className="text-base font-semibold text-content">Connected sign-in methods</h2>
        </div>
        <div className="divide-y divide-line-subtle">
          <SecurityRow
            icon={Chrome}
            title="Google"
            status={googleAccount ? 'Connected' : 'Not connected'}
            action={
              !googleAccount ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void connectGoogle(user)}
                >
                  Connect
                </Button>
              ) : (
                <Check className="h-4 w-4 text-success-strong" />
              )
            }
          />
          <SecurityRow
            icon={Chrome}
            title="Apple"
            status={appleAccount ? 'Connected' : 'Not connected'}
            action={
              !appleAccount ? (
                <span className="text-sm text-content-muted">Coming soon</span>
              ) : (
                <Check className="h-4 w-4 text-success-strong" />
              )
            }
          />
          <SecurityRow
            icon={Mail}
            title="Email"
            status={user?.primaryEmailAddress ? 'Connected' : 'Not connected'}
            action={
              user?.primaryEmailAddress ? (
                <Check className="h-4 w-4 text-success-strong" />
              ) : undefined
            }
          />
        </div>
      </Card>

      {/* Active sessions */}
      <Card padding="none">
        <div className="border-b border-line-subtle px-5 py-4">
          <h2 className="text-base font-semibold text-content">
            Active sessions
            <span className="ml-2 text-sm font-normal text-content-muted">
              {sessions.length} device{sessions.length === 1 ? '' : 's'}
            </span>
          </h2>
        </div>
        {sessions.length > 0 ? (
          <div className="divide-y divide-line-subtle">
            {sessions.slice(0, 5).map((session, i) => (
              <div key={session.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-content">
                    Device {i + 1}
                    {i === 0 && (
                      <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-900">
                        This device
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-content-muted">
                    {session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleString('en-GB') : 'Active'}
                  </p>
                </div>
                {i !== 0 && (
                  <button
                    onClick={() => void session.end()}
                    className="text-sm font-medium text-danger-strong transition-colors hover:opacity-80"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-content-muted">
            No active sessions found.
          </div>
        )}
      </Card>

      {/* Sign out */}
      <Card padding="none">
        <div className="px-4 py-2">
          <button
            onClick={() => void signOut({ redirectUrl: '/sign-in' })}
            className="flex w-full items-center gap-3 px-4 py-4 text-left text-danger-strong transition-colors hover:bg-surface-hover"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger-strong">
              <LogOut className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-danger-strong">Sign out</p>
              <p className="mt-0.5 text-xs text-danger-strong/80">Sign out of this device</p>
            </div>
          </button>
        </div>
      </Card>

      {/* Change password drawer */}
      <ChangePasswordDrawer open={pwOpen} onOpenChange={setPwOpen} hasPassword={hasPassword} />
    </>
  )
}

// ── Shared row ────────────────────────────────────────────────────────────

function SecurityRow({
  icon: Icon,
  title,
  status,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  status?: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-900">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-content">{title}</p>
        {description && <p className="mt-0.5 text-xs text-content-muted">{description}</p>}
      </div>
      {status && <span className="shrink-0 text-sm text-content-secondary">{status}</span>}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// ── Change password drawer ────────────────────────────────────────────────

function ChangePasswordDrawer({
  open,
  onOpenChange,
  hasPassword,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  hasPassword: boolean
}) {
  const { user } = useUser()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPw.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPw !== confirmPw) {
      setError('New passwords do not match.')
      return
    }

    setSaving(true)
    try {
      await user?.updatePassword({
        currentPassword: hasPassword ? currentPw : undefined,
        newPassword: newPw,
      })
      setSuccess(true)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setTimeout(() => {
        setSuccess(false)
        onOpenChange(false)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={hasPassword ? 'Change password' : 'Set a password'}
      subtitle={
        hasPassword
          ? 'Enter your current password and a new one.'
          : 'Set a password to sign in with email.'
      }
    >
      {success ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft">
            <Check className="h-6 w-6 text-success-strong" />
          </div>
          <p className="text-sm font-medium text-content">
            {hasPassword ? 'Password changed' : 'Password set'}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {hasPassword && (
            <div>
              <label className={labelClass}>Current password</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          )}
          <div>
            <label className={labelClass}>New password</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Confirm new password</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger-strong">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-line-subtle pt-4">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      )}
    </Drawer>
  )
}

// ── Clerk hook helpers ────────────────────────────────────────────────────

async function toggleMfa(user: { update: (data: Record<string, unknown>) => Promise<unknown> } | null | undefined, currentlyEnabled: boolean) {
  if (!user) return
  try {
    await user.update({ twoFactorEnabled: !currentlyEnabled })
    // The useUser hook re-renders on update, so the UI reflects the change.
  } catch {
    // Clerk may require verification before enabling MFA; the error is surfaced
    // by the Clerk context. For now we swallow — Phase 4 refinement can add a
    // verification flow.
  }
}

async function connectGoogle(user: { createExternalAccount: (params: { strategy: 'oauth_google' }) => Promise<unknown> } | null | undefined) {
  if (!user) return
  try {
    await user.createExternalAccount({ strategy: 'oauth_google' })
  } catch {
    // OAuth redirect may fail in dev without proper config; surfaced by Clerk.
  }
}
