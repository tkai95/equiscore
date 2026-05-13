import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { isPublicSite } from '@/lib/site'
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  FileSearch,
  Users,
  Scale,
  TrendingUp,
  Banknote,
  Globe,
  UserCheck,
  BarChart3,
} from 'lucide-react'

const PROBLEMS = [
  {
    icon: AlertTriangle,
    title: 'Thin-file customers are refused before anyone looks at them',
    desc: 'Automated onboarding decisions decline applicants with limited UK credit history before a human reviews the case. A person with no record is treated the same as one with a damaging record, even though the two situations are entirely different.',
  },
  {
    icon: ShieldCheck,
    title: 'CIFAS markers are applied broadly and last a long time',
    desc: 'A CIFAS fraud prevention marker can remain on a record for up to six years. With over 680 member organisations sharing data, a marker placed in one institution affects access across the entire system. Markers are not always applied with precision.',
  },
  {
    icon: Globe,
    title: 'International customers start from zero',
    desc: 'Customers who have moved to the UK from abroad have no local credit footprint regardless of their financial history. Creditworthy individuals with years of clean financial behaviour in other countries are routinely refused even basic accounts.',
  },
  {
    icon: Scale,
    title: 'Debanking draws regulatory and reputational attention',
    desc: 'Following the high-profile cases in 2023, the FCA strengthened rules around how banks must handle account refusals and closures. Institutions must now give 90 days notice in most cases and provide clearer reasons. The direction of travel is toward greater accountability.',
  },
]

const STATS = [
  {
    stat: '1.4 million',
    label: 'adults without a bank account in the UK',
    desc: 'According to the FCA Financial Lives survey, over a million UK adults remain unbanked. A significant proportion were refused accounts, not because of demonstrated financial risk but because of data gaps.',
  },
  {
    stat: '374,000+',
    label: 'CIFAS cases filed in 2023',
    desc: 'CIFAS reported over 374,000 fraud prevention cases in 2023 across its 680-plus member organisations. The scale of the database means that errors or disproportionate markers have a wide reach.',
  },
  {
    stat: '90 days',
    label: 'minimum notice now required before account closure',
    desc: 'FCA rules introduced following the debanking debate require most banks to give at least 90 days notice before closing an account, with a clear reason. The regulatory bar for unexplained closures has risen.',
  },
]

const HOW_IT_HELPS = [
  {
    n: '1',
    icon: Banknote,
    title: 'Verified income and spending from open banking',
    desc: 'Equiscore connects to an applicant\'s bank account to verify real income, spending patterns and financial stability. This is live data, not inferred from historical credit files. For thin-file customers, it provides the evidence your current process cannot find.',
  },
  {
    n: '2',
    icon: FileSearch,
    title: 'Payment behaviour beyond the credit file',
    desc: 'Regular bill payments, rent and committed outgoings that do not appear on a credit bureau file are identified and surfaced. A customer who reliably meets their financial commitments becomes visible, even if they have never held a credit product.',
  },
  {
    n: '3',
    icon: UserCheck,
    title: 'Portable Trust Portfolio shared by the applicant',
    desc: 'Applicants build a verified Trust Portfolio that they share directly with your onboarding team. Your team receives a structured, consent-led evidence summary rather than requesting documents that may not exist.',
  },
  {
    n: '4',
    icon: ShieldCheck,
    title: 'A clearer picture for borderline decisions',
    desc: 'Where your standard checks return insufficient data, Equiscore provides an additional evidence layer to inform the decision. It does not override your process. It gives your team more to work with.',
  },
]

const WHO_IS_AFFECTED = [
  {
    icon: Globe,
    title: 'International arrivals',
    desc: 'Professionals and families relocating to the UK with no local credit footprint. Many have strong financial histories that the UK system has no way to access.',
  },
  {
    icon: Users,
    title: 'Young adults and first-time account holders',
    desc: 'People opening their first account or moving from a student account who have limited credit product history but stable financial behaviour.',
  },
  {
    icon: BarChart3,
    title: 'Self-employed and gig workers',
    desc: 'Customers with variable or non-PAYE income who do not produce the payslips onboarding processes typically expect. Stable earners declined for format reasons.',
  },
  {
    icon: AlertTriangle,
    title: 'Customers with historic CIFAS markers',
    desc: 'Individuals whose records carry markers placed years ago, sometimes in relation to circumstances that no longer reflect their current situation or that were applied incorrectly.',
  },
]

export default function BanksPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-20 lg:pb-28 lg:pt-28">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-teal" />
            <span className="text-sm font-medium text-teal">For banks and fintechs</span>
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-[1.08] tracking-tight text-cream lg:text-6xl">
            The customers you are declining{' '}
            <span className="text-teal">may be your most reliable.</span>
          </h1>

          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-cream">
            Thin credit files and data gaps cause automated onboarding to decline applicants who pose no real risk. Equiscore provides a verified, consent-led evidence layer that gives your team a clearer picture before a borderline decision is made.
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
              href="/how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-cream/15 px-8 py-4 text-base font-semibold text-cream transition-colors hover:border-cream/30"
            >
              How it works <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── The problem ───────────────────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">
            The problem
          </p>
          <h2 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
            Where the current system breaks down
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-cream">
            Standard onboarding relies on data that was built to describe borrowing history. For a growing segment of applicants, that history does not exist, or exists in a form the system cannot read. The result is over-exclusion at the front door.
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
            The scale of the exclusion problem
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
            Figures from the FCA Financial Lives survey, CIFAS and public regulatory sources. Used for illustrative purposes.
          </p>
        </div>
      </section>

      {/* ── Who is affected ───────────────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">
            The excluded population
          </p>
          <h2 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
            Who your current process is turning away
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-cream">
            These are not high-risk applicants. They are people for whom the data the system expects simply does not exist, or does not tell the full story.
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHO_IS_AFFECTED.map(({ icon: Icon, title, desc }) => (
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

      {/* ── Regulatory context ────────────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">
                The regulatory direction
              </p>
              <h2 className="mb-5 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
                Consumer Duty and the debanking debate
              </h2>
              <p className="mb-6 text-lg leading-relaxed text-cream">
                The FCA's Consumer Duty, which took full effect in July 2023, requires firms to demonstrate good outcomes for all customers. For onboarding, this means the bar for automated exclusion has risen. Declining a customer because the data does not exist is a different regulatory position to declining because of demonstrated risk.
              </p>
              <p className="mb-6 text-lg leading-relaxed text-cream">
                The 2023 debanking debate put bank account access directly in the political and regulatory spotlight. The FCA has since issued updated guidance on account refusals and closures. The expectation is that firms can justify decisions with evidence, not just point to a model output.
              </p>
              <p className="text-lg leading-relaxed text-cream">
                Equiscore gives your team a structured, auditable evidence layer. When a decision is made with verified data rather than a data absence, the regulatory position is stronger.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  icon: Scale,
                  title: 'Consumer Duty: good outcomes for all customers',
                  desc: 'The Duty requires firms to consider customers with non-standard financial circumstances. Excluding someone because your data cannot see them is different from excluding a genuine risk.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Stronger audit trail for borderline decisions',
                  desc: 'Decisions made with verified affordability and behaviour data are easier to defend to regulators than decisions made on the absence of bureau data alone.',
                },
                {
                  icon: TrendingUp,
                  title: 'Debanking rules: the direction is toward accountability',
                  desc: 'The FCA has signalled an expectation that banks provide clearer reasons for account refusals and closures. Evidenced decisions are more defensible than algorithm-only outputs.',
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

      {/* ── How Equiscore helps ───────────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">
            How it works
          </p>
          <h2 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
            What Equiscore adds to your onboarding process
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-cream">
            Equiscore is an additional evidence layer for applicants your standard process cannot resolve. It does not replace your existing checks. It provides the verified data that makes a better decision possible.
          </p>

          <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-0">
            {HOW_IT_HELPS.map(({ n, icon: Icon, title, desc }, idx) => (
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
                {idx < HOW_IT_HELPS.length - 1 && (
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
                title: 'Works alongside your existing onboarding',
                desc: 'Equiscore is designed to complement your current process. Use it as a referral pathway for applications that automated checks cannot resolve, without changing your core flow.',
              },
              {
                icon: ShieldCheck,
                title: 'FCA-regulated, consent-led data access',
                desc: 'All bank connections are made via FCA-authorised open banking providers. Data is accessed only with explicit customer consent and processed under UK GDPR. No data is shared without the applicant\'s active participation.',
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
              Serve the customers your current data cannot see
            </p>
            <h2 className="mb-5 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
              Interested in an early access partnership?
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-cream">
              We are working with a select group of banks and fintechs ahead of our full launch. If you are looking for a better way to assess thin-file and non-standard applications, get in touch.
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
                'Complements existing bureau checks',
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
