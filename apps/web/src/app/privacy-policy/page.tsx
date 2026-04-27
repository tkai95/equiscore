import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Equiscore collects, uses, and protects your personal data.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      <LandingNav />
      <div className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mb-12 text-sm text-gray-500">Last updated: April 2025</p>

        <div className="prose prose-gray max-w-none space-y-10 text-gray-700">

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">Who we are</h2>
            <p>
              Equiscore Ltd operates the Equiscore platform at{' '}
              <a href="https://equiscore.app" className="text-blue-600 hover:underline">
                equiscore.app
              </a>
              . We are the data controller for the personal data you provide when using our service.
              For any privacy-related questions, contact us at{' '}
              <a href="mailto:privacy@equiscore.app" className="text-blue-600 hover:underline">
                privacy@equiscore.app
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">What data we collect</h2>
            <p className="mb-4">We collect the following categories of personal data:</p>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                <strong>Identity data:</strong> your name, email address, and date of birth, provided
                when you create an account.
              </li>
              <li>
                <strong>Profile data:</strong> your employment status, address history, and rental
                situation, provided during onboarding.
              </li>
              <li>
                <strong>Open Banking data:</strong> transaction history, account balances, and income
                patterns accessed via TrueLayer with your explicit consent. We do not store your
                bank login credentials.
              </li>
              <li>
                <strong>Usage data:</strong> pages visited, features used, and time spent on the
                platform. Collected via analytics cookies with your consent.
              </li>
              <li>
                <strong>Technical data:</strong> IP address, browser type, and device information,
                collected automatically when you access the platform.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">Why we collect it</h2>
            <p className="mb-4">
              We process your data for the following purposes and on the following legal bases under
              UK GDPR:
            </p>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                <strong>To provide the service</strong> (contract): calculating your trust score,
                generating your shareable profile, and maintaining your account.
              </li>
              <li>
                <strong>To process Open Banking data</strong> (explicit consent): accessing your
                bank account information through TrueLayer. You can withdraw this consent at any
                time.
              </li>
              <li>
                <strong>To improve the platform</strong> (legitimate interests): understanding how
                users interact with Equiscore to fix issues and improve features.
              </li>
              <li>
                <strong>To comply with legal obligations</strong> (legal obligation): retaining
                records as required by applicable law.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">Who we share data with</h2>
            <p className="mb-4">
              We share your data with the following third-party processors, all of whom are bound by
              data processing agreements:
            </p>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                <strong>TrueLayer</strong> (Open Banking connection): FCA authorised Account
                Information Service Provider. Processes your bank data to retrieve transactions and
                balances.
              </li>
              <li>
                <strong>Clerk</strong> (authentication): manages secure sign-in, sign-up, and
                session handling.
              </li>
              <li>
                <strong>Railway</strong> (hosting): our application and database servers are hosted
                on Railway infrastructure.
              </li>
              <li>
                <strong>Supabase</strong> (file storage): used for secure document storage.
              </li>
            </ul>
            <p className="mt-4">
              We do not sell your personal data to any third party, and we do not share it with
              landlords, lenders, or employers without your explicit action (generating a share link
              from your dashboard).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">How long we keep it</h2>
            <p>
              We retain your account data for as long as your account is active. If you request
              deletion, we will remove your personal data within 30 days, except where we are
              required to retain records by law. Open Banking transaction data is retained only as
              long as needed to calculate and display your trust score.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">Your rights</h2>
            <p className="mb-4">Under UK GDPR, you have the right to:</p>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                <strong>Access</strong> the personal data we hold about you.
              </li>
              <li>
                <strong>Rectify</strong> inaccurate data.
              </li>
              <li>
                <strong>Erasure</strong> of your data (right to be forgotten).
              </li>
              <li>
                <strong>Portability</strong> of your data in a machine-readable format.
              </li>
              <li>
                <strong>Object</strong> to processing based on legitimate interests.
              </li>
              <li>
                <strong>Withdraw consent</strong> for Open Banking data access or analytics at any
                time.
              </li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, email us at{' '}
              <a href="mailto:privacy@equiscore.app" className="text-blue-600 hover:underline">
                privacy@equiscore.app
              </a>
              . You can also delete your account and data directly from your settings page. If you
              are not satisfied with our response, you have the right to lodge a complaint with the
              Information Commissioner&apos;s Office (ICO) at{' '}
              <a href="https://ico.org.uk" className="text-blue-600 hover:underline">
                ico.org.uk
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">Cookies</h2>
            <p>
              We use cookies for essential site functionality and, with your consent, for analytics.
              See our{' '}
              <Link href="/cookie-policy" className="text-blue-600 hover:underline">
                cookie policy
              </Link>{' '}
              for full details.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">Changes to this policy</h2>
            <p>
              We may update this policy from time to time. When we make material changes, we will
              notify you by email or by displaying a notice on the platform. Continued use of
              Equiscore after changes take effect means you accept the updated policy.
            </p>
          </section>

        </div>
      </div>
      <LandingFooter />
    </main>
  )
}
