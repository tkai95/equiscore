'use client'

import { useAuth, useUser, SignOutButton } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { LogOut } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Card, PageLayout, PageTitle } from '@/components/ui'

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

  // Suppress unused warning; profile is fetched for future Settings sections
  // (account details derived from EquiScore profile). Kept on purpose.
  void profile

  return (
    <PageLayout>
      <div>
        <PageTitle>Settings</PageTitle>
        <p className="mt-1 text-sm text-content-secondary">
          Manage your account, security, privacy and preferences.
        </p>
      </div>

      {/* Account details */}
      <SectionCard title="Account">
        <SettingsRow
          label="Sign-in email"
          value={user?.primaryEmailAddress?.emailAddress ?? '—'}
        />
        <SettingsRow label="Name" value={user?.fullName ?? user?.firstName ?? '—'} />
        <SettingsRow
          label="Member since"
          value={user?.createdAt ? formatDate(user.createdAt.toISOString()) : '—'}
        />
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
