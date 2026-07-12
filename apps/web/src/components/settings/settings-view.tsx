'use client'

import { useAuth, useUser, SignOutButton } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { LogOut, User, Shield, ChevronRight } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { Card, PageLayout, PageTitle } from '@/components/ui'

const STAGE_LABELS: Record<string, string> = {
  created: 'Account created',
  onboarding: 'Completing onboarding',
  profile_building: 'Building profile',
  banking_connected: 'Bank connected',
  documents_uploaded: 'Documents uploaded',
  scored: 'Trust score generated',
  complete: 'Profile complete',
}

const STAGE_ORDER = [
  'created',
  'onboarding',
  'profile_building',
  'banking_connected',
  'documents_uploaded',
  'scored',
  'complete',
]

interface UserProfile {
  profileStage: string
  createdAt: string
}

/** Report-style panel: heading, hairline divider, then content. */
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card padding="none">
      <div className="border-b border-line-subtle px-5 py-4">
        <h2 className="text-base font-semibold text-content">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </Card>
  )
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line-subtle py-3 first:pt-0 last:border-0 last:pb-0">
      <span className="text-sm text-content-secondary">{label}</span>
      <span className="text-sm font-medium text-content">{value}</span>
    </div>
  )
}

export function SettingsView() {
  const { getToken } = useAuth()
  const { user } = useUser()

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const token = await getToken()
      return api.profile.get(token!) as Promise<UserProfile>
    },
  })

  const stageIndex = STAGE_ORDER.indexOf(profile?.profileStage ?? 'created')

  return (
    <PageLayout>
      <div>
        <PageTitle>Settings</PageTitle>
        <p className="mt-1 text-sm text-content-secondary">Manage your account and profile preferences.</p>
      </div>

      {/* Account details */}
      <SectionCard title="Account">
        <SettingsRow label="Email address" value={user?.primaryEmailAddress?.emailAddress ?? '—'} />
        <SettingsRow label="Name" value={user?.fullName ?? user?.firstName ?? '—'} />
        <SettingsRow
          label="Member since"
          value={user?.createdAt ? formatDate(user.createdAt.toISOString()) : '—'}
        />
      </SectionCard>

      {/* Profile stage */}
      {profile && (
        <SectionCard title="Profile progress">
          <div className="space-y-3">
            {STAGE_ORDER.map((stage, i) => {
              const done = i <= stageIndex
              const current = i === stageIndex
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-2.5 w-2.5 rounded-full',
                      done ? 'bg-brand' : 'border border-line bg-surface-inset',
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm',
                      current
                        ? 'font-semibold text-brand-900'
                        : done
                          ? 'text-content'
                          : 'text-content-muted',
                    )}
                  >
                    {STAGE_LABELS[stage]}
                  </span>
                  {current && (
                    <span className="rounded-lg bg-brand px-2 py-0.5 text-xs font-medium text-cream-surface">
                      Current
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}

      {/* Links */}
      <SectionCard title="Account management">
        <div className="space-y-1">
          <a
            href="/dashboard/profile"
            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-content transition-colors hover:bg-surface-hover"
          >
            <div className="flex items-center gap-2.5">
              <User className="h-4 w-4 text-content-muted" />
              Edit profile information
            </div>
            <ChevronRight className="h-4 w-4 text-content-muted/60" />
          </a>
          <a
            href="/dashboard/share"
            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-content transition-colors hover:bg-surface-hover"
          >
            <div className="flex items-center gap-2.5">
              <Shield className="h-4 w-4 text-content-muted" />
              Manage share links
            </div>
            <ChevronRight className="h-4 w-4 text-content-muted/60" />
          </a>
        </div>
      </SectionCard>

      {/* Sign out */}
      <SectionCard title="Session">
        <SignOutButton redirectUrl="/sign-in">
          <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-danger-border px-4 text-sm font-medium text-danger-strong transition-colors hover:bg-danger-soft">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </SignOutButton>
      </SectionCard>
    </PageLayout>
  )
}
