import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { isPublicSite } from '@/lib/site'
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Scale,
  FileSearch,
  Banknote,
  ShieldCheck,
  Users,
  Globe,
  BarChart3,
  UserCheck,
} from 'lucide-react'

// ── Data ─────────────────────────────────────────────────────────────────────

const SCORING_LIMITATIONS = [
  {
    icon: AlertTriangle,
    title: 'Credit invisibility is not the same as credit risk',
    desc: 'A person who has never held a credit product does not have a poor credit history. They have no history. Standard models treat absence of data as a signal of risk, which it is not.',
  },
  {
    icon: Globe,
    title: 'International financial histories are not portable',
    desc: 'A customer who built a strong credit profile in another country arrives in the UK with no transferable score. Creditworthy borrowers are declined or offered unsuitable products.',
  },
  {
    icon: BarChart3,
    title: 'Income patterns have changed; scoring models have not',
    desc: 'Variable, self-employed and gig economy income does not fit neatly into the income verification models most lenders use. Stable earners are declined or underwritten conservatively.',
  },
  {
    icon: TrendingUp,
    title: 'Recovering customers are penalised long after recovery',
    desc: 'Credit files reflect historical events for years. A customer whose finances have genuinely stabilised may be declined based on data that no longer reflects their current position.',
  },
]

const STATS = [
  {
    stat: '5 million+',
    label: 'credit-invisible UK adults',
    desc: 'Experian estimates that around five million UK adults have limited or no formal credit history. A significant proportion of these are not poor credit risks; they are people for whom the data simply does not exist.',
  },
  {
    stat: 'Millions',
    label: 'declined who could have borrowed responsibly',
    desc: "The FCA's Financial Lives survey has consistently found that large numbers of adults who were declined credit believe they could have managed the repayments. Alternative data supports that view in many cases.",
  },
  {
    stat: 'July 2023',
    label: 'FCA Consumer Duty took effect',
    desc: "The FCA's Consumer Duty requires firms to demonstrate that their products and services deliver good outcomes, including for customers with complex needs or non-standard financial histories.",
  },
]

const LENDER_FEATURES = [
  {
    n: '1',
    icon: Banknote,
    title: 'Verified income and expenditure from open banking',
    desc: "Equiscore connects to an applicant's bank account to verify real income, regularity of receipts and monthly expenditure patterns. The data is live, not estimated from historical bureau files.",
  },
  {
    n: '2',
    icon: FileSearch,
    title: 'Payment behaviour signals beyond the credit file',
    desc: 'Rent, bill and subscription payments that do not appear on credit files are identified and surfaced. A customer who consistently meets their financial commitments becomes visible.',
  },
  {
    n: '3',
    icon: UserCheck,
    title: 'Portable Trust Portfolio from the applicant',
    desc: 'Applicants build a verified Trust Portfolio that includes their financial behaviour context and supporting evidence. Your underwriters receive structured information rather than raw documents.',
  },
  {
    n: '4',
    icon: ShieldCheck,
    title: 'Consumer Duty-aligned affordability evidence',
    desc: 'Demonstrating that lending decisions are based on verified affordability data rather than proxy signals strengthens your Consumer Duty audit trail and supports positive regulatory outcomes.',
  },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LendersPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-20 lg:pb-28 lg:pt-28">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-teal" />
            <span className="text-sm font-medium text-teal">For credit and lending providers</span>
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-[1.08] tracking-tight text-cream lg:text-6xl">
            The customers your models are declining{' '}
            <span className="text-teal">may be your best borrowers.</span>
          </h1>

          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-cream">
            Traditional credit scoring excludes millions of creditworthy people because their financial behaviour is not captured in the places lenders look. Equiscore provides a verified affordability and payment behaviour layer so you can assess the thin-file population responsibly.
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

      {/* ── Scoring limitations ───────────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">
            The problem
          </p>
          <h2 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
            The limitation of traditional credit scoring
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-cream">
            Credit scoring models are built on data that describes how people have used credit products in the past. For a growing segment of the population, that data is absent, incomplete or out of date. The model does not fail because it is poorly designed. It fails because the underlying data is insufficient.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            {SCORING_LIMITATIONS.map(({ icon: Icon, title, desc }) => (
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

      {/* ── The underserved opportunity ────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">
            The underserved opportunity
          </p>
          <h2 className="mb-14 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
            The scale of the excluded population
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
            Figures from Experian, FCA Financial Lives and public regulatory sources. Used for illustrative purposes.
          </p>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Globe,
                title: 'International arrivals',
                desc: 'Customers who have recently moved to the UK with no local credit footprint, regardless of their financial history abroad.',
              },
              {
                icon: Users,
                title: 'Young adults',
                desc: 'First-time borrowers and recent graduates who have not yet accumulated the credit product history scoring models require.',
              },
              {
                icon: BarChart3,
                title: 'Self-employed and variable earners',
                desc: 'Sole traders, contractors and freelancers whose income patterns do not fit standard employment-based affordability models.',
              },
              {
                icon: TrendingUp,
                title: 'Recovering customers',
                desc: 'People whose financial position has genuinely improved but whose credit file still reflects historical difficulties.',
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

      {/* ── Consumer Duty ─────────────────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">
                Regulatory context
              </p>
              <h2 className="mb-5 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
                Consumer Duty and the push toward better inclusion
              </h2>
              <p className="mb-6 text-lg leading-relaxed text-cream">
                The FCA's Consumer Duty, which took full effect in July 2023, requires firms to demonstrate that they deliver good outcomes for all customers, including those with non-standard financial circumstances.
              </p>
              <p className="mb-6 text-lg leading-relaxed text-cream">
                Firms that decline customers based on inadequate data face increasing regulatory scrutiny. The Duty creates a direct incentive to improve the quality of information used in credit decisions rather than defaulting to conservative exclusion.
              </p>
              <p className="text-lg leading-relaxed text-cream">
                Equiscore gives lenders a structured, consent-led evidence layer that supports better outcomes and creates a clearer audit trail for how affordability was assessed.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  icon: Scale,
                  title: 'Good outcomes for customers with complex needs',
                  desc: "The Duty specifically requires firms to consider customers who may have characteristics of vulnerability or non-standard financial histories.",
                },
                {
                  icon: ShieldCheck,
                  title: 'Evidence-based decision making',
                  desc: 'Firms must be able to demonstrate how decisions were made. Verified affordability data provides a stronger audit trail than proxy scoring alone.',
                },
                {
                  icon: FileSearch,
                  title: 'Fair treatment of thin-file applicants',
                  desc: "Declining a customer because the data doesn't exist is a different situation from declining because of demonstrated risk. The Duty encourages distinguishing between the two.",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex gap-5 rounded-2xl border border-ink-border bg-ink-mid p-6 transition-colors hover:border-teal/20"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
                    <Icon className="h-4 w-4 text-teal" />
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-cream">{title}</h3>
                    <p className="text-sm leading-relaxed text-cream">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Lender features ───────────────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">
            How it works
          </p>
          <h2 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
            How Equiscore helps you assess the thin-file population
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-cream">
            Equiscore is an additional evidence layer for your underwriting process. It does not replace your existing credit data. It provides the context your current data cannot.
          </p>

          <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-0">
            {LENDER_FEATURES.map(({ n, icon: Icon, title, desc }, idx) => (
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
                {idx < LENDER_FEATURES.length - 1 && (
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

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {[
              {
                icon: UserCheck,
                title: 'Works alongside your existing bureau data',
                desc: 'Equiscore is designed to complement your existing credit data providers, not replace them. Use it as a referral pathway for applications that standard scoring cannot resolve.',
              },
              {
                icon: TrendingUp,
                title: 'Responsible lending to an underserved segment',
                desc: 'Responsible growth in the thin-file segment requires better data, not looser criteria. Equiscore provides the verified evidence base that makes responsible inclusion viable.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex gap-5 rounded-2xl border border-ink-border bg-ink-mid p-7 transition-colors hover:border-teal/20"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
                  <Icon className="h-5 w-5 text-teal" />
                </div>
                <div>
                  <h3 className="mb-2 text-base font-bold text-cream">{title}</h3>
                  <p className="text-sm leading-relaxed text-cream">{desc}</p>
                </div>
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
              Lend responsibly to the people your models currently cannot see
            </p>
            <h2 className="mb-5 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
              Ready to explore a partnership?
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-cream">
              We are working with a select group of lenders ahead of our full launch. If you are looking for a better way to assess thin-file and non-standard applications, get in touch.
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
                href="/how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border border-cream/15 px-8 py-4 text-base font-semibold text-cream transition-colors hover:border-cream/30"
              >
                Learn how it works <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mx-auto mt-10 flex max-w-xl flex-col gap-2 sm:flex-row sm:gap-8">
              {[
                'Complements existing bureau data',
                'Customer consent-led and FCA-regulated',
                'Consumer Duty aligned evidence trail',
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
