import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'How Equiscore uses cookies and how to manage your preferences.',
}

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      <LandingNav />
      <div className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">Cookie Policy</h1>
        <p className="mb-12 text-sm text-gray-500">Last updated: April 2025</p>

        <div className="prose prose-gray max-w-none space-y-10 text-gray-700">

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">What are cookies?</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website. They help
              websites remember information about your visit so the site works correctly and can be
              improved over time.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">Cookies we use</h2>

            <div className="mt-4 space-y-6">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                <p className="mb-1 font-semibold text-gray-900">Necessary cookies</p>
                <p className="mb-3 text-sm text-gray-500">Always active. Required for the site to function.</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      <th className="pb-2 pr-4">Cookie</th>
                      <th className="pb-2 pr-4">Purpose</th>
                      <th className="pb-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-700">__session</td>
                      <td className="py-2 pr-4 text-gray-600">Authentication session (Clerk)</td>
                      <td className="py-2 text-gray-600">Session</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-700">cookie-consent</td>
                      <td className="py-2 pr-4 text-gray-600">Stores your cookie preference</td>
                      <td className="py-2 text-gray-600">1 year</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                <p className="mb-1 font-semibold text-gray-900">Analytics cookies</p>
                <p className="mb-3 text-sm text-gray-500">
                  Only set with your consent. Used to understand how visitors use the site.
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      <th className="pb-2 pr-4">Cookie</th>
                      <th className="pb-2 pr-4">Purpose</th>
                      <th className="pb-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-700">_ga</td>
                      <td className="py-2 pr-4 text-gray-600">Google Analytics visitor identifier</td>
                      <td className="py-2 text-gray-600">2 years</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-700">_ga_*</td>
                      <td className="py-2 pr-4 text-gray-600">Google Analytics session data</td>
                      <td className="py-2 text-gray-600">2 years</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">Managing your preferences</h2>
            <p>
              You can update your cookie preferences at any time by clearing your browser&apos;s
              local storage for equiscore.app or by adjusting your browser settings. Note that
              blocking necessary cookies will prevent the site from functioning correctly.
            </p>
            <p className="mt-3">
              Most browsers allow you to control cookies through their settings. For guidance, visit
              your browser&apos;s help page or{' '}
              <a
                href="https://www.aboutcookies.org"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                aboutcookies.org
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">More information</h2>
            <p>
              For more details on how we handle your personal data, see our{' '}
              <Link href="/privacy-policy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
              . Questions? Email{' '}
              <a href="mailto:privacy@equiscore.app" className="text-blue-600 hover:underline">
                privacy@equiscore.app
              </a>
              .
            </p>
          </section>

        </div>
      </div>
      <LandingFooter />
    </main>
  )
}
