import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'

export const metadata = { title: 'Complete your profile' }

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 text-center">
          <a href="/dashboard" className="text-xl font-bold text-brand">
            Equiscore
          </a>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Build your trust profile</h1>
          <p className="mt-2 text-gray-600">
            This takes about 5 minutes. Your data is encrypted and never sold.
          </p>
        </div>
        <OnboardingWizard />
      </div>
    </div>
  )
}
