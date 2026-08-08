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
  Zap,
  ShieldCheck,
  ArrowRight,
  FileText,
  Lock,
  Users,
  TrendingUp,
  Globe,
  PieChart,
  CheckCircle2,
} from 'lucide-react'

const WHO_HAS_THIN_FILE = [
  {
    icon: Users,
    title: 'Young adults starting out',
    body: 'If you are under 25 and have not yet taken out credit, a loan or a credit card, you are likely to have a thin or absent credit file. Responsible financial behaviour, such as saving, paying rent and managing a current account, does not automatically generate a credit record.',
  },
  {
    icon: Globe,
    title: 'Recent arrivals to the UK',
    body: 'Credit reference agencies in the UK can only report on data held within the UK system. If you have recently moved here, even with years of clean financial history elsewhere, you effectively start with a blank file in the eyes of UK lenders and landlords.',
  },
  {
    icon: PieChart,
    title: 'People who paid everything in cash or by debit',
    body: 'Not everyone has needed to borrow. Some people have managed their finances entirely through debit cards, savings and cash for years. Prudent behaviour like this leaves no trace on a credit file, which means no history exists even though no problems do either.',
  },
  {
    icon: FileText,
    title: 'Recently divorced or widowed off a joint account',
    body: 'When a long-term joint account or joint mortgage ends, the individual credit history can effectively disappear. If most of your financial products were held jointly and that relationship has ended, you may find yourself starting again from very little.',
  },
  {
    icon: TrendingUp,
    title: 'People who moved from abroad with a clean record',
    body: 'A spotless credit history in Australia, Canada, the US or elsewhere means nothing to a UK credit reference agency. Experian, Equifax and TransUnion operate on domestic data. Your record does not transfer, regardless of how long or how well you built it.',
  },
]

const BLOCKED = [
  { icon: Home, label: 'Renting a home', desc: 'Most letting agents and landlords run credit checks. A thin file often leads to an automatic decline or a demand for a guarantor' },
  { icon: CreditCard, label: 'Credit cards', desc: 'Most standard credit card providers require a credit history before they will consider an application' },
  { icon: Briefcase, label: 'Bank accounts', desc: 'Some current accounts and most fee-free accounts require a credit check, leaving thin-file applicants with limited options' },
  { icon: Zap, label: 'Utilities', desc: 'Gas, electricity and broadband providers often run credit checks, which can result in prepayment meters or higher deposits' },
  { icon: Globe, label: 'Mortgages', desc: 'Without a credit file to assess, lenders have no basis on which to offer a mortgage at standard rates' },
  { icon: Smartphone, label: 'Phone contracts', desc: 'Pay-monthly mobile contracts almost always require a credit check that a thin file cannot pass' },
]

const HOW_WE_HELP = [
  {
    icon: ShieldCheck,
    title: 'Build a verified financial identity from scratch',
    body: 'You do not need a credit history to build a Trust Portfolio. Equiscore uses open banking data, bank statements and other verified evidence to construct a picture of your financial behaviour, independent of what the credit reference agencies hold.',
  },
  {
    icon: CheckCircle2,
    title: 'Show that absence of credit is not absence of responsibility',
    body: 'A thin file is not evidence of risk. It is evidence of a gap in the system. Your Trust Portfolio makes this distinction visible by presenting verified data about how you manage money, pay bills and handle income, giving institutions a substantive basis on which to make decisions.',
  },
  {
    icon: Users,
    title: 'Share your profile with landlords and lenders directly',
    body: 'Rather than asking decision-makers to overlook a blank file, you give them something concrete to review. Your Trust Portfolio is a shareable, verified document that carries more weight than a self-certified income figure or an unverifiable reference.',
  },
  {
    icon: TrendingUp,
    title: 'Grow your record month by month',
    body: 'The earlier you start building a Trust Portfolio, the stronger it becomes. Every verified month of financial activity adds to your profile, creating the kind of track record that helps open more doors over time.',
  },
]

export default function ThinFilePage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-teal" />
          <span className="text-sm font-medium text-teal">Thin credit file</span>
        </div>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-cream lg:text-5xl">
          No credit history does not mean
          <br />
          <span className="text-teal">no financial history.</span>
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg leading-relaxed text-cream">
          The system treats absence of data as a warning sign. In most cases, it simply means you have never needed to borrow. But credit reference agencies can only report on what already exists in the UK system, and if you have not generated a credit file, they have nothing to show.
        </p>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-cream">
          Equiscore is built to fill that gap, using real financial evidence to show what the credit file cannot.
        </p>
      </section>

      {/* ── Who has a thin file ───────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">Who has a thin credit file</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            It happens to more people than you might expect
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            A thin file is not a sign of poor financial management. It is a structural gap that affects millions of people for entirely ordinary reasons.
          </p>
          <div className="space-y-4">
            {WHO_HAS_THIN_FILE.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-ink-border bg-ink-mid p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal/20 bg-teal/10">
                    <Icon className="h-5 w-5 text-teal" />
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

      {/* ── Stats callout ────────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-2xl border border-teal/20 bg-ink-mid p-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">The scale of the problem</p>
            <h2 className="mb-6 text-2xl font-bold text-cream">
              Millions of adults in the UK are effectively invisible to the credit system
            </h2>
            <p className="mb-10 leading-relaxed text-cream">
              Being credit invisible is not a reflection of financial irresponsibility. It is a consequence of how the system was built. Credit reference agencies can only work with data that flows through UK credit accounts. If you have never held one, or have only recently arrived, you simply do not appear. The result is that a substantial part of the adult population faces barriers to renting, banking and accessing services, not because of anything they have done, but because of a gap in the data.
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                { stat: '~5 million', label: 'UK adults considered credit invisible (approximate)' },
                { stat: 'Under 25s', label: 'make up a disproportionate share of thin-file adults' },
                { stat: '1 in 3', label: 'first-time renters declined partly due to limited credit history (approximate)' },
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

      {/* ── The credit paradox ───────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">The credit paradox</p>
          <h2 className="mb-10 text-center text-3xl font-bold text-cream">
            You cannot get credit without a history. You cannot build a history without credit.
          </h2>
          <div className="space-y-5">
            <p className="text-lg leading-relaxed text-cream">
              This is one of the most well-documented problems in consumer finance, and one of the least resolved. To be approved for most credit products, a lender needs to assess your creditworthiness. To do that, they look at your credit file. If your credit file is thin or empty, they decline. But the only way to build a credit file is by using credit products. The circle is closed.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              A thin file is not the same as bad credit. Bad credit means a history of missed payments, defaults or financial difficulty. A thin file means the absence of data, not the presence of negative data. Yet automated systems treat both situations with similar caution, because they have no other frame of reference.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              The credit reference agencies, Experian, Equifax and TransUnion, can only report on what exists within the UK system. They have no mechanism for capturing the fact that you have paid rent reliably for years, maintained savings, or managed a household budget responsibly without ever needing to borrow. That information simply does not feed into their models.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              Equiscore is designed to work with the data that does exist, your actual financial behaviour, rather than waiting for a credit file that the current system may never generate.
            </p>
          </div>

          {/* Distinction callout */}
          <div className="mt-10 rounded-xl border border-teal/20 bg-ink-mid p-7">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-teal">Key distinction</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="mb-2 font-semibold text-cream">Thin or no credit file</p>
                <p className="text-sm leading-relaxed text-cream">
                  No data exists. The person has not used credit. The system has nothing to assess, so it defaults to caution. This is a data gap, not evidence of risk.
                </p>
              </div>
              <div>
                <p className="mb-2 font-semibold text-cream">Poor credit history</p>
                <p className="text-sm leading-relaxed text-cream">
                  Data exists but shows missed payments, defaults or financial difficulty. This is a different situation entirely, with different causes and different solutions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What gets blocked ────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">What gets blocked</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            The doors that stay closed without a credit file
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            A blank file is treated as a negative by systems that have no other reference point. The consequences are real and immediate.
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

      {/* ── How Equiscore helps ───────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">How Equiscore helps</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            A financial identity that does not depend on borrowing history
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            Your financial story exists in your actual behaviour. Equiscore helps you surface it in a form that institutions can rely on.
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
              Your financial story exists. We help you tell it.
            </h2>
            <p className="mx-auto mb-8 max-w-md leading-relaxed text-cream">
              Build a verified Trust Portfolio that shows your real financial behaviour, independent of what the credit reference agencies hold.
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
