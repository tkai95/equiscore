import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { isPublicSite } from '@/lib/site'
import {
  ArrowRight,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  Key,
  Database,
  UserCheck,
  Trash2,
} from 'lucide-react'

const WHAT_WE_HOLD = [
  {
    icon: UserCheck,
    title: 'Your identity information',
    desc: 'Name, date of birth, address and the documents you submitted to verify your identity. This is the minimum required to operate a verified profile.',
  },
  {
    icon: Database,
    title: 'Your transaction data',
    desc: 'Read-only bank transaction history retrieved via open banking. This data is used to analyse your financial behaviour and produce your verified modules. It is not sold, shared with third parties, or used for advertising.',
  },
  {
    icon: Eye,
    title: 'Supporting documents',
    desc: 'Any documents you choose to upload, such as tenancy agreements or bills. These are stored only while they are part of your active Trust Portfolio. You can remove them at any time.',
  },
  {
    icon: ShieldCheck,
    title: 'Your Trust Portfolio and score history',
    desc: 'Your verified score, module results, and Portfolio Strength over time. This is the record that institutions see when you share your profile with them.',
  },
]

const YOUR_RIGHTS = [
  {
    title: 'Right to access',
    body: 'You can request a copy of all personal data we hold about you at any time. We will provide it within 30 days.',
  },
  {
    title: 'Right to delete',
    body: 'You can close your account and request deletion of your data. We will remove your personal information from our systems within 30 days, subject to any legal obligations we are required to meet.',
  },
  {
    title: 'Right to correct',
    body: 'If any information we hold about you is inaccurate, you can request a correction. We will review and update the record.',
  },
  {
    title: 'Right to withdraw consent',
    body: 'You can disconnect your open banking connection at any time. You can also withdraw consent for us to process your data by closing your account. Withdrawing consent will affect the completeness of your Trust Portfolio.',
  },
  {
    title: 'Right to object',
    body: 'You have the right to object to certain types of processing of your data. Where we rely on legitimate interests rather than consent, you can raise an objection and we will review it.',
  },
]

export default function PrivacySecurityPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-teal" />
          <span className="text-sm font-medium text-teal">Privacy & security</span>
        </div>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-cream lg:text-5xl">
          Your data is yours.
          <br />
          <span className="text-teal">We are just the vault.</span>
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg leading-relaxed text-cream">
          Everything Equiscore holds about you is there because you put it there, and it stays only as long as you want it to. You have full control over what we hold, what we analyse, and who we share it with.
        </p>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-cream">
          This page explains what we store, how we protect it, and the rights you have over it.
        </p>
      </section>

      {/* ── Consent model ────────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">How consent works</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            Nothing happens without your permission
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            Every connection, every document, every share requires an explicit action from you. We do not pull data in the background, share your profile automatically, or enrol you in anything you did not ask for.
          </p>

          <div className="grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: Key,
                title: 'You connect your bank',
                body: 'Open banking access is authorised by you directly with your bank. You choose which account to connect and can disconnect at any time. We receive read-only access and nothing else.',
              },
              {
                icon: Eye,
                title: 'You decide what goes in',
                body: 'Documents and supporting evidence are uploaded by you. Nothing is added to your portfolio without your action. You can review and remove anything at any time.',
              },
              {
                icon: EyeOff,
                title: 'You control who sees it',
                body: 'Your Trust Portfolio is private by default. It is only visible to someone you have explicitly shared it with. You set the terms and can revoke access at any point.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-ink-border bg-ink-mid p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-teal/20 bg-teal/10">
                  <Icon className="h-5 w-5 text-teal" />
                </div>
                <h3 className="mb-2 font-semibold text-cream">{title}</h3>
                <p className="text-sm leading-relaxed text-cream">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What we hold ─────────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">What we hold</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            Only what is needed to build and verify your profile
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            We hold the minimum data required to produce a meaningful, verified Trust Portfolio. We do not collect or retain data beyond that purpose.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {WHAT_WE_HOLD.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-ink-border bg-ink-mid p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-teal/20 bg-teal/10">
                  <Icon className="h-5 w-5 text-teal" />
                </div>
                <h3 className="mb-2 font-semibold text-cream">{title}</h3>
                <p className="text-sm leading-relaxed text-cream">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it is protected ──────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">How we protect it</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            Security is not a feature. It is the foundation.
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            Financial data requires a higher standard of care than most. These are the specific commitments we make.
          </p>

          <div className="space-y-4">
            {[
              {
                title: 'Encrypted at rest and in transit',
                body: 'All data we hold is encrypted at rest using industry-standard encryption. All data transmitted between your device and our servers is encrypted in transit via TLS. Your data is never transferred in plain text.',
              },
              {
                title: 'Open banking via regulated providers',
                body: 'We do not handle your banking credentials. Your bank authentication happens directly between you and your bank. We connect via FCA-authorised open banking infrastructure that is independently regulated and audited.',
              },
              {
                title: 'We do not sell your data',
                body: 'Your personal data and financial information are not sold to third parties. They are not used for profiling, advertising, or shared with any organisation outside of what is necessary to operate your Trust Portfolio.',
              },
              {
                title: 'Access is logged and controlled',
                body: 'Internal access to your data is restricted, logged, and subject to regular review. We operate on a least-privilege basis, meaning staff only access the data their role requires.',
              },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-ink-border bg-ink-mid p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal/10 text-xs font-bold text-teal">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold text-cream">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-cream">{item.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Your rights ──────────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">Your rights</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            UK GDPR gives you specific rights over your data
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            These are not optional extras. They are legal requirements that we are obliged to honour and that you are entitled to exercise at any time.
          </p>
          <div className="space-y-4">
            {YOUR_RIGHTS.map((right, i) => (
              <div key={i} className="rounded-xl border border-ink-border bg-ink-mid p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal/10 text-xs font-bold text-teal">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold text-cream">{right.title}</h3>
                    <p className="text-sm leading-relaxed text-cream">{right.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-teal/20 bg-teal/5 px-6 py-5">
            <p className="text-sm text-teal">
              To exercise any of your rights, contact us at privacy@equiscore.co.uk. We will respond within the timeframes required under UK GDPR.
            </p>
          </div>
        </div>
      </section>

      {/* ── The hard commitment ──────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-2xl border border-ink-border bg-ink-mid px-10 py-14 text-center">
            <p className="mx-auto mb-6 max-w-2xl text-3xl font-bold leading-snug text-cream lg:text-4xl">
              The people who use Equiscore are already navigating difficult situations.
            </p>
            <p className="mx-auto mb-6 max-w-xl text-lg leading-relaxed text-cream">
              The last thing they need is a platform they cannot trust with their financial data. We take that seriously. Not because we are required to, but because this product only works if the people who need it most feel safe using it.
            </p>
            <p className="mx-auto max-w-xl font-semibold text-teal">
              Your data is not the product. It is the asset we are here to protect.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="bg-ink pb-28 pt-10">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-2xl border border-ink-border bg-ink-mid px-8 py-14 text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
              <Lock className="h-6 w-6 text-teal" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-cream">
              Ready to build your Trust Portfolio?
            </h2>
            <p className="mx-auto mb-8 max-w-md leading-relaxed text-cream">
              Everything is encrypted, private by default, and entirely in your control.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {isPublicSite ? (
                <RegisterInterestButton label="Join the waitlist" variant="primary" />
              ) : (
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 rounded-xl bg-teal px-8 py-4 text-base font-semibold text-ink shadow-[0_0_24px_rgba(0,200,150,0.3)] transition-all hover:bg-teal-dark"
                >
                  Build my profile <ArrowRight className="h-5 w-5" />
                </Link>
              )}
              <Link
                href="/how-it-works/sharing"
                className="inline-flex items-center gap-2 rounded-xl border border-cream/20 px-8 py-4 text-base font-semibold text-cream transition-colors hover:border-cream/40"
              >
                Sharing your profile <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
