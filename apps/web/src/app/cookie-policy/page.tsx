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
    <main className="min-h-screen bg-cream">
      <LandingNav />
      <div className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="mb-2 text-4xl font-bold text-charcoal">Cookie Policy</h1>
        <p className="mb-12 text-sm text-charcoal-mid">Last updated: April 2025</p>

        <div className="prose prose-gray max-w-none space-y-10 text-charcoal-mid">

          <section>
            <h2 className="mb-3 text-xl font-semibold text-charcoal">What are cookies?</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website. They help
              websites remember information about your visit so the site works correctly and can be
              improved over time.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-charcoal">Cookies we use</h2>

            <div className="mt-4 space-y-6">
              <div className="rounded-xl border border-[#D8D6C9] bg-cream-surface p-5">
                <p className="mb-1 font-semibold text-charcoal">Necessary cookies</p>
                <p className="mb-3 text-sm text-charcoal-mid">Always active. Required for the site to function.</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wider text-[#5F6761]">
                      <th className="pb-2 pr-4">Cookie</th>
                      <th className="pb-2 pr-4">Purpose</th>
                      <th className="pb-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8D6C9]">
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-charcoal">__session</td>
                      <td className="py-2 pr-4 text-charcoal-mid">Authentication session (Clerk)</td>
                      <td className="py-2 text-charcoal-mid">Session</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-charcoal">cookie-consent</td>
                      <td className="py-2 pr-4 text-charcoal-mid">Stores your cookie preference</td>
                      <td className="py-2 text-charcoal-mid">1 year</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-[#D8D6C9] bg-cream-surface p-5">
                <p className="mb-1 font-semibold text-charcoal">Analytics cookies</p>
                <p className="mb-3 text-sm text-charcoal-mid">
                  Only set with your consent. Used to understand how visitors use the site.
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wider text-[#5F6761]">
                      <th className="pb-2 pr-4">Cookie</th>
                      <th className="pb-2 pr-4">Purpose</th>
                      <th className="pb-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8D6C9]">
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-charcoal">_ga</td>
                      <td className="py-2 pr-4 text-charcoal-mid">Google Analytics visitor identifier</td>
                      <td className="py-2 text-charcoal-mid">2 years</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-charcoal">_ga_*</td>
                      <td className="py-2 pr-4 text-charcoal-mid">Google Analytics session data</td>
                      <td className="py-2 text-charcoal-mid">2 years</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-charcoal">Managing your preferences</h2>
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
                className="text-brand hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                aboutcookies.org
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-charcoal">More information</h2>
            <p>
              For more details on how we handle your personal data, see our{' '}
              <Link href="/privacy-policy" className="text-brand hover:underline">
                Privacy Policy
              </Link>
              . Questions? Email{' '}
              <a href="mailto:privacy@equiscore.app" className="text-brand hover:underline">
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
