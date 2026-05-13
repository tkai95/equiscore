import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { isPublicSite } from '@/lib/site'
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
  BarChart3,
  ShieldCheck,
  Globe,
  Users,
  FileSearch,
  TrendingDown,
  Banknote,
  UserCheck,
} from 'lucide-react'

// ── Data ─────────────────────────────────────────────────────────────────────

const PROBLEMS = [
  {
    icon: AlertTriangle,
    title: 'Standard credit checks were not designed for utility onboarding',
    desc: 'Credit scoring models are calibrated for lending. They measure propensity to repay borrowed money, not the likelihood of paying a monthly energy or broadband bill reliably.',
  },
  {
    icon: TrendingDown,
    title: 'Thin-file customers are treated as high risk by default',
    desc: "A customer with no credit history is not the same as one with a poor credit history. Credit-invisible individuals are routinely declined or forced onto prepayment meters that cost them more.",
  },
  {
    icon: Globe,
    title: 'New-to-UK customers are disproportionately affected',
    desc: 'Customers who have recently arrived in the UK have no local credit footprint regardless of their actual financial behaviour. Many have excellent payment histories that simply cannot be seen.',
  },
  {
    icon: Users,
    title: 'Vulnerable customer obligations create compliance risk',
    desc: "Ofgem's rules on vulnerable customers require providers to treat at-risk customers fairly. Forcing reliable customers onto prepayment meters due to inadequate data is a compliance risk as well as a commercial one.",
  },
]

const STATS = [
  {
    stat: '7 million+',
    label: 'prepayment meter users in Great Britain',
    desc: "A significant proportion of prepayment meter users are on them not because they have defaulted, but because a credit check returned insufficient data at onboarding. Many pay a higher unit rate as a result.",
  },
  {
    stat: '4 to 5 million',
    label: 'credit-invisible UK adults',
    desc: 'Experian estimates that millions of UK adults have limited or no formal credit history. These are potential customers your current process is either declining or placing on more expensive tariffs.',
  },
  {
    stat: 'Consumer Duty',
    label: 'FCA requirement since July 2023',
    desc: "The FCA's Consumer Duty requires firms to deliver good outcomes for all customers. Providers who make decisions based on inadequate data face increasing scrutiny over whether those decisions meet the standard.",
  },
]

const SOLUTION_FEATURES = [
  {
    n: '1',
    icon: Banknote,
    title: 'Real-time affordability from bank data',
    desc: "Equiscore uses open banking to verify a customer's actual income, monthly expenditure and bill payment behaviour. The result is a real-time affordability signal, not a proxy based on historical borrowing.",
  },
  {
    n: '2',
    icon: FileSearch,
    title: 'Verified bill and utility payment history',
    desc: 'Where utility and bill payments appear in transaction data, Equiscore surfaces them. Customers who pay every bill on time become visible, even if they have never held a credit card.',
  },
  {
    n: '3',
    icon: ShieldCheck,
    title: 'Consent-led, regulated data access',
    desc: "All bank connections are made via FCA-regulated open banking infrastructure. Data is accessed only with the customer's explicit consent and processed under UK GDPR. There is no data scraping.",
  },
  {
    n: '4',
    icon: UserCheck,
    title: 'Structured evidence for your onboarding decision',
    desc: 'You receive a structured affordability and payment behaviour summary alongside any existing checks. Your team makes a better-informed decision without additional manual review overhead.',
  },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export default function UtilitiesPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-20 lg:pb-28 lg:pt-28">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-teal" />
            <span className="text-sm font-medium text-teal">For utility providers</span>
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-[1.08] tracking-tight text-cream lg:text-6xl">
            More accurate affordability data.{' '}
            <span className="text-teal">Fewer forced prepayment meters.</span>
          </h1>

          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-cream">
            Standard credit checks leave utility providers with an incomplete view of customer reliability. Equiscore provides real-time affordability and payment behaviour data from open banking, so your onboarding decisions are based on evidence, not proxies.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            {isPublicSite ? (
              <RegisterInterestButton label="Partner with us" variant="outline-light" />
            ) : (
              <Link
                href="/partners"
                className="inline-flex items-center gap-2 rounded-xl border border-teal/30 bg-teal/10 px-8 py-4 text-base font-semibold text-teal transition-colors hover:bg-teal/20"
              >
                Partner with Equiscore <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              href="/how-it-works/open-banking"
              className="inline-flex items-center gap-2 rounded-xl border border-cream/15 px-8 py-4 text-base font-semibold text-cream transition-colors hover:border-cream/30"
            >
              How open banking works <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Problem section ───────────────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">
            The problem
          </p>
          <h2 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
            Why standard credit checks fall short for utilities
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-cream">
            The core issue is not the credit check itself. It is that credit scores were calibrated for lending decisions and provide a poor signal for the very different question of whether a customer will pay a monthly utility bill.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            {PROBLEMS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-ink-border bg-ink-mid p-7 transition-colors hover:border-teal/20"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
                  <Icon className="h-5 w-5 text-teal" />
                </div>
                <h3 className="mb-3 text-base font-bold text-cream">{title}</h3>
                <p className="text-sm leading-relaxed text-cream">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">
            Market context
          </p>
          <h2 className="mb-14 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
            The scale of the data gap
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {STATS.map(({ stat, label, desc }) => (
              <div
                key={stat}
                className="rounded-2xl border border-ink-border bg-ink-mid p-8"
              >
                <p className="mb-1 text-4xl font-black leading-none tracking-tight text-teal">
                  {stat}
                </p>
                <p className="mb-5 text-sm font-semibold text-cream">{label}</p>
                <div className="mb-5 h-px bg-ink-border" />
                <p className="text-sm leading-relaxed text-cream">{desc}</p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-right text-xs text-cream/40">
            Figures from Ofgem, Experian and FCA public sources. Used for illustrative purposes.
          </p>
        </div>
      </section>

      {/* ── What changes with better data ─────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">
            The opportunity
          </p>
          <h2 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
            What better affordability data changes
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-cream">
            When you can see actual payment behaviour rather than inferred risk, a range of commercial and regulatory outcomes improve.
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Zap,
                title: 'Reduce unnecessary prepayment meter placements',
                desc: 'Correctly identify customers who can pay by direct debit and would otherwise have been placed on a more expensive prepayment arrangement due to a thin credit file.',
              },
              {
                icon: Users,
                title: 'Onboard more customers with confidence',
                desc: 'New-to-UK customers, young adults and others with thin credit files represent a large, underserved market. Real affordability data lets you serve them without disproportionate risk.',
              },
              {
                icon: ShieldCheck,
                title: 'Meet Consumer Duty obligations more effectively',
                desc: "Demonstrating that your onboarding decisions are based on verified affordability evidence strengthens your position under the FCA's Consumer Duty requirements.",
              },
              {
                icon: BarChart3,
                title: 'Reduce bad debt from misclassified customers',
                desc: 'Poor data cuts both ways. Customers placed on prepayment meters who could have managed direct debit sometimes switch provider. Accurate data improves retention as well as reducing risk.',
              },
              {
                icon: Globe,
                title: 'Support customers from all financial backgrounds',
                desc: 'Customers who arrived in the UK recently, or who have never held credit products, can demonstrate their reliability through open banking data rather than being excluded by default.',
              },
              {
                icon: FileSearch,
                title: 'Verify real income and affordability in minutes',
                desc: 'Open banking connections return verified income and spending data in real time. There is no waiting for bank statements to arrive or manual document review.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-ink-border bg-ink-mid p-7 transition-colors hover:border-teal/20"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
                  <Icon className="h-5 w-5 text-teal" />
                </div>
                <h3 className="mb-3 text-base font-bold text-cream">{title}</h3>
                <p className="text-sm leading-relaxed text-cream">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solution features ─────────────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">
            How Equiscore works
          </p>
          <h2 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
            Equiscore's solution for utility providers
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-cream">
            Equiscore supplements your existing onboarding with a verified affordability layer powered by open banking. Customers share their data with explicit consent; you receive structured signals to inform your decision.
          </p>

          <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-0">
            {SOLUTION_FEATURES.map(({ n, icon: Icon, title, desc }, idx) => (
              <div key={n} className="contents">
                <div className="group relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-ink-border bg-ink-mid p-7 transition-colors hover:border-teal/30">
                  <span className="pointer-events-none absolute right-4 top-3 select-none text-7xl font-black leading-none text-cream/[0.04]">
                    {n}
                  </span>
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-teal/20 bg-teal/10 transition-colors group-hover:border-teal/40 group-hover:bg-teal/15">
                    <Icon className="h-6 w-6 text-teal" />
                  </div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal/60">Step {n}</p>
                  <h3 className="mb-3 text-base font-bold text-cream">{title}</h3>
                  <p className="text-sm leading-relaxed text-cream">{desc}</p>
                </div>
                {idx < SOLUTION_FEATURES.length - 1 && (
                  <div className="hidden shrink-0 items-center px-2 md:flex">
                    <div className="flex items-center gap-0.5">
                      <div className="h-px w-5 border-t border-dashed border-teal/25" />
                      <ArrowRight className="h-4 w-4 text-teal/30" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-2xl border border-ink-border bg-ink-mid px-8 py-14 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">
              Better data. Better decisions. Better outcomes.
            </p>
            <h2 className="mb-5 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
              Interested in an early access partnership?
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-cream">
              We are working with a select group of energy, broadband and water providers ahead of our full launch. Tell us about your onboarding challenge and we will be in touch.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {isPublicSite ? (
                <RegisterInterestButton label="Partner with us" variant="outline-light" />
              ) : (
                <Link
                  href="/partners"
                  className="inline-flex items-center gap-2 rounded-xl border border-teal/30 bg-teal/10 px-8 py-4 text-base font-semibold text-teal transition-colors hover:bg-teal/20"
                >
                  Partner with Equiscore <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link
                href="/how-it-works/privacy"
                className="inline-flex items-center gap-2 rounded-xl border border-cream/15 px-8 py-4 text-base font-semibold text-cream transition-colors hover:border-cream/30"
              >
                Privacy and security <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mx-auto mt-10 flex max-w-lg flex-col gap-2 sm:flex-row sm:gap-8">
              {[
                'Customer consent-led data sharing',
                'FCA-regulated open banking',
                'Structured affordability output',
              ].map((item) => (
                <div key={item} className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" />
                  <span className="text-sm text-cream">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
