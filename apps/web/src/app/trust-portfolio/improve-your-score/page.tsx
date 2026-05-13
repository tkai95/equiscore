import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { isPublicSite } from '@/lib/site'
import {
  ArrowRight,
  Lock,
  CheckCircle2,
  TrendingUp,
  Clock,
  RefreshCw,
  ShieldCheck,
  FileText,
} from 'lucide-react'

const MODULES = [
  {
    icon: ShieldCheck,
    label: 'Open Banking',
    weight: 'Highest impact',
    desc: 'Connecting your bank account is the single biggest contributor to your score. It gives us a verified view of income, spending patterns and financial behaviour over time. Without it, your profile cannot reach the top grades.',
  },
  {
    icon: TrendingUp,
    label: 'Income Stability',
    weight: 'High impact',
    desc: 'Consistent income over a sustained period strengthens your score significantly. This applies to employed income, self-employed earnings and irregular income alike. The longer the verified window, the stronger the result.',
  },
  {
    icon: CheckCircle2,
    label: 'Identity',
    weight: 'Required',
    desc: 'Your identity must be verified before any other module counts. It is the foundation everything else is built on. Without a verified identity, your portfolio cannot be completed or shared.',
  },
  {
    icon: FileText,
    label: 'Rent & Bills',
    weight: 'Meaningful impact',
    desc: 'Evidence of consistent payment behaviour for rent, utilities and other outgoings contributes positively. Even partial evidence helps. If you can show a pattern of meeting regular financial commitments, it adds weight to your profile.',
  },
]

const GRADE_TIPS = [
  {
    grade: 'A',
    label: 'Excellent',
    color: 'border-teal text-teal',
    bg: 'bg-teal/10',
    tips: [
      'All four evidence modules completed and verified',
      'Open banking connected with at least 6 months of history',
      'Consistent income pattern with no significant gaps',
      'Regular outgoings including rent or mortgage visible over time',
    ],
  },
  {
    grade: 'B',
    label: 'Good',
    color: 'border-teal/70 text-teal',
    bg: 'bg-teal/8',
    tips: [
      'Open banking connected with solid transaction history',
      'Identity verified and at least two other modules active',
      'Income visible and reasonably consistent',
      'Some gaps in evidence coverage that can be filled over time',
    ],
  },
  {
    grade: 'C',
    label: 'Fair',
    color: 'border-sand text-sand',
    bg: 'bg-sand/10',
    tips: [
      'Core modules in place but with limited verified history',
      'Income may be irregular or partially visible',
      'Fewer than 3 months of open banking data',
      'Improving: reconnect your bank account if disconnected and allow history to accumulate',
    ],
  },
  {
    grade: 'D',
    label: 'Building',
    color: 'border-sand/70 text-sand/80',
    bg: 'bg-sand/8',
    tips: [
      'Profile is active but evidence is limited',
      'Open banking connected recently with little history to assess yet',
      'Focus: verify your identity, connect your bank account, allow time',
    ],
  },
]

const WHAT_HELPS = [
  {
    icon: Clock,
    title: 'Time in the system',
    body: 'Your score improves naturally as more verified financial behaviour accumulates. A profile with 12 months of consistent data is stronger than one with 3 months, even if the underlying behaviour is identical. Starting early matters.',
  },
  {
    icon: RefreshCw,
    title: 'Keeping your connection active',
    body: 'If you disconnect your open banking connection, your score stops updating. Your existing verified data stays in your portfolio, but the profile cannot grow. Keeping the connection live is the simplest thing you can do to maintain momentum.',
  },
  {
    icon: CheckCircle2,
    title: 'Completing all modules',
    body: 'Data coverage, meaning how much of the available evidence has been filled in and verified, is a visible part of your portfolio. A profile with all four modules verified reads more completely than one with gaps, even if the overall grade is similar.',
  },
  {
    icon: TrendingUp,
    title: 'Consistent financial behaviour',
    body: 'You do not need a perfect financial history to build a strong profile. What matters is consistency over time. Regular income, regular outgoings, no significant disruption. Your profile reflects where you are now and can always improve.',
  },
]

export default function ImproveYourScorePage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-teal" />
          <span className="text-sm font-medium text-teal">Trust Portfolio</span>
        </div>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-cream lg:text-5xl">
          How to build the strongest
          <br />
          <span className="text-teal">Trust Portfolio you can.</span>
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg leading-relaxed text-cream">
          Your Trust Score reflects the quality and completeness of your verified evidence. There is no shortcut, but there is a clear path. This page explains exactly what moves the needle and what does not.
        </p>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-cream">
          Your grade can improve at any time. It is not a fixed judgment. It reflects where your profile stands right now.
        </p>
      </section>

      {/* ── What drives your score ───────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">The four evidence modules</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            Where your score comes from
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            Your Trust Score is built across four evidence modules. Each one is assessed independently. Completing more modules and building more verified history in each one is the direct path to a stronger grade.
          </p>
          <div className="space-y-4">
            {MODULES.map(({ icon: Icon, label, weight, desc }) => (
              <div key={label} className="rounded-xl border border-ink-border bg-ink-mid p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal/20 bg-teal/10">
                    <Icon className="h-5 w-5 text-teal" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-3">
                      <p className="font-semibold text-cream">{label}</p>
                      <span className="rounded-full border border-teal/20 bg-teal/10 px-2.5 py-0.5 text-xs font-medium text-teal">{weight}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-cream">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What each grade looks like ───────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">What each grade means in practice</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            What a profile at each grade looks like
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            These are the typical characteristics of profiles at each grade level, and what you would need to move up.
          </p>
          <div className="space-y-4">
            {GRADE_TIPS.map(({ grade, label, color, bg, tips }) => (
              <div key={grade} className={`rounded-xl border ${color.includes('teal') ? 'border-teal/20' : 'border-ink-border'} ${bg} p-6`}>
                <div className="flex items-start gap-5">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${color} text-xl font-bold`}>
                    {grade}
                  </div>
                  <div className="flex-1">
                    <p className={`mb-3 font-semibold ${color.split(' ')[1]}`}>{label}</p>
                    <ul className="space-y-2">
                      {tips.map((tip) => (
                        <li key={tip} className="flex items-start gap-2.5 text-sm text-cream">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal/60" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What actually helps ──────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">The practical steps</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            Four things that make a real difference
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            These are the actions that have the most direct effect on your Trust Portfolio over time.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {WHAT_HELPS.map(({ icon: Icon, title, body }) => (
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

      {/* ── Starting from a lower grade ──────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">Starting from scratch</p>
          <h2 className="mb-10 text-center text-3xl font-bold text-cream">
            A D or E grade is a starting point, not a verdict
          </h2>
          <div className="space-y-5">
            <p className="text-lg leading-relaxed text-cream">
              If you are new to the platform or have limited financial data to share, your initial grade will reflect that. That is expected. The system is designed to improve as your verified history builds up.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              The most important step is getting started. Connect your bank account, verify your identity, and let time work in your favour. A profile that has been active for six months is meaningfully stronger than one that has been active for one.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              If you have had your account closed or have a limited UK financial history, your profile will start lean. That is the point of the platform. You are building something that did not exist before, and every month of verified behaviour adds to it.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="bg-ink pb-28 pt-10">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-2xl border border-ink-border bg-ink-mid px-8 py-14 text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
              <TrendingUp className="h-6 w-6 text-teal" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-cream">Start building your Trust Portfolio today</h2>
            <p className="mx-auto mb-8 max-w-md leading-relaxed text-cream">
              The earlier you start, the more verified history you accumulate. Takes about 15 minutes to set up.
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
                href="/trust-portfolio/how-it-helps"
                className="inline-flex items-center gap-2 rounded-xl border border-cream/20 px-8 py-4 text-base font-semibold text-cream transition-colors hover:border-cream/40"
              >
                Where it can help you <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
