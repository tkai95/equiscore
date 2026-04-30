'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  X,
  ArrowRight,
  ArrowLeft,
  Building2,
  User,
  CheckCircle2,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

type ProfileType = 'individual' | 'business'

interface IndividualData {
  email: string
  useCase: string[]
  currentCountry: string
  lastCountry: string
  problem: string
  consent: boolean
}

interface BusinessData {
  email: string
  orgType: string
  intendedUse: string[]
  applicantVolume: string
  problem: string
  consent: boolean
}

// ── Static options ───────────────────────────────────────────────────────────

const INDIVIDUAL_USE_CASES = [
  'Renting a property',
  'Applying for credit or finance',
  'Proving overseas financial history',
  'Building trust as a freelancer / gig worker',
  'Moving to a new country',
  'Other',
]

const ORG_TYPES = [
  'Landlord',
  'Letting agent',
  'Lender / finance provider',
  'Employer',
  'Relocation company',
  'University / student accommodation',
  'Other',
]

const BUSINESS_USE_CASES = [
  'Assess tenant applications',
  'Assess credit / finance applicants',
  'Verify overseas financial history',
  'Support migrant / international applicants',
  'Reduce manual document checks',
  'Other',
]

const APPLICANT_VOLUMES = ['1–10', '11–50', '51–250', '250+']

const COUNTRIES = [
  'United Kingdom',
  'Australia',
  'Bangladesh',
  'Barbados',
  'Belgium',
  'Brazil',
  'Bulgaria',
  'Canada',
  'China',
  'Colombia',
  'Czech Republic',
  'Denmark',
  'Egypt',
  'Estonia',
  'France',
  'Germany',
  'Ghana',
  'Hong Kong',
  'Hungary',
  'India',
  'Ireland',
  'Italy',
  'Jamaica',
  'Japan',
  'Kenya',
  'Latvia',
  'Lithuania',
  'Malaysia',
  'Mexico',
  'Netherlands',
  'New Zealand',
  'Nigeria',
  'Norway',
  'Pakistan',
  'Philippines',
  'Poland',
  'Romania',
  'Saudi Arabia',
  'Slovakia',
  'South Africa',
  'South Korea',
  'Spain',
  'Sri Lanka',
  'Sweden',
  'Trinidad and Tobago',
  'UAE',
  'United States',
  'Zimbabwe',
  'Other',
]

// ── Sub-components ───────────────────────────────────────────────────────────

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all duration-200',
            i === current - 1
              ? 'w-4 bg-brand'
              : i < current - 1
                ? 'w-1.5 bg-brand/40'
                : 'w-1.5 bg-[#D8D6C9]',
          )}
        />
      ))}
    </div>
  )
}

function StepHeader({
  step,
  total,
  title,
  subtitle,
}: {
  step: number
  total: number
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center justify-between pr-8">
        <StepDots total={total} current={step} />
        <span className="text-xs text-charcoal-mid">
          {step} of {total}
        </span>
      </div>
      <h2 className="text-xl font-bold text-charcoal">{title}</h2>
      {subtitle && <p className="mt-1.5 text-sm text-charcoal-mid">{subtitle}</p>}
    </div>
  )
}

function SelectOption({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all',
        selected
          ? 'border-brand bg-brand/5 text-brand'
          : 'border-[#D8D6C9] bg-cream-surface text-charcoal hover:border-brand/30 hover:bg-cream',
      )}
    >
      {label}
      {selected && <Check className="h-4 w-4 shrink-0 text-brand" />}
    </button>
  )
}

function MultiSelectOption({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all',
        selected
          ? 'border-brand bg-brand/5 text-brand'
          : 'border-[#D8D6C9] bg-cream-surface text-charcoal hover:border-brand/30 hover:bg-cream',
      )}
    >
      {label}
      <div
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
          selected ? 'border-brand bg-brand' : 'border-[#D8D6C9] bg-transparent',
        )}
      >
        {selected && <Check className="h-2.5 w-2.5 text-cream-surface" />}
      </div>
    </button>
  )
}

function CountrySelect({
  value,
  onChange,
  allowEmpty,
}: {
  value: string
  onChange: (v: string) => void
  allowEmpty?: boolean
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none rounded-xl border border-[#D8D6C9] bg-cream-surface px-4 py-3 text-sm text-charcoal outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10"
    >
      <option value="">{allowEmpty ? 'Select a country (optional)' : 'Select a country'}</option>
      {COUNTRIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  )
}

function ConsentCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <div className="mt-6 space-y-2">
      <label className="flex cursor-pointer items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
            checked ? 'border-brand bg-brand' : 'border-[#D8D6C9] bg-cream-surface hover:border-brand/40',
          )}
        >
          {checked && <Check className="h-3 w-3 text-cream-surface" />}
        </button>
        <span className="text-sm text-charcoal-mid">{label}</span>
      </label>
      <p className="pl-8 text-xs text-charcoal-mid/60">You can unsubscribe at any time.</p>
    </div>
  )
}

function ProfileTypeCard({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col items-start gap-4 rounded-2xl border border-[#D8D6C9] bg-cream-surface p-6 text-left transition-all hover:border-brand/40 hover:shadow-sm"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream transition-colors group-hover:bg-brand/10">
        <Icon className="h-5 w-5 text-brand" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-charcoal">{title}</p>
        <p className="mt-1 text-sm text-charcoal-mid">{desc}</p>
      </div>
      <div className="flex items-center gap-1 text-sm font-medium text-brand">
        Continue <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

const TOTAL_STEPS = 5

const INITIAL_IND: IndividualData = {
  email: '',
  useCase: [],
  currentCountry: '',
  lastCountry: '',
  problem: '',
  consent: false,
}

const INITIAL_BIZ: BusinessData = {
  email: '',
  orgType: '',
  intendedUse: [],
  applicantVolume: '',
  problem: '',
  consent: false,
}

interface RegisterInterestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RegisterInterestModal({ open, onOpenChange }: RegisterInterestModalProps) {
  const [profileType, setProfileType] = useState<ProfileType | null>(null)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [indData, setIndData] = useState<IndividualData>(INITIAL_IND)
  const [bizData, setBizData] = useState<BusinessData>(INITIAL_BIZ)

  const isSuccess = step === TOTAL_STEPS + 1

  function reset() {
    setProfileType(null)
    setStep(0)
    setSubmitError('')
    setSubmitting(false)
    setIndData(INITIAL_IND)
    setBizData(INITIAL_BIZ)
  }

  function handleClose() {
    onOpenChange(false)
    setTimeout(reset, 300)
  }

  function handleProfileType(type: ProfileType) {
    setProfileType(type)
    setStep(1)
  }

  function back() {
    if (step === 1) {
      setProfileType(null)
      setStep(0)
    } else {
      setStep((s) => s - 1)
    }
  }

  function next() {
    setStep((s) => s + 1)
  }

  async function submit() {
    setSubmitting(true)
    setSubmitError('')
    try {
      const payload =
        profileType === 'individual'
          ? { profileType, ...indData }
          : { profileType, ...bizData }

      const res = await fetch('/api/register-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed')
      setStep(TOTAL_STEPS + 1)
    } catch {
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function canProceed(): boolean {
    if (profileType === 'individual') {
      if (step === 1) return !!indData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(indData.email)
      if (step === 2) return indData.useCase.length > 0
      if (step === 3) return !!indData.currentCountry
      return true
    }
    if (profileType === 'business') {
      if (step === 1) return !!bizData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bizData.email)
      if (step === 2) return !!bizData.orgType
      if (step === 3) return bizData.intendedUse.length > 0
      return true
    }
    return true
  }

  function renderContent() {
    // ── Step 0: Profile type ──────────────────────────────────────────────
    if (step === 0) {
      return (
        <div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-charcoal">Who are you joining as?</h2>
            <p className="mt-2 text-sm text-charcoal-mid">
              We&apos;ll ask a few short questions based on your answer.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileTypeCard
              icon={User}
              title="Individual"
              desc="I want to build or share my own trust profile."
              onClick={() => handleProfileType('individual')}
            />
            <ProfileTypeCard
              icon={Building2}
              title="Business"
              desc="I want to assess applicants more fairly."
              onClick={() => handleProfileType('business')}
            />
          </div>
        </div>
      )
    }

    // ── Success ───────────────────────────────────────────────────────────
    if (isSuccess) {
      return (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
            <CheckCircle2 className="h-8 w-8 text-brand" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-charcoal">You&apos;re on the list.</h2>
          <p className="mb-8 max-w-xs text-sm leading-relaxed text-charcoal-mid">
            We&apos;ll let you know when EquiScore is live. We may also invite selected users to
            early access based on their use case and country corridor.
          </p>
          <button
            onClick={handleClose}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-8 py-3 text-sm font-semibold text-cream-surface transition-colors hover:bg-brand-dark"
          >
            Done
          </button>
        </div>
      )
    }

    // ── Individual steps ──────────────────────────────────────────────────
    if (profileType === 'individual') {
      if (step === 1) {
        return (
          <div>
            <StepHeader step={step} total={TOTAL_STEPS} title="Your email address" />
            <input
              type="email"
              value={indData.email}
              onChange={(e) => setIndData({ ...indData, email: e.target.value })}
              placeholder="you@example.com"
              autoFocus
              className="w-full rounded-xl border border-[#D8D6C9] bg-cream-surface px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-mid/50 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>
        )
      }

      if (step === 2) {
        return (
          <div>
            <StepHeader
              step={step}
              total={TOTAL_STEPS}
              title="What would you mainly use EquiScore for?"
              subtitle="Select all that apply."
            />
            <div className="flex flex-col gap-2">
              {INDIVIDUAL_USE_CASES.map((opt) => (
                <MultiSelectOption
                  key={opt}
                  label={opt}
                  selected={indData.useCase.includes(opt)}
                  onClick={() =>
                    setIndData({
                      ...indData,
                      useCase: indData.useCase.includes(opt)
                        ? indData.useCase.filter((u) => u !== opt)
                        : [...indData.useCase, opt],
                    })
                  }
                />
              ))}
            </div>
          </div>
        )
      }

      if (step === 3) {
        return (
          <div>
            <StepHeader step={step} total={TOTAL_STEPS} title="Where do you live now?" />
            <CountrySelect
              value={indData.currentCountry}
              onChange={(v) => setIndData({ ...indData, currentCountry: v })}
            />
          </div>
        )
      }

      if (step === 4) {
        return (
          <div>
            <StepHeader
              step={step}
              total={TOTAL_STEPS}
              title="What was the last country you lived in?"
              subtitle="Optional. This helps us understand your financial history context."
            />
            <CountrySelect
              value={indData.lastCountry}
              onChange={(v) => setIndData({ ...indData, lastCountry: v })}
              allowEmpty
            />
          </div>
        )
      }

      if (step === 5) {
        return (
          <div>
            <StepHeader
              step={step}
              total={TOTAL_STEPS}
              title="What problem are you trying to solve?"
              subtitle="Optional."
            />
            <textarea
              value={indData.problem}
              onChange={(e) => setIndData({ ...indData, problem: e.target.value })}
              placeholder="e.g. &ldquo;I moved to the UK recently and my credit file does not reflect my income or rent history.&rdquo;"
              rows={4}
              className="w-full resize-none rounded-xl border border-[#D8D6C9] bg-cream-surface px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-mid/50 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
            <ConsentCheckbox
              checked={indData.consent}
              onChange={(v) => setIndData({ ...indData, consent: v })}
              label="Notify me when EquiScore is live and about early access updates."
            />
          </div>
        )
      }
    }

    // ── Business steps ────────────────────────────────────────────────────
    if (profileType === 'business') {
      if (step === 1) {
        return (
          <div>
            <StepHeader step={step} total={TOTAL_STEPS} title="Your work email address" />
            <input
              type="email"
              value={bizData.email}
              onChange={(e) => setBizData({ ...bizData, email: e.target.value })}
              placeholder="you@company.com"
              autoFocus
              className="w-full rounded-xl border border-[#D8D6C9] bg-cream-surface px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-mid/50 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>
        )
      }

      if (step === 2) {
        return (
          <div>
            <StepHeader
              step={step}
              total={TOTAL_STEPS}
              title="What type of organisation are you?"
            />
            <div className="flex flex-col gap-2">
              {ORG_TYPES.map((opt) => (
                <SelectOption
                  key={opt}
                  label={opt}
                  selected={bizData.orgType === opt}
                  onClick={() => setBizData({ ...bizData, orgType: opt })}
                />
              ))}
            </div>
          </div>
        )
      }

      if (step === 3) {
        return (
          <div>
            <StepHeader
              step={step}
              total={TOTAL_STEPS}
              title="What would you use EquiScore for?"
              subtitle="Select all that apply."
            />
            <div className="flex flex-col gap-2">
              {BUSINESS_USE_CASES.map((opt) => (
                <MultiSelectOption
                  key={opt}
                  label={opt}
                  selected={bizData.intendedUse.includes(opt)}
                  onClick={() =>
                    setBizData({
                      ...bizData,
                      intendedUse: bizData.intendedUse.includes(opt)
                        ? bizData.intendedUse.filter((u) => u !== opt)
                        : [...bizData.intendedUse, opt],
                    })
                  }
                />
              ))}
            </div>
          </div>
        )
      }

      if (step === 4) {
        return (
          <div>
            <StepHeader
              step={step}
              total={TOTAL_STEPS}
              title="Roughly how many applicants do you assess per month?"
              subtitle="Optional."
            />
            <div className="flex flex-col gap-2">
              {APPLICANT_VOLUMES.map((opt) => (
                <SelectOption
                  key={opt}
                  label={opt}
                  selected={bizData.applicantVolume === opt}
                  onClick={() => setBizData({ ...bizData, applicantVolume: opt })}
                />
              ))}
            </div>
          </div>
        )
      }

      if (step === 5) {
        return (
          <div>
            <StepHeader
              step={step}
              total={TOTAL_STEPS}
              title="What problem are you trying to solve?"
              subtitle="Optional."
            />
            <textarea
              value={bizData.problem}
              onChange={(e) => setBizData({ ...bizData, problem: e.target.value })}
              placeholder="e.g. &ldquo;We struggle to assess applicants who have recently moved to the UK and have limited local credit history.&rdquo;"
              rows={4}
              className="w-full resize-none rounded-xl border border-[#D8D6C9] bg-cream-surface px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-mid/50 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
            <ConsentCheckbox
              checked={bizData.consent}
              onChange={(v) => setBizData({ ...bizData, consent: v })}
              label="Notify me when EquiScore is live and about pilot opportunities."
            />
          </div>
        )
      }
    }

    return null
  }

  const isLastStep = step === TOTAL_STEPS
  const submitLabel =
    profileType === 'individual' ? 'Join early access' : 'Register interest in a pilot'

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          onEscapeKeyDown={handleClose}
          onPointerDownOutside={step === 0 || isSuccess ? handleClose : undefined}
          className="fixed bottom-0 left-0 right-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-2xl bg-cream px-6 pb-8 pt-6 shadow-xl focus:outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-[88vh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:px-8 sm:pt-8 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95"
        >
          {/* Close button */}
          {!isSuccess && (
            <Dialog.Close asChild>
              <button
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-charcoal-mid transition-colors hover:bg-cream-surface hover:text-charcoal"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          )}

          {/* Content */}
          <div className="min-h-[280px]">{renderContent()}</div>

          {/* Navigation footer */}
          {step > 0 && !isSuccess && (
            <div className="mt-8 flex items-center justify-between border-t border-[#D8D6C9] pt-5">
              <button
                type="button"
                onClick={back}
                className="flex items-center gap-1.5 text-sm text-charcoal-mid transition-colors hover:text-charcoal"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>

              {isLastStep ? (
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting || !canProceed()}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-cream-surface transition-colors hover:bg-brand-dark disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : submitLabel}
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={next}
                  disabled={!canProceed()}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-cream-surface transition-colors hover:bg-brand-dark disabled:opacity-50"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {submitError && (
            <p className="mt-4 text-center text-sm text-red-600">{submitError}</p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Trigger button ───────────────────────────────────────────────────────────

interface RegisterInterestButtonProps {
  label?: string
  className?: string
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function RegisterInterestButton({
  label = 'Register your interest',
  className,
  variant = 'primary',
}: RegisterInterestButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors',
          variant === 'primary' &&
            'bg-brand px-6 py-3.5 text-base text-cream-surface shadow-sm hover:bg-brand-dark',
          variant === 'secondary' &&
            'border border-[#D8D6C9] bg-cream-surface px-6 py-3.5 text-base text-charcoal hover:bg-cream',
          variant === 'ghost' &&
            'rounded-lg bg-brand px-4 py-2 text-sm text-cream-surface hover:bg-brand-dark',
          className,
        )}
      >
        {label}
        {variant !== 'ghost' && <ArrowRight className="h-4 w-4" />}
      </button>
      <RegisterInterestModal open={open} onOpenChange={setOpen} />
    </>
  )
}
