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
    <div className="min-h-screen bg-ink">
      <LandingNav dark />
      <div className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="mb-2 text-4xl font-bold text-cream">Cookie Policy</h1>
        <p className="mb-12 text-sm text-cream">Last updated: April 2025</p>

        <div className="prose prose-invert max-w-none space-y-10 text-cream">

          <section>
            <h2 className="mb-3 text-xl font-semibold text-cream">What are cookies?</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website. They help
              websites remember information about your visit so the site works correctly and can be
              improved over time.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-cream">Cookies we use</h2>

            <div className="mt-4 space-y-6">
              <div className="rounded-xl border border-ink-border bg-ink-mid p-5">
                <p className="mb-1 font-semibold text-cream">Necessary cookies</p>
                <p className="mb-3 text-sm text-cream-mid">Always active. Required for the site to function.</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wider text-cream/50">
                      <th className="pb-2 pr-4">Cookie</th>
                      <th className="pb-2 pr-4">Purpose</th>
                      <th className="pb-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-border">
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-cream">__session</td>
                      <td className="py-2 pr-4 text-cream-mid">Authentication session (Clerk)</td>
                      <td className="py-2 text-cream-mid">Session</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-cream">cookie-consent</td>
                      <td className="py-2 pr-4 text-cream-mid">Stores your cookie preference</td>
                      <td className="py-2 text-cream-mid">1 year</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-ink-border bg-ink-mid p-5">
                <p className="mb-1 font-semibold text-cream">Analytics cookies</p>
                <p className="mb-3 text-sm text-cream-mid">
                  Only set with your consent. Used to understand how visitors use the site.
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wider text-cream/50">
                      <th className="pb-2 pr-4">Cookie</th>
                      <th className="pb-2 pr-4">Purpose</th>
                      <th className="pb-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-border">
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-cream">_ga</td>
                      <td className="py-2 pr-4 text-cream-mid">Google Analytics visitor identifier</td>
                      <td className="py-2 text-cream-mid">2 years</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-cream">_ga_*</td>
                      <td className="py-2 pr-4 text-cream-mid">Google Analytics session data</td>
                      <td className="py-2 text-cream-mid">2 years</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-cream">Managing your preferences</h2>
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
                className="text-teal hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                aboutcookies.org
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-cream">More information</h2>
            <p>
              For more details on how we handle your personal data, see our{' '}
              <Link href="/privacy-policy" className="text-teal hover:underline">
                Privacy Policy
              </Link>
              . Questions? Email{' '}
              <a href="mailto:privacy@equiscore.app" className="text-teal hover:underline">
                privacy@equiscore.app
              </a>
              .
            </p>
          </section>

        </div>
      </div>
      <LandingFooter />
    </div>
  )
}
