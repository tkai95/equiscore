import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { isPublicSite } from '@/lib/site'
import {
  ArrowRight,
  Lock,
  ShieldCheck,
  RefreshCw,
  UserCheck,
  Database,
  Share2,
} from 'lucide-react'

const STEPS = [
  {
    n: '1',
    title: 'Create your account',
    body: 'Sign up with your email. We collect only what we need to create and secure your account. This takes under two minutes.',
  },
  {
    n: '2',
    title: 'Verify your identity',
    body: 'We use a secure document verification process to confirm you are who you say you are. This is a required step and forms the foundation of your Trust Portfolio.',
  },
  {
    n: '3',
    title: 'Connect your bank account',
    body: 'You connect your bank account using open banking, a regulated, read-only connection. Your credentials never reach us. We receive a structured view of your transaction history, nothing more.',
  },
  {
    n: '4',
    title: 'Add supporting evidence',
    body: 'You can upload additional evidence such as rent payment records or utility bills. Each item is verified independently and contributes to your overall data coverage score.',
  },
  {
    n: '5',
    title: 'Your Trust Portfolio is generated',
    body: 'We run our analysis across all submitted evidence and produce your verified Trust Portfolio, including your Trust Score grade. The whole process takes around 15 minutes.',
  },
]

const OPEN_BANKING_POINTS = [
  {
    title: 'Read-only access',
    body: 'The connection we establish gives us the ability to read your transaction history. Nothing else. We cannot initiate payments, move money, or take any action on your account. The same technology is used by most budgeting apps and personal finance tools in the UK.',
  },
  {
    title: 'Regulated infrastructure',
    body: 'We connect via FCA-authorised open banking providers. Your credentials never reach us. You authenticate directly with your bank, and we receive only what the regulated connection permits, nothing more.',
  },
  {
    title: 'What we look for',
    body: 'We look for patterns in your transactions: regular income, consistent bill payments, stability in how you manage your money over time. We do not flag individual transactions or make judgements on what you spend your money on.',
  },
  {
    title: 'Fairer for non-standard income',
    body: 'Standard affordability checks are built around monthly salary payments. We look at income over a longer window, so contractors, freelancers and gig workers are assessed on the actual pattern of their earnings rather than being penalised for not having a single employer.',
  },
]

const WHAT_WE_ANALYSE = [
  { icon: Database, label: 'Income patterns', desc: 'Regularity, consistency and source of income coming into your account over time.' },
  { icon: RefreshCw, label: 'Payment consistency', desc: 'Evidence of regular outgoings: rent, bills, subscriptions, committed expenses.' },
  { icon: ShieldCheck, label: 'Account stability', desc: 'How your account has been managed over the period: balance behaviour, overdraft use, activity patterns.' },
  { icon: UserCheck, label: 'Identity match', desc: 'Confirmation that the account belongs to the person whose identity we have verified.' },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-teal" />
          <span className="text-sm font-medium text-teal">How it works</span>
        </div>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-cream lg:text-5xl">
          From sign-up to verified profile
          <br />
          <span className="text-teal">in about 15 minutes.</span>
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg leading-relaxed text-cream">
          Your Trust Portfolio is built from verified evidence about your real financial behaviour. This page explains how the connection process works, what we access, and what we do with it.
        </p>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-cream">
          For details on how your Trust Score is calculated and what your portfolio contains, see the{' '}
          <Link href="/trust-portfolio" className="text-teal underline underline-offset-2 hover:text-teal/80">
            Trust Portfolio
          </Link>{' '}
          page.
        </p>
      </section>

      {/* ── The five steps ───────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">The process</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            Five steps. One verified profile.
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            Everything happens within a single session. You do not need to prepare anything in advance beyond your bank details and a form of photo ID.
          </p>
          <div className="space-y-4">
            {STEPS.map(({ n, title, body }) => (
              <div key={n} className="rounded-xl border border-ink-border bg-ink-mid p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal text-sm font-bold text-ink">
                    {n}
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold text-cream">{title}</h3>
                    <p className="text-sm leading-relaxed text-cream">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Open banking ─────────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">Open banking</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            We read your bank data. We do not touch your money.
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            Open banking is a regulated, secure way to share your financial data with authorised third parties. It was introduced under FCA regulation as part of PSD2 and is used by millions of people across the UK every day.
          </p>

          <div className="space-y-4">
            {OPEN_BANKING_POINTS.map((item, i) => (
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

          <div className="mt-8 rounded-xl border border-teal/20 bg-teal/5 px-6 py-5">
            <p className="text-sm text-teal">
              You can disconnect your open banking connection at any time from within your account. If you disconnect, your existing verified data stays in your portfolio. Future updates will require you to reconnect.
            </p>
          </div>
        </div>
      </section>

      {/* ── What we analyse ──────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">What we look at</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            Patterns, not transactions
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            We do not read your bank data to judge what you spend your money on. We look at the overall shape of your financial behaviour over time.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {WHAT_WE_ANALYSE.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4 rounded-xl border border-ink-border bg-ink-mid p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal/20 bg-teal/10">
                  <Icon className="h-5 w-5 text-teal" />
                </div>
                <div>
                  <p className="mb-1 font-semibold text-cream">{label}</p>
                  <p className="text-sm leading-relaxed text-cream">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── After your profile ───────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">After your profile is built</p>
          <h2 className="mb-10 text-center text-3xl font-bold text-cream">
            Your portfolio updates as your behaviour continues
          </h2>
          <div className="space-y-5">
            <p className="text-lg leading-relaxed text-cream">
              Once your Trust Portfolio is built, it does not sit static. As more verified financial behaviour accumulates, your profile grows stronger. You can log in at any time to check your current Trust Score, add new evidence, or prepare a share link for a specific institution.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              A longer verified history produces a stronger profile. Every month of consistent behaviour adds to what institutions can see when you choose to share.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              You are in complete control of who sees your portfolio and when. Sharing is always an explicit action you take, never something that happens automatically.
            </p>
          </div>
          <div className="mt-8 flex justify-center">
            <Link
              href="/trust-portfolio"
              className="inline-flex items-center gap-2 text-sm font-semibold text-teal hover:text-teal/80"
            >
              See what your Trust Portfolio contains <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── How sharing works ────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">Sharing your profile</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            You share it. You revoke it.
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            When you are ready to use your Trust Portfolio, you generate a share link from your dashboard and send it to whoever needs it. The link gives them a structured summary of your verified profile. Nothing else.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { n: '1', icon: Share2, title: 'Generate a link', desc: 'Create a one-time or time-limited link from your dashboard. Decide what to include before you send it.' },
              { n: '2', icon: UserCheck, title: 'They review it', desc: 'The institution sees your verified Trust Portfolio summary. No raw bank data. No personal information beyond what you chose to share.' },
              { n: '3', icon: Lock, title: 'Revoke when done', desc: 'Once the decision is made, you revoke the link from your dashboard. Access is gone immediately.' },
            ].map(({ n, icon: Icon, title, desc }) => (
              <div key={n} className="rounded-xl border border-ink-border bg-ink-mid p-6 text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-teal text-sm font-bold text-ink">
                  {n}
                </div>
                <Icon className="mx-auto mb-3 h-5 w-5 text-teal" />
                <h3 className="mb-2 font-semibold text-cream">{title}</h3>
                <p className="text-sm leading-relaxed text-cream">{desc}</p>
              </div>
            ))}
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
              Takes about 15 minutes. Your data is encrypted and private. You choose exactly who sees your profile and when.
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
                href="/trust-portfolio"
                className="inline-flex items-center gap-2 rounded-xl border border-cream/20 px-8 py-4 text-base font-semibold text-cream transition-colors hover:border-cream/40"
              >
                What is a Trust Portfolio <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
