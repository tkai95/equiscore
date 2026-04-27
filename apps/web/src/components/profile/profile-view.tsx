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
import { User, MapPin, Briefcase, Home, Edit2, Check, X } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'

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

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  onEdit,
}: {
  icon: React.ElementType
  title: string
  onEdit: () => void
}) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cream">
          <Icon className="h-4 w-4 text-brand" />
        </div>
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      <button
        onClick={onEdit}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        <Edit2 className="h-3 w-3" />
        Edit
      </button>
    </div>
  )
}

function EditForm({
  profile,
  onSave,
  onCancel,
  isPending,
}: {
  profile: UserProfile
  onSave: (data: UpdateProfileData) => void
  onCancel: () => void
  isPending: boolean
}) {
  const form = useForm<UpdateProfileData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: profile.fullName ?? '',
      dob: profile.dob ? profile.dob.slice(0, 10) : '',
      nationality: profile.nationality ?? '',
      residencyStatus: (profile.residencyStatus as UpdateProfileData['residencyStatus']) ?? undefined,
      employmentType: (profile.employmentType as UpdateProfileData['employmentType']) ?? undefined,
      monthlyIncomeDeclared: profile.monthlyIncomeDeclared ?? undefined,
      monthlyRentDeclared: profile.monthlyRentDeclared ?? undefined,
    },
  })

  const inputClass =
    'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'
  const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700'

  return (
    <form onSubmit={form.handleSubmit(onSave)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Full name</label>
          <input {...form.register('fullName')} className={inputClass} />
          {form.formState.errors.fullName && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.fullName.message}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Date of birth</label>
          <input type="date" {...form.register('dob')} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Nationality</label>
          <input {...form.register('nationality')} className={inputClass} />
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
          <input
            type="number"
            step="1"
            min="0"
            {...form.register('monthlyIncomeDeclared', { valueAsNumber: true })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Monthly rent (£)</label>
          <input
            type="number"
            step="1"
            min="0"
            {...form.register('monthlyRentDeclared', { valueAsNumber: true })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-cream-surface hover:bg-brand-dark disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

export function ProfileView() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)

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
      setIsEditing(false)
    },
  })

  const currentAddress = addresses.find((a) => a.isCurrent)
  const currentEmployment = employment.find((e) => e.isCurrent)

  if (profileLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
        <p className="mb-4 text-gray-500">No profile found. Complete onboarding to get started.</p>
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-cream-surface hover:bg-brand-dark"
        >
          Start onboarding
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My profile</h1>
          <p className="text-sm text-gray-500">Last updated {formatDate(profile.updatedAt)}</p>
        </div>
      </div>

      {/* Personal info */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        {!isEditing ? (
          <>
            <SectionHeader icon={User} title="Personal information" onEdit={() => setIsEditing(true)} />
            <dl className="grid gap-y-4 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Full name" value={profile.fullName} />
              <Field label="Date of birth" value={profile.dob ? formatDate(profile.dob) : null} />
              <Field label="Nationality" value={profile.nationality} />
              <Field
                label="Residency status"
                value={profile.residencyStatus ? RESIDENCY_LABELS[profile.residencyStatus] : null}
              />
              <Field
                label="Employment type"
                value={profile.employmentType ? EMPLOYMENT_LABELS[profile.employmentType] : null}
              />
              <Field
                label="Monthly income"
                value={profile.monthlyIncomeDeclared != null ? formatCurrency(profile.monthlyIncomeDeclared) : null}
              />
              <Field
                label="Monthly rent"
                value={profile.monthlyRentDeclared != null ? formatCurrency(profile.monthlyRentDeclared) : null}
              />
            </dl>
          </>
        ) : (
          <>
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cream">
                <User className="h-4 w-4 text-brand" />
              </div>
              <h2 className="font-semibold text-gray-900">Edit personal information</h2>
            </div>
            <EditForm
              profile={profile}
              onSave={(data) => updateMutation.mutate(data)}
              onCancel={() => setIsEditing(false)}
              isPending={updateMutation.isPending}
            />
            {updateMutation.isError && (
              <p className="mt-3 text-sm text-red-600">
                Failed to save — {(updateMutation.error as Error).message}
              </p>
            )}
          </>
        )}
      </div>

      {/* Address */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cream">
            <MapPin className="h-4 w-4 text-brand" />
          </div>
          <h2 className="font-semibold text-gray-900">Current address</h2>
        </div>
        {currentAddress ? (
          <dl className="grid gap-y-4 gap-x-8 sm:grid-cols-2">
            <Field label="Address line 1" value={currentAddress.addressLine1} />
            {currentAddress.addressLine2 && (
              <Field label="Address line 2" value={currentAddress.addressLine2} />
            )}
            <Field label="City" value={currentAddress.city} />
            <Field label="Postcode" value={currentAddress.postcode} />
          </dl>
        ) : (
          <p className="text-sm text-gray-500">No address on record. Complete onboarding to add one.</p>
        )}
      </div>

      {/* Employment detail */}
      {currentEmployment && (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cream">
              <Briefcase className="h-4 w-4 text-brand" />
            </div>
            <h2 className="font-semibold text-gray-900">Employment detail</h2>
          </div>
          <dl className="grid gap-y-4 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Employment type"
              value={EMPLOYMENT_LABELS[currentEmployment.employmentType] ?? currentEmployment.employmentType}
            />
            <Field label="Employer" value={currentEmployment.employerName} />
            <Field label="Job title" value={currentEmployment.jobTitle} />
            <Field
              label="Monthly income"
              value={currentEmployment.monthlyIncomeDeclared != null ? formatCurrency(currentEmployment.monthlyIncomeDeclared) : null}
            />
          </dl>
        </div>
      )}
    </div>
  )
}
