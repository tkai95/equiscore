import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Equiscore is free to use during the beta period.',
}

const included = [
  'Full trust profile with all scoring dimensions',
  'Open Banking connection via TrueLayer',
  'Unlimited share links with expiry and revocation',
  'Profile history and score updates',
  'Document upload and storage',
  'All future beta features as they ship',
]

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white">
      <LandingNav />

      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-600">Pricing</p>
        <h1 className="mb-6 text-4xl font-bold text-gray-900 lg:text-5xl">
          Free while we&apos;re in beta.
        </h1>
        <p className="mx-auto mb-16 max-w-2xl text-xl text-gray-600">
          We are still building and improving Equiscore. While we do that, everything is free.
          No card required, no trial period.
        </p>

        <div className="mx-auto max-w-md rounded-2xl border border-blue-100 bg-blue-50 p-8 text-left shadow-sm">
          <div className="mb-6 flex items-end gap-2">
            <span className="text-5xl font-bold text-gray-900">£0</span>
            <span className="mb-2 text-gray-500">/ month</span>
          </div>
          <p className="mb-6 font-semibold text-gray-900">Everything included during beta</p>
          <ul className="mb-8 space-y-3">
            {included.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/sign-up"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Create your profile <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">What happens after beta?</h2>
          <p className="text-gray-600">
            We plan to introduce a paid plan for advanced features. The core profile and share
            functionality will always have a free tier. Early users who help us shape the product
            will not be treated as second-class customers when pricing changes.
          </p>
        </div>
      </section>

      <LandingFooter />
    </main>
  )
}
