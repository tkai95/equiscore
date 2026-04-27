'use client'

import { useAuth, useUser, SignOutButton } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { LogOut, User, Shield, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <h2 className="mb-4 font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  )
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account and profile preferences.</p>
      </div>

      {/* Account details */}
      <SectionCard title="Account">
        <SettingsRow label="Email address" value={user?.primaryEmailAddress?.emailAddress ?? '—'} />
        <SettingsRow
          label="Name"
          value={user?.fullName ?? user?.firstName ?? '—'}
        />
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
                    className={
                      done
                        ? 'h-2.5 w-2.5 rounded-full bg-brand'
                        : 'h-2.5 w-2.5 rounded-full border-2 border-gray-200'
                    }
                  />
                  <span
                    className={
                      current
                        ? 'text-sm font-semibold text-brand'
                        : done
                        ? 'text-sm text-gray-700'
                        : 'text-sm text-gray-400'
                    }
                  >
                    {STAGE_LABELS[stage]}
                  </span>
                  {current && (
                    <span className="rounded-full bg-cream px-2 py-0.5 text-xs font-medium text-brand border border-[#D8D6C9]">
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
            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <div className="flex items-center gap-2.5">
              <User className="h-4 w-4 text-gray-400" />
              Edit profile information
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </a>
          <a
            href="/dashboard/share"
            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <div className="flex items-center gap-2.5">
              <Shield className="h-4 w-4 text-gray-400" />
              Manage share links
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </a>
        </div>
      </SectionCard>

      {/* Sign out */}
      <SectionCard title="Session">
        <SignOutButton redirectUrl="/sign-in">
          <button className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </SignOutButton>
      </SectionCard>
    </div>
  )
}
