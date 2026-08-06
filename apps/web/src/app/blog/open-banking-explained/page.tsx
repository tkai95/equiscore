import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { showWaitlist } from "@/lib/site"
import { ArrowRight, Lock } from 'lucide-react'

export default function OpenBankingExplainedPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      <section className="mx-auto max-w-3xl px-6 pb-10 pt-24">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link href="/blog" className="text-xs font-semibold uppercase tracking-widest text-teal hover:text-teal/80">← Blog</Link>
          <span className="text-cream/20">·</span>
          <span className="rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">Open banking</span>
          <span className="text-xs text-cream/40">May 2025</span>
          <span className="text-xs text-cream/40">6 min read</span>
        </div>
        <h1 className="mb-6 text-3xl font-bold leading-tight text-cream lg:text-4xl">
          Open banking explained: what it is, how it works, and whether it is safe
        </h1>
        <p className="text-lg leading-relaxed text-cream/80">
          Millions of people in the UK use open banking without knowing it. Every budgeting app, cashback tool and financial comparison service that connects to your bank is using it. Here is a plain-language explanation of what it actually is and what it can and cannot do.
        </p>
      </section>

      <article className="mx-auto max-w-3xl px-6 pb-10">
        <div className="space-y-6">

          <h2 className="text-2xl font-bold text-cream">What is open banking?</h2>

          <p className="leading-relaxed text-cream">
            Open banking is a system that allows you to securely share your bank account data with authorised third-party providers. It was introduced in the UK under the Payment Services Regulations 2017, which implemented the EU's second Payment Services Directive (PSD2). The framework is overseen by the FCA and managed operationally by Open Banking Limited.
          </p>

          <p className="leading-relaxed text-cream">
            The nine largest UK banks (the CMA9: Barclays, HSBC, Lloyds, NatWest, Santander, Nationwide, HBOS, RBS and Danske) were required by the Competition and Markets Authority to implement open banking APIs. Most other banks and building societies have also adopted the standard voluntarily.
          </p>

          <p className="leading-relaxed text-cream">
            As of 2024, over seven million people in the UK actively use open banking-powered services. That number has grown significantly year-on-year since 2018, and most people using it are doing so through consumer-facing apps that never mention open banking by name.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">What open banking can and cannot do</h2>

          <div className="rounded-2xl border border-ink-border bg-ink-mid p-8 my-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">What it CAN do</p>
                <div className="space-y-2">
                  {[
                    'Read your transaction history',
                    'View account balances',
                    'See payment references and merchant names',
                    'Identify income and spending patterns',
                    'Initiate payments (only with explicit permission)',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <span className="text-teal text-sm font-bold">✓</span>
                      <p className="text-sm text-cream">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-cream/50">What it CANNOT do</p>
                <div className="space-y-2">
                  {[
                    'Move your money without a separate payment instruction',
                    'Access your card PIN or online banking password',
                    'Make changes to your account',
                    'Share your data with other parties without consent',
                    'Retain access after you withdraw permission',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <span className="text-cream/30 text-sm font-bold">✕</span>
                      <p className="text-sm text-cream/60">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-cream pt-4">How the connection works technically</h2>

          <p className="leading-relaxed text-cream">
            When you connect your bank account to an open banking service, you are redirected to your bank's own authentication interface. You log in to your bank directly, using your bank's own login process. The third-party service never sees your credentials. Once authenticated, your bank creates a token: a secure, limited-access key that allows the third party to retrieve certain data from your account within defined parameters.
          </p>

          <p className="leading-relaxed text-cream">
            The token is time-limited and scope-limited. It can only access the data you consented to share, for the period you consented to. Most tokens for account reading services expire after 90 days, after which you need to re-authenticate. You can revoke the token at any time, and the third party immediately loses access.
          </p>

          <p className="leading-relaxed text-cream">
            The third party receives structured data from your bank's API: transaction lists, balances, account details. What they can do with that data depends on the terms of their FCA authorisation. They cannot share it with other parties without explicit consent, and they cannot retain it beyond the purposes covered by their data protection obligations.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">Is open banking safe?</h2>

          <p className="leading-relaxed text-cream">
            Open banking is significantly safer than the alternative most people were using before: screen scraping. Before open banking existed, many financial apps worked by asking you for your online banking username and password, then logging in to your account on your behalf to read the data. You had no way of knowing what else they might do with those credentials.
          </p>

          <p className="leading-relaxed text-cream">
            Open banking replaced that with a regulated, API-based system where your credentials never leave your bank. The third party has FCA authorisation to access specific data through a defined technical channel. If something goes wrong, you have consumer protections through the FCA regime.
          </p>

          <div className="rounded-xl border border-teal/20 bg-teal/5 px-6 py-5 my-6">
            <p className="text-sm font-medium text-teal mb-2">How to check if a service is authorised</p>
            <p className="text-sm text-cream">
              Any legitimate open banking service must be authorised by the FCA as either an Account Information Service Provider (AISP) or Payment Initiation Service Provider (PISP). You can verify this on the FCA register at register.fca.org.uk. If a service asks to connect to your bank but is not on the register, do not connect it.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-cream pt-4">What open banking is used for</h2>

          <p className="leading-relaxed text-cream">
            The most common consumer-facing applications are budgeting and personal finance tools (apps like Monzo and Starling use open banking-style data internally; third-party apps use it to aggregate data across multiple accounts), affordability assessments (mortgage and rental applications), and fraud prevention.
          </p>

          <p className="leading-relaxed text-cream">
            For financial inclusion specifically, open banking is important because it makes financial behaviour legible in a way that was not previously possible for people without a credit file. Transaction history shows income patterns, payment consistency, and account management behaviour over time, without requiring a credit history to have been established first. This is why it forms the foundation of what Equiscore does.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">How to revoke access</h2>

          <p className="leading-relaxed text-cream">
            You can revoke an open banking connection in two ways: through the third-party service's own account settings (there should be a way to disconnect your bank account), or directly through your bank. Most UK banks have an "open banking permissions" or "connected apps" section in their app or online banking where you can see all active connections and revoke them individually.
          </p>

          <p className="leading-relaxed text-cream">
            Revoking access does not delete any data the third party already holds. It stops them accessing new data from that point forward. If you want them to delete historical data, you need to submit a deletion request to the service under UK GDPR.
          </p>

        </div>
      </article>

      <section className="bg-ink py-12">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-5 text-xs font-bold uppercase tracking-widest text-teal">Related reading</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { href: '/how-it-works', label: 'How Equiscore uses open banking to build your Trust Portfolio' },
              { href: '/how-it-works/privacy', label: 'Privacy & security: how we protect your data' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="group flex items-center justify-between rounded-xl border border-ink-border bg-ink-mid px-5 py-4 hover:border-teal/30">
                <span className="text-sm font-medium text-cream group-hover:text-teal">{label}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-teal/50" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink pb-28 pt-4">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-2xl border border-ink-border bg-ink-mid px-8 py-12 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
              <Lock className="h-5 w-5 text-teal" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-cream">Equiscore uses open banking to verify your financial behaviour</h2>
            <p className="mx-auto mb-7 max-w-md leading-relaxed text-cream">
              Read-only, FCA-regulated, and entirely in your control. You can disconnect at any time.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {showWaitlist ? (
                <RegisterInterestButton label="Join the waitlist" variant="primary" />
              ) : (
                <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-teal px-7 py-3.5 text-base font-semibold text-ink hover:bg-teal-dark">
                  Build my profile <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link href="/how-it-works" className="inline-flex items-center gap-2 rounded-xl border border-cream/20 px-7 py-3.5 text-base font-semibold text-cream hover:border-cream/40">
                How it works <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
