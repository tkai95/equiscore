import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About',
  description: 'Why we built Equiscore and who it is for.',
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <LandingNav />

      <section className="mx-auto max-w-3xl px-6 py-24">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-600">About</p>
        <h1 className="mb-8 text-4xl font-bold leading-tight text-gray-900 lg:text-5xl">
          The UK financial system wasn&apos;t built for everyone.
        </h1>

        <div className="space-y-6 text-lg leading-relaxed text-gray-600">
          <p>
            If you have lived in the UK for less than three years, work as a freelancer, or never
            needed to borrow money, you probably don&apos;t have much of a credit history. Not
            because you are a financial risk. Just because the system has never seen you.
          </p>
          <p>
            Landlords ask for six months of rent upfront. Lenders decline without explanation.
            Employers hesitate. The people most affected are usually migrants, students, recent
            graduates, and anyone who has spent time outside the traditional employment track.
          </p>
          <p>
            Equiscore exists to fix that. We use Open Banking to look at what actually matters:
            whether your income is consistent, whether you pay your bills on time, and whether your
            finances are stable. Then we turn that into a verified, shareable profile you control
            completely.
          </p>
          <p>
            You decide what to share. You decide who sees it. You can revoke access at any time.
          </p>
        </div>
      </section>

      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-12 text-3xl font-bold text-gray-900">What we believe</h2>
          <div className="grid gap-8 sm:grid-cols-2">
            {[
              {
                title: 'Transparency over black boxes',
                body: 'You should be able to see exactly which signals contributed to your score and why. No mystery numbers.',
              },
              {
                title: 'Your data belongs to you',
                body: 'We access your bank data with your explicit consent. You can revoke it or delete your account at any time.',
              },
              {
                title: 'Financial identity should travel',
                body: 'Whether you moved countries last year or changed careers, your financial track record should speak for itself.',
              },
              {
                title: 'Verification without surveillance',
                body: 'Landlords and lenders see your verified profile. They never see your raw transactions.',
              },
            ].map(({ title, body }) => (
              <div key={title} className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="mb-2 font-semibold text-gray-900">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="mb-8 text-3xl font-bold text-gray-900">The team</h2>
        <p className="mb-10 text-lg leading-relaxed text-gray-600">
          Equiscore is an early-stage team based in the UK. We are building in public and welcome
          feedback from users, landlords, and anyone with a stake in getting this right.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Get in touch <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <LandingFooter />
    </main>
  )
}
