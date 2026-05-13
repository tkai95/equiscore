import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions for using the Equiscore platform.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />
      <div className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="mb-2 text-4xl font-bold text-cream">Terms of Service</h1>
        <p className="mb-12 text-sm text-cream">Last updated: April 2025</p>

        <div className="prose prose-invert max-w-none space-y-10 text-cream">

          <section>
            <h2 className="mb-3 text-xl font-semibold text-cream">Acceptance of terms</h2>
            <p>
              By creating an account or using the Equiscore platform at equiscore.app, you agree to
              these Terms of Service. If you do not agree, you must not use the platform. These
              terms form a binding agreement between you and Equiscore Ltd.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-cream">What Equiscore provides</h2>
            <p>
              Equiscore is a financial identity platform that helps individuals build a verified
              trust profile using Open Banking data. The platform allows you to connect your bank
              account, receive a trust score, and share a verified profile with landlords, lenders,
              or employers of your choosing.
            </p>
            <p className="mt-3">
              Equiscore is not a credit reference agency and does not provide credit reports,
              credit scores, or regulated financial advice. The trust score we produce is based on
              your Open Banking data and is intended to supplement, not replace, other forms of
              identity and creditworthiness assessment.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-cream">Your account</h2>
            <p>
              You must be at least 18 years old and resident in the United Kingdom to use Equiscore.
              You are responsible for keeping your account credentials secure and for all activity
              that takes place under your account. If you suspect unauthorised access, contact us
              immediately at{' '}
              <a href="mailto:hello@equiscore.app" className="text-teal hover:underline">
                hello@equiscore.app
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-cream">Open Banking consent</h2>
            <p>
              Connecting your bank account requires your explicit consent. By granting this consent,
              you authorise Equiscore to access your account information via TrueLayer, an FCA
              authorised Account Information Service Provider. You may revoke this access at any
              time from your dashboard or directly through your bank.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-cream">Acceptable use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="ml-4 list-disc space-y-2">
              <li>Provide false or misleading information about yourself.</li>
              <li>Use the platform for any unlawful purpose.</li>
              <li>Attempt to access another user&apos;s account or data.</li>
              <li>Scrape, copy, or redistribute any part of the platform.</li>
              <li>Use the platform in a way that could damage, disable, or impair it.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-cream">Sharing your profile</h2>
            <p>
              When you generate a share link, you are choosing to share your verified profile with a
              specific recipient. You are responsible for deciding who receives that link.
              Equiscore is not responsible for how third parties use or interpret your shared
              profile. You can revoke any share link at any time from your dashboard.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-cream">
              Disclaimer and limitation of liability
            </h2>
            <p>
              Equiscore is provided on an &quot;as is&quot; basis. We do not guarantee that the
              platform will be uninterrupted, error-free, or that the trust score will produce any
              particular outcome in a rental, lending, or employment process. Equiscore is not
              liable for any decisions made by third parties based on your shared profile.
            </p>
            <p className="mt-3">
              To the fullest extent permitted by law, Equiscore&apos;s total liability to you for
              any claim arising out of or in connection with these terms shall not exceed the amount
              you have paid to Equiscore in the twelve months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-cream">Termination</h2>
            <p>
              You may close your account at any time from your settings page. We may suspend or
              terminate your account if we believe you have violated these terms or if we are
              required to do so by law. On termination, your data will be handled in accordance with
              our{' '}
              <Link href="/privacy-policy" className="text-teal hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-cream">Governing law</h2>
            <p>
              These terms are governed by the laws of England and Wales. Any disputes arising under
              these terms will be subject to the exclusive jurisdiction of the courts of England and
              Wales.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-cream">Changes to these terms</h2>
            <p>
              We may update these terms from time to time. We will notify you of material changes
              by email or via a notice on the platform. Continued use of Equiscore after changes
              take effect constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-cream">Contact</h2>
            <p>
              Questions about these terms? Email us at{' '}
              <a href="mailto:hello@equiscore.app" className="text-teal hover:underline">
                hello@equiscore.app
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
