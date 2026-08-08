'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '@/lib/api'
import { updateProfileSchema } from '@equiscore/shared'
import type { UpdateProfileData } from '@equiscore/shared'
import Link from 'next/link'
import { User, MapPin, Briefcase, Edit2, type LucideIcon } from 'lucide-react'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import { Button, buttonClasses, Card, PageLayout, Drawer } from '@/components/ui'

const RESIDENCY_LABELS: Record<string, string> = {
  british_citizen: 'British Citizen',
  settled_status: 'Settled Status (ILR)',
  pre_settled_status: 'Pre-Settled Status',
  student_visa: 'Student Visa',
  work_visa: 'Work Visa',
  refugee: 'Refugee',
  asylum_seeker: 'Asylum Seeker',
  other: 'Other',
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  employed_full_time: 'Employed (Full-time)',
  employed_part_time: 'Employed (Part-time)',
  self_employed: 'Self-employed',
  gig_worker: 'Gig Worker',
  student: 'Student',
  graduate: 'Graduate',
  unemployed: 'Unemployed',
  other: 'Other',
}

interface UserProfile {
  firstName: string | null
  lastName: string | null
  fullName: string | null
  dob: string | null
  nationality: string | null
  residencyStatus: string | null
  employmentType: string | null
  monthlyIncomeDeclared: number | null
  monthlyRentDeclared: number | null
  profileStage: string
  updatedAt: string
}

interface Address {
  addressLine1: string
  addressLine2: string | null
  city: string
  postcode: string
  isCurrent: boolean
}

interface Employment {
  employmentType: string
  employerName: string | null
  jobTitle: string | null
  monthlyIncomeDeclared: number | null
  isCurrent: boolean
}

// ── Shared primitives ─────────────────────────────────────────────────────

/** Profile section card: icon + title + Edit button, then content. */
function ProfileSectionCard({
  icon: Icon,
  title,
  onEdit,
  children,
}: {
  icon: LucideIcon
  title: string
  onEdit?: () => void
  children: React.ReactNode
}) {
  return (
    <Card padding="none">
      <div className="flex items-center justify-between gap-4 border-b border-line-subtle px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-900">
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
          <h2 className="text-base font-semibold text-content">{title}</h2>
        </div>
        {onEdit && (
          <Button variant="secondary" size="sm" onClick={onEdit}>
            <Edit2 className="h-3 w-3" />
            Edit
          </Button>
        )}
      </div>
      <div className="px-5 py-5">{children}</div>
    </Card>
  )
}

/** A single labelled value. Empty values show "Not added" instead of a dash. */
function ProfileField({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value != null && value !== '' ? value : null
  return (
    <div>
      <dt className="text-sm font-medium text-content-muted">{label}</dt>
      <dd className={cn('mt-0.5 text-sm', display ? 'text-content' : 'text-content-muted/70')}>
        {display ?? 'Not added'}
      </dd>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-line px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'
const labelClass = 'mb-1.5 block text-sm font-medium text-content'

// ── Edit drawers ──────────────────────────────────────────────────────────

function EditPersonalDrawer({
  profile,
  open,
  onOpenChange,
  onSave,
  isPending,
}: {
  profile: UserProfile
  open: boolean
  onOpenChange: (o: boolean) => void
  onSave: (data: UpdateProfileData) => void
  isPending: boolean
}) {
  const form = useForm<UpdateProfileData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      dob: profile.dob ? profile.dob.slice(0, 10) : '',
      nationality: profile.nationality ?? '',
      residencyStatus: (profile.residencyStatus as UpdateProfileData['residencyStatus']) ?? undefined,
    },
  })

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Edit personal information" subtitle="Update your personal details and how EquiScore identifies you.">
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>First name</label>
            <input {...form.register('firstName')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Last name</label>
            <input {...form.register('lastName')} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Date of birth</label>
          <input type="date" {...form.register('dob')} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Nationality</label>
          <input {...form.register('nationality')} className={inputClass} placeholder="e.g. British, Nigerian" />
        </div>
        <div>
          <label className={labelClass}>Residency status</label>
          <select {...form.register('residencyStatus')} className={inputClass}>
            <option value="">Select…</option>
            {Object.entries(RESIDENCY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-line-subtle pt-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isPending}>
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

function EditEmploymentDrawer({
  profile,
  open,
  onOpenChange,
  onSave,
  isPending,
}: {
  profile: UserProfile
  open: boolean
  onOpenChange: (o: boolean) => void
  onSave: (data: UpdateProfileData) => void
  isPending: boolean
}) {
  const form = useForm<UpdateProfileData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      employmentType: (profile.employmentType as UpdateProfileData['employmentType']) ?? undefined,
      monthlyIncomeDeclared: profile.monthlyIncomeDeclared ?? undefined,
      monthlyRentDeclared: profile.monthlyRentDeclared ?? undefined,
    },
  })

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Edit employment & income" subtitle="Update your employment status and declared income.">
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-5">
        <div>
          <label className={labelClass}>Employment type</label>
          <select {...form.register('employmentType')} className={inputClass}>
            <option value="">Select…</option>
            {Object.entries(EMPLOYMENT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Monthly income (£)</label>
          <input type="number" step="1" min="0" {...form.register('monthlyIncomeDeclared', { valueAsNumber: true })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Monthly rent (£)</label>
          <input type="number" step="1" min="0" {...form.register('monthlyRentDeclared', { valueAsNumber: true })} className={inputClass} />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-line-subtle pt-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isPending}>
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────

export function ProfileView() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [personalOpen, setPersonalOpen] = useState(false)
  const [employmentOpen, setEmploymentOpen] = useState(false)

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const token = await getToken()
      return api.profile.get(token!) as Promise<UserProfile>
    },
  })

  const { data: addresses = [] } = useQuery({
    queryKey: ['profile-addresses'],
    queryFn: async () => {
      const token = await getToken()
      return api.profile.getAddresses(token!) as Promise<Address[]>
    },
  })

  const { data: employment = [] } = useQuery({
    queryKey: ['profile-employment'],
    queryFn: async () => {
      const token = await getToken()
      return api.profile.getEmployment(token!) as Promise<Employment[]>
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const token = await getToken()
      return api.profile.update(token!, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
      setPersonalOpen(false)
      setEmploymentOpen(false)
    },
  })

  const currentAddress = addresses.find((a) => a.isCurrent)
  const currentEmployment = employment.find((e) => e.isCurrent)
  const displayName = profile?.firstName || profile?.lastName
    ? [profile?.firstName, profile?.lastName].filter(Boolean).join(' ')
    : profile?.fullName

  if (profileLoading) {
    return (
      <PageLayout>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-card bg-surface-hover" />
        ))}
      </PageLayout>
    )
  }

  if (!profile) {
    return (
      <PageLayout>
        <Card className="text-center" padding="lg">
          <p className="mb-4 text-content-secondary">No profile found. Complete onboarding to get started.</p>
          <Link href="/onboarding" className={buttonClasses('primary')}>
            Start onboarding
          </Link>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-content">My profile</h1>
        <p className="mt-1 text-sm text-content-secondary">
          Information used to build your Trust Profile.
          {profile.updatedAt && (
            <span className="text-content-muted"> · Last updated {formatDate(profile.updatedAt)}</span>
          )}
        </p>
      </div>

      {/* Personal information */}
      <ProfileSectionCard icon={User} title="Personal information" onEdit={() => setPersonalOpen(true)}>
        <dl className="grid gap-y-4 gap-x-8 sm:grid-cols-2">
          <ProfileField label="First name" value={profile.firstName} />
          <ProfileField label="Last name" value={profile.lastName} />
          <ProfileField label="Date of birth" value={profile.dob ? formatDate(profile.dob) : null} />
          <ProfileField label="Nationality" value={profile.nationality} />
          <ProfileField
            label="Residency status"
            value={profile.residencyStatus ? RESIDENCY_LABELS[profile.residencyStatus] : null}
          />
        </dl>
      </ProfileSectionCard>

      {/* Current address */}
      <ProfileSectionCard icon={MapPin} title="Current address">
        {currentAddress ? (
          <dl className="grid gap-y-4 gap-x-8 sm:grid-cols-2">
            <ProfileField label="Address line 1" value={currentAddress.addressLine1} />
            <ProfileField label="Address line 2" value={currentAddress.addressLine2} />
            <ProfileField label="City" value={currentAddress.city} />
            <ProfileField label="Postcode" value={currentAddress.postcode} />
          </dl>
        ) : (
          <p className="text-sm text-content-muted">Not added. Complete onboarding to add your address.</p>
        )}
      </ProfileSectionCard>

      {/* Employment & income */}
      <ProfileSectionCard icon={Briefcase} title="Employment & income" onEdit={() => setEmploymentOpen(true)}>
        <dl className="grid gap-y-4 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileField
            label="Employment type"
            value={profile.employmentType ? EMPLOYMENT_LABELS[profile.employmentType] : null}
          />
          <ProfileField label="Employer" value={currentEmployment?.employerName} />
          <ProfileField label="Job title" value={currentEmployment?.jobTitle} />
          <ProfileField
            label="Monthly income"
            value={profile.monthlyIncomeDeclared != null ? formatCurrency(profile.monthlyIncomeDeclared) : null}
          />
          <ProfileField
            label="Monthly rent"
            value={profile.monthlyRentDeclared != null ? formatCurrency(profile.monthlyRentDeclared) : null}
          />
        </dl>
      </ProfileSectionCard>

      {/* Edit drawers */}
      <EditPersonalDrawer
        profile={profile}
        open={personalOpen}
        onOpenChange={setPersonalOpen}
        onSave={(data) => updateMutation.mutate(data)}
        isPending={updateMutation.isPending}
      />
      <EditEmploymentDrawer
        profile={profile}
        open={employmentOpen}
        onOpenChange={setEmploymentOpen}
        onSave={(data) => updateMutation.mutate(data)}
        isPending={updateMutation.isPending}
      />
      {updateMutation.isError && (
        <p className="text-sm text-danger-strong">
          Failed to save — {(updateMutation.error as Error).message}
        </p>
      )}
    </PageLayout>
  )
}
