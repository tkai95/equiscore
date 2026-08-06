import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { showWaitlist } from "@/lib/site"
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Users,
  FileSearch,
  Banknote,
  ShieldCheck,
  Clock,
  Globe,
  Briefcase,
  GraduationCap,
} from 'lucide-react'

// ── Data ─────────────────────────────────────────────────────────────────────

const PROBLEMS = [
  {
    icon: AlertTriangle,
    title: 'Credit scores do not reflect rent payments',
    desc: 'Rent is one of the largest regular outgoings a person has, yet most rent payments are never reported to credit bureaus. A clean rent history is invisible to traditional checks.',
  },
  {
    icon: Globe,
    title: 'Newcomers start from zero',
    desc: 'A professional who has paid rent reliably for years abroad arrives in the UK with no local credit footprint. Standard referencing treats them identically to someone with a history of missed payments.',
  },
  {
    icon: Briefcase,
    title: 'Self-employed income is hard to verify',
    desc: 'Freelancers, contractors and business owners often cannot produce the payslips referencing platforms expect. Stable earners are declined not because of financial risk but because of format.',
  },
  {
    icon: TrendingUp,
    title: 'False positives cost you good tenants',
    desc: 'Every reliable tenant rejected by a blunt credit check is a void period extended, a re-let fee incurred, and an opportunity lost to a more flexible competitor.',
  },
]

const STATS = [
  {
    stat: 'Record high',
    label: 'rent arrears cases',
    desc: "Citizens Advice reported a record increase in rent arrears cases in 2023/24, driven partly by landlords and tenants who were not well matched at the referencing stage.",
  },
  {
    stat: '3–4 weeks',
    label: 'average void period cost',
    desc: 'The average void period in the UK costs landlords several hundred pounds in lost rent and re-letting fees. Better tenant selection reduces that risk directly.',
  },
  {
    stat: '5 million+',
    label: 'UK adults are credit invisible',
    desc: 'Experian estimates that millions of UK adults have limited or no formal credit history. Many are reliable, working people who simply have not used credit products extensively.',
  },
]

const HOW_IT_HELPS = [
  {
    n: '1',
    icon: FileSearch,
    title: 'Open Banking income verification',
    desc: 'Equiscore connects directly to an applicant\'s bank to verify real income, salary regularity and spending stability rather than relying on documents that can be falsified or are unavailable.',
  },
  {
    n: '2',
    icon: Banknote,
    title: 'Rent payment history from bank data',
    desc: 'Where rent payments appear in transaction history, Equiscore identifies and surfaces them. Landlords can see a pattern of consistent payment even where no credit bureau record exists.',
  },
  {
    n: '3',
    icon: ShieldCheck,
    title: 'Verified Trust Portfolio from the applicant',
    desc: 'Applicants build a portable, verified profile that includes their financial behaviour context. Your team reviews structured evidence rather than chasing documents.',
  },
  {
    n: '4',
    icon: Clock,
    title: 'Faster referencing decisions',
    desc: 'Less manual back-and-forth. The applicant connects their data once; you receive a structured summary alongside your standard referencing report.',
  },
]

const EXCLUDED_PROFILES = [
  {
    icon: Globe,
    title: 'International newcomers',
    desc: 'Professionals relocating from abroad who paid rent reliably for years in their home country. No UK credit file, but strong evidence of financial responsibility in their bank history.',
  },
  {
    icon: GraduationCap,
    title: 'Young professionals',
    desc: 'Recent graduates and early-career renters who have never used credit products extensively. Thin credit file, but a track record of meeting rent and bill commitments.',
  },
  {
    icon: Briefcase,
    title: 'Self-employed and freelance workers',
    desc: 'Contractors and sole traders with stable, often above-average earnings. Traditional referencing struggles with variable income formats; open banking verifies the underlying reality.',
  },
  {
    icon: Users,
    title: 'People between financial products',
    desc: 'Individuals who have recently cleared debts, moved between countries or changed circumstances. Their credit file lags reality; their current bank behaviour tells a different story.',
  },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LandlordsPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-20 lg:pb-28 lg:pt-28">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-teal" />
            <span className="text-sm font-medium text-teal">For landlords and letting agents</span>
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-[1.08] tracking-tight text-cream lg:text-6xl">
            Better tenant data.{' '}
            <span className="text-teal">Fewer empty properties.</span>{' '}
            Less arrears risk.
          </h1>

          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-cream">
            Traditional referencing was built around a credit score that was never designed to capture how people actually pay their rent. Equiscore gives landlords and agents a richer, more accurate picture of an applicant's financial reliability.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            {showWaitlist ? (
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
              href="/blog/open-banking-explained"
              className="inline-flex items-center gap-2 rounded-xl border border-cream/15 px-8 py-4 text-base font-semibold text-cream transition-colors hover:border-cream/30"
            >
              How open banking works <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Problem: The gap in traditional referencing ───────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">
            The problem
          </p>
          <h2 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
            The gap in traditional referencing
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-cream">
            Credit checks were designed to assess borrowing behaviour. Tenancy is not a credit product. The result is a referencing system that routinely misses good tenants and provides false confidence about bad ones.
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
            The scale of the problem
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
            Figures from public sources including Experian, Citizens Advice and RICS. Used for illustrative purposes.
          </p>
        </div>
      </section>

      {/* ── ROI callout ───────────────────────────────────────────────── */}
      <section className="bg-ink py-12">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-2xl border border-teal/20 bg-teal/5 px-8 py-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="mb-2 text-lg font-bold text-cream">One avoided void period can be worth more than a year of better referencing.</p>
                <p className="text-sm leading-relaxed text-cream">
                  The average UK void period costs landlords several weeks of lost rent plus re-letting fees. A more accurate picture of applicant reliability at the referencing stage reduces that risk. Good tenants that a blunt credit check would have turned away often turn out to be the most consistent payers.
                </p>
              </div>
              <div className="shrink-0 rounded-xl border border-teal/20 bg-ink px-6 py-4 text-center">
                <p className="text-3xl font-bold text-teal">3–4 weeks</p>
                <p className="text-sm text-cream">average void period cost</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What Equiscore adds ────────────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">
            How it works
          </p>
          <h2 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
            What Equiscore adds to your referencing process
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-cream">
            Equiscore is not a replacement for your existing referencing provider. It is an additional evidence layer that gives you the context a credit score cannot.
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
        </div>
      </section>

      {/* ── Excluded profiles ─────────────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">
            The missed opportunity
          </p>
          <h2 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
            The tenants you are currently turning away
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-cream">
            These applicants fail standard referencing not because they are poor financial risks, but because the evidence of their reliability does not appear in the places referencing platforms look.
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {EXCLUDED_PROFILES.map(({ icon: Icon, title, desc }) => (
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

      {/* ── Integration features ──────────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">
            Built for your workflow
          </p>
          <h2 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
            Designed to work alongside your existing process
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-cream">
            Equiscore integrates with how you already reference tenants, adding verified evidence without replacing your existing checks or creating additional compliance overhead.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            {[
              {
                icon: FileSearch,
                title: 'Works alongside existing referencing providers',
                desc: 'Use Equiscore as a supplementary layer when a standard check returns insufficient data or borderline results. You remain in control of your final decision.',
              },
              {
                icon: ShieldCheck,
                title: 'FCA-regulated open banking infrastructure',
                desc: 'All bank connections are established through regulated open banking providers. Applicant data is accessed only with explicit consent and processed under UK GDPR.',
              },
              {
                icon: Users,
                title: 'Applicant-led sharing',
                desc: 'The tenant builds their Trust Portfolio and shares it with you directly. There is no chasing documents; the evidence is structured, verified and ready to review.',
              },
              {
                icon: TrendingUp,
                title: 'Structured decision support',
                desc: 'You receive a summary of verified signals including income stability, payment consistency and affordability indicators alongside your standard referencing output.',
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
              Work with a wider pool of reliable tenants
            </p>
            <h2 className="mb-5 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
              Ready to see the full picture?
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-cream">
              Join our partner programme and be among the first landlords and letting agents to offer Equiscore-backed referencing to your applicants.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {showWaitlist ? (
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

            <div className="mx-auto mt-10 flex max-w-lg flex-col gap-2 sm:flex-row sm:gap-8">
              {[
                'No replacement of your current provider',
                'Applicant consent-led data sharing',
                'FCA-regulated open banking',
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
