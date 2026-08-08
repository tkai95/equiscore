import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { EquiScoreLogo } from '@/components/brand/logo'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Complete your profile' }

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-surface-page">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* Non-clickable during onboarding: clicking through to /dashboard
              mid-flow is jarring (the gate bounces you back here anyway) and
              users hit it by accident. Purely decorative here. */}
          <span aria-hidden className="inline-flex select-none">
            <EquiScoreLogo width={150} />
          </span>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-content">Build your trust profile</h1>
          <p className="mt-2 text-content-secondary">
            This takes about 5 minutes. Your data is encrypted and never sold.
          </p>
        </div>
        <OnboardingWizard />
      </div>
    </div>
  )
}
