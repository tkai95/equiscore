import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { showWaitlist } from "@/lib/site"
import {
  Home,
  Briefcase,
  CreditCard,
  Smartphone,
  ShieldCheck,
  ArrowRight,
  FileText,
  Lock,
  TrendingUp,
  Globe,
  BarChart2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

const BARRIERS = [
  {
    title: 'No payslips to show',
    body: 'Most lenders and landlords rely on three to six months of payslips as standard income proof. If you invoice clients, take drawings from a company or work through a platform, you have no payslips to provide. The absence of that one document can be enough for an automated system to decline you outright.',
  },
  {
    title: 'Variable income is treated as higher risk',
    body: 'Automated affordability checks are calibrated around consistent monthly salaries. If your income varies month to month, even if your average earnings are strong, the system flags it as instability. A steady earner with variable pay can be assessed as riskier than an employee on a lower but fixed income.',
  },
  {
    title: 'Self-assessment returns are often not accepted',
    body: "HMRC self-assessment tax returns are the official record of a self-employed person's income. Despite this, many lenders and landlords do not accept them as sufficient proof. They are either viewed as unverifiable, treated as too historical, or simply outside the standard document checklist.",
  },
  {
    title: 'Contract gaps look like unemployment',
    body: 'Freelancers and contractors often have natural gaps between engagements. To a credit system with no context, those gaps look identical to periods of unemployment. There is no way to explain that the gap was planned, that savings are healthy, or that work resumed shortly afterwards.',
  },
]

const BLOCKED = [
  { icon: Home, label: 'Mortgages', desc: 'Lenders typically require two to three years of accounts and often apply stricter loan-to-income limits for the self-employed' },
  { icon: Briefcase, label: 'Renting', desc: 'Landlords almost universally ask for employer references and payslips, neither of which self-employed people can provide' },
  { icon: CreditCard, label: 'Business credit', desc: 'Early-stage self-employed workers often struggle to access credit lines or business cards without a long trading history' },
  { icon: TrendingUp, label: 'Personal loans', desc: 'Variable income and the absence of payslips lead to higher scrutiny on personal borrowing applications' },
  { icon: Globe, label: 'Car finance', desc: 'Many finance providers use employment status as a proxy for reliability, placing self-employed applicants in a higher-risk tier' },
  { icon: Smartphone, label: 'Phone contracts', desc: 'Pay-monthly contracts occasionally require income verification that self-employed people cannot easily supply' },
]

const HOW_WE_HELP = [
  {
    icon: BarChart2,
    title: 'Verify your actual income via open banking',
    body: 'By connecting your bank account through open banking, Equiscore can read your real income patterns month by month. This gives a far more accurate picture of your earnings than a payslip ever could, capturing the full range and consistency of what you actually receive.',
  },
  {
    icon: FileText,
    title: 'Build a Trust Portfolio that shows your earnings history',
    body: 'Your Trust Portfolio presents your income not as a single number, but as a verified pattern over time. Lenders and landlords can see how much you earn, how regularly it arrives, and how your average compares to stated income, all backed by data rather than documents.',
  },
  {
    icon: ShieldCheck,
    title: 'Share verified income proof with landlords and lenders',
    body: 'Instead of asking third parties to take your word for it, you share a verifiable income summary from your Trust Portfolio. It carries the weight of verified bank data, not a self-certified figure on an application form.',
  },
  {
    icon: TrendingUp,
    title: 'Grow your profile over time',
    body: 'Every month you use Equiscore, your verified earnings history grows. The longer your track record, the stronger your Trust Portfolio becomes, giving you more credibility with every future application you make.',
  },
]

export default function GigWorkersPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-teal" />
          <span className="text-sm font-medium text-teal">Gig workers &amp; self-employed</span>
        </div>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-cream lg:text-5xl">
          You work for yourself.
          <br />
          <span className="text-teal">The system was not built for you.</span>
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg leading-relaxed text-cream">
          Income verification was designed around PAYE employment. If you are self-employed, a freelancer, or work through a platform, the tools lenders and landlords rely on simply do not fit your situation. Your income is real. The problem is that the system has no reliable way to see it.
        </p>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-cream">
          Equiscore uses open banking to verify what you actually earn, turning your real financial behaviour into evidence that institutions can trust.
        </p>
      </section>

      {/* ── Why the system fails ─────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">Why the traditional system fails you</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            Four ways employment-based scoring works against self-employed people
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            The barriers are not about your finances being weak. They are about the system being built around a single type of worker.
          </p>
          <div className="space-y-4">
            {BARRIERS.map((b, i) => (
              <div key={i} className="rounded-xl border border-ink-border bg-ink-mid p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal/10 text-xs font-bold text-teal">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold text-cream">{b.title}</h3>
                    <p className="text-sm leading-relaxed text-cream">{b.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats callout ────────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-2xl border border-teal/20 bg-ink-mid p-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">The scale of the problem</p>
            <h2 className="mb-6 text-2xl font-bold text-cream">
              Millions of people earn a living without a single payslip to show for it
            </h2>
            <p className="mb-10 leading-relaxed text-cream">
              The UK&apos;s self-employed population has grown substantially over the past two decades, yet the financial infrastructure serving them has changed very little. Credit scoring, affordability assessments and income verification tools remain anchored to PAYE employment. The result is a large, economically productive group of workers who are routinely disadvantaged by a system not designed for how they work.
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                { stat: '4.4 million', label: 'self-employed workers in the UK (ONS 2024, approximate)' },
                { stat: '~15%', label: 'of the UK workforce is self-employed (approximate)' },
                { stat: '~£34k', label: 'average self-employed income per year (ONS, approximate)' },
              ].map(({ stat, label }) => (
                <div key={stat} className="rounded-xl border border-ink-border bg-ink p-5 text-center">
                  <p className="mb-2 text-3xl font-bold text-teal">{stat}</p>
                  <p className="text-sm text-cream">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── What gets blocked ────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">What gets blocked</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            The financial products you are routinely turned away from
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            Self-employment does not make you a credit risk. But the systems designed to assess risk were not built with you in mind.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BLOCKED.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4 rounded-xl border border-ink-border bg-ink-mid p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal/20 bg-teal/10">
                  <Icon className="h-5 w-5 text-teal" />
                </div>
                <div>
                  <p className="mb-1 font-semibold text-cream">{label}</p>
                  <p className="text-sm text-cream">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The structural unfairness ────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">The structural problem</p>
          <h2 className="mb-10 text-center text-3xl font-bold text-cream">
            Consistent earners penalised by a system that only understands fixed salaries
          </h2>
          <div className="space-y-5">
            <p className="text-lg leading-relaxed text-cream">
              Self-employment is not marginal. It is how a significant portion of the UK workforce has chosen, or needed, to work. Many self-employed people earn well, save consistently, and manage their finances carefully. The problem is not their finances. The problem is that the scoring infrastructure used to assess them was calibrated for a different kind of worker.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              A salaried employee earning less than a self-employed person in the same field will often pass assessments that the self-employed person fails. Not because the salaried employee is financially stronger, but because they have the right kind of proof. A regular payslip, an employer to call, a simple line on a bank statement that matches what they declared. The self-employed person has none of those things, even when their actual income is higher.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              Open banking changes this. Rather than relying on documents designed for a different employment model, it allows your real income to speak for itself. What you earn, how regularly, and over what period, drawn directly from your account. That is the basis on which self-employed people should be assessed.
            </p>
          </div>

          {/* Side-by-side comparison */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-ink-border bg-ink-mid p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
                  <CheckCircle2 className="h-5 w-5 text-teal" />
                </div>
                <p className="font-semibold text-cream">Salaried employee</p>
              </div>
              <ul className="space-y-2 text-sm text-cream">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                  Three payslips: application complete
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                  Employer reference easily obtained
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                  Credit file reflects employment status
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-ink-border bg-ink-mid p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
                  <AlertCircle className="h-5 w-5 text-teal" />
                </div>
                <p className="font-semibold text-cream">Self-employed person</p>
              </div>
              <ul className="space-y-2 text-sm text-cream">
                <li className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                  No payslips, application stalls
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                  Tax returns not always accepted
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                  Variable income flagged as risk
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Platform and gig workers ─────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">For gig and platform workers</p>
          <h2 className="mb-6 text-center text-3xl font-bold text-cream">
            Your income is real, even if it comes from five platforms.
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-center leading-relaxed text-cream">
            Gig workers face a slightly different version of this problem. Your income does not come from a single employer. It comes from Uber, Deliveroo, Amazon Flex, TaskRabbit, Bolt, or a combination of platforms that shifts month to month. Each one pays into your account. None of them provides an employer reference.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              {
                title: 'Multiple income streams in one verified picture',
                body: 'Equiscore analyses your bank account as a whole. Platform payments from Uber, Deliveroo or any other service appear as income. We do not require each platform to be named or verified separately. The pattern of money arriving in your account is what matters.',
              },
              {
                title: 'Stable average earnings, not just last month',
                body: 'Gig income is variable by nature. A single month\'s figure can look low even when your annual average is strong. We assess your income over a longer window, so seasonal dips and quiet weeks do not misrepresent the overall picture.',
              },
              {
                title: 'No employer reference required',
                body: 'Platform workers have no employer to call. Equiscore replaces the employer reference with verified bank data. Your income history speaks for itself without needing a third party to vouch for you.',
              },
              {
                title: 'Cashflow shown in context',
                body: 'Variable cashflow can look alarming on a bank statement without context. Your Trust Portfolio presents your income pattern as a trend, not as individual transactions. A landlord or lender can see that your earnings are consistent over time, even when they vary week to week.',
              },
            ].map(({ title, body }) => (
              <div key={title} className="rounded-xl border border-ink-border bg-ink-mid p-6">
                <h3 className="mb-2 font-semibold text-cream">{title}</h3>
                <p className="text-sm leading-relaxed text-cream">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How Equiscore helps ───────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">How Equiscore helps</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            Evidence built from what you actually earn
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            Connect your bank account and let your real income history make the case for you.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {HOW_WE_HELP.map(({ icon: Icon, title, body }) => (
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

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="bg-ink pb-28 pt-10">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-2xl border border-ink-border bg-ink-mid px-8 py-14 text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
              <Lock className="h-6 w-6 text-teal" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-cream">
              Your income is real. Let us help you prove it.
            </h2>
            <p className="mx-auto mb-8 max-w-md leading-relaxed text-cream">
              Build a verified Trust Portfolio using your actual earnings history. No payslips required.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {showWaitlist ? (
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
                href="/how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border border-cream/20 px-8 py-4 text-base font-semibold text-cream transition-colors hover:border-cream/40"
              >
                See how it works <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
