'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '@/lib/api'
import { step1Schema, step2Schema, step3Schema, step4Schema } from '@equiscore/shared'
import type { Step1Data, Step2Data, Step3Data, Step4Data } from '@equiscore/shared'
import { Step1Personal } from './step-1-personal'
import { Step2Address } from './step-2-address'
import { Step3Employment } from './step-3-employment'
import { Step4Rental } from './step-4-rental'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 1, label: 'About you', optional: false },
  { id: 2, label: 'Address', optional: false },
  { id: 3, label: 'Work & income', optional: true },
  { id: 4, label: 'Housing', optional: true },
]

export function OnboardingWizard() {
  const { getToken } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<Partial<Step1Data & Step2Data & Step3Data & Step4Data>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const schemas = [step1Schema, step2Schema, step3Schema, step4Schema]
  const currentSchema = schemas[step - 1]!

  const form = useForm({ resolver: zodResolver(currentSchema as never), mode: 'onChange' })

  const handleNext = async (data: Record<string, unknown>) => {
    const merged = { ...formData, ...data }
    setFormData(merged)

    if (step < 4) {
      setStep(step + 1)
      return
    }

    // Final submission
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const token = await getToken()
      await api.profile.completeOnboarding(token!, merged)
      router.push('/dashboard?onboarding_complete=true')
    } catch (err) {
      console.error('Onboarding failed', err)
      setSubmitError("We couldn't save your profile. Please check your connection and try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = async () => {
    if (step < 4) {
      setStep(step + 1)
      return
    }

    // Skip on last step = submit with whatever we have so far
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const token = await getToken()
      await api.profile.completeOnboarding(token!, formData)
      router.push('/dashboard?onboarding_complete=true')
    } catch (err) {
      console.error('Onboarding failed', err)
      setSubmitError("We couldn't save your profile. Please check your connection and try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface-card">
      {/* Progress header */}
      <div className="border-b border-line-subtle p-6">
        <div className="mb-4 flex items-center justify-between text-sm text-content-secondary">
          <span>Step {step} of {STEPS.length}</span>
          <span>
            {STEPS[step - 1]?.label}
            {STEPS[step - 1]?.optional && (
              <span className="ml-1.5 text-xs text-content-muted">(optional)</span>
            )}
          </span>
        </div>
        <div className="flex gap-2">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                s.id <= step ? 'bg-brand' : 'bg-surface-inset'
              )}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="p-6">
        {step === 1 && <Step1Personal form={form as never} />}
        {step === 2 && <Step2Address form={form as never} />}
        {step === 3 && <Step3Employment form={form as never} />}
        {step === 4 && <Step4Rental form={form as never} />}
      </div>

      {/* Navigation */}
      <div className="border-t border-line-subtle p-6">
        {submitError && (
          <p className="mb-4 text-sm text-danger-strong" role="alert">
            {submitError}
          </p>
        )}
        <div className="flex items-center justify-between">
          {step > 1 ? (
            <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-3">
            {STEPS[step - 1]?.optional && (
              <Button type="button" variant="link" onClick={handleSkip} disabled={isSubmitting}>
                Skip for now
              </Button>
            )}
            <Button
              type="button"
              onClick={form.handleSubmit(handleNext as never)}
              loading={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : step === 4 ? 'Complete profile' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
