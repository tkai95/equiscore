'use client'

import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { isPublicSite } from '@/lib/site'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Briefcase,
  Landmark,
  Link2,
  FileText,
  Send,
  Globe,
  User,
} from 'lucide-react'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'

const DevHeroCTAs = dynamic(
  () => import('@/components/landing/dev-clerk-ctas').then((m) => m.DevHeroCTAs),
  { ssr: false },
)
const DevBottomCTA = dynamic(
  () => import('@/components/landing/dev-clerk-ctas').then((m) => m.DevBottomCTA),
  { ssr: false },
)

// ── Hero device mockup ───────────────────────────────────────────────────────

function DeviceMockup() {
  return (
    <div className="relative w-[130%] lg:w-[155%] lg:-mr-40">
      <div className="absolute -top-8 right-36 z-20 flex items-center gap-1.5 text-xs text-cream/25">
        <div className="h-1.5 w-1.5 rounded-full bg-teal/50" />
        Concept preview
      </div>

      <div className="relative">
        <Image
          src="/laptop_and_phone.jpg.png"
          alt="Equiscore Trust Portfolio on laptop and phone"
          width={1000}
          height={640}
          className="w-full"
          priority
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-64 bg-gradient-to-l from-ink via-ink/80 to-transparent" />
      </div>
    </div>
  )
}

function FlowChart() {
  return (
    <div className="relative">
      <Image
        src="/flowchart.jpg"
        alt="How Equiscore connects problems to outcomes"
        width={1200}
        height={600}
        className="w-full"
      />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink to-transparent" />
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

const STATS = [
  {
    icon: ShieldCheck,
    category: 'Fraud & De-banking',
    stat: '444k+',
    label: 'fraud database cases',
    desc: 'Recorded by Cifas in 2025. People need clearer ways to explain context and demonstrate recovery.',
  },
  {
    icon: Globe,
    category: 'New to the UK',
    stat: '204k',
    label: 'net migration to the UK',
    desc: 'YE Jun 2025. Many newcomers still start with little recognised UK credit history.',
  },
  {
    icon: Briefcase,
    category: 'Variable Income',
    stat: '460k+',
    label: 'gig workers',
    desc: 'CIPD estimate. Stable earners may need better ways to evidence income beyond traditional payslips.',
  },
  {
    icon: User,
    category: 'Thin Files',
    stat: '4–5m',
    label: 'credit-invisible adults',
    desc: 'Experian estimate. UK adults with limited or no access to formal credit.',
  },
]

const HOW_IT_WORKS = [
  {
    n: '1',
    icon: Link2,
    title: 'Create your profile',
    desc: 'Sign up and tell us about yourself. Takes just a few minutes.',
  },
  {
    n: '2',
    icon: FileText,
    title: 'Add your evidence',
    desc: 'Connect your bank and upload supporting documents securely.',
  },
  {
    n: '3',
    icon: ShieldCheck,
    title: 'Get your Trust Score',
    desc: 'We analyse your evidence and build your verified Trust Portfolio.',
  },
  {
    n: '4',
    icon: Send,
    title: 'Share your profile',
    desc: 'Share with landlords, lenders and providers you trust.',
  },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-ink">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div>
        <LandingNav dark />

        <section className="mx-auto max-w-6xl overflow-hidden px-6 pb-24 pt-16 lg:pb-32 lg:pt-24">
          <div className="relative grid items-center lg:grid-cols-[1fr_2fr]">

            {/* Left — copy */}
            <div className="relative z-10 pb-10 lg:pb-0 lg:pr-4">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal" />
                <span className="text-sm font-medium text-teal">Pre-launch · rebuilding financial access</span>
              </div>

              <h1 className="mb-6 text-5xl font-bold leading-[1.08] tracking-tight text-cream lg:text-[3.5rem]">
                Rebuild financial
                <br />
                access with a{' '}
                <span className="text-teal">verified</span>
                <br />
                Trust Portfolio.
              </h1>

              <p className="mb-10 max-w-md text-lg leading-relaxed text-cream">
                We help people rebuild financial access and give institutions the confidence to make fairer decisions.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                {isPublicSite ? (
                  <>
                    <RegisterInterestButton label="Join the waitlist" variant="primary" />
                    <Link
                      href="/#how-it-works"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-cream/15 px-6 py-3.5 text-base font-semibold text-cream transition-colors hover:border-cream/30 hover:text-cream"
                    >
                      See how it works <ArrowRight className="h-4 w-4" />
                    </Link>
                  </>
                ) : (
                  <DevHeroCTAs />
                )}
              </div>
            </div>

            {/* Right — device mockup, overlaps text column on lg */}
            <div className="relative z-0 flex items-center lg:-ml-32">
              <DeviceMockup />
            </div>
          </div>
        </section>
      </div>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-5 text-center text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
            The credit system wasn't built for everyone.
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-center leading-relaxed text-cream">
            Traditional credit files, fraud systems and income checks often miss the context behind real people's financial lives. Equiscore is being built to help turn that context into verified evidence.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map(({ icon: Icon, category, stat, label, desc }, idx) => (
              <div
                key={stat}
                className={`relative flex flex-col rounded-2xl border bg-ink-mid p-7 ${
                  idx === 0
                    ? 'border-teal/40 shadow-[0_0_60px_-15px_rgba(0,200,150,0.25)]'
                    : 'border-ink-border'
                }`}
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
                  <Icon className="h-5 w-5 text-teal" />
                </div>
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">{category}</p>
                <p className="mb-1 text-5xl font-black leading-none tracking-tight text-cream">{stat}</p>
                <p className="mb-5 text-sm text-cream">{label}</p>
                <div className="mb-4 h-px bg-ink-border" />
                <p className="text-xs leading-relaxed text-cream">{desc}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-right text-xs text-cream">
            Illustrative UK market figures from public sources.
          </p>

          <div className="mt-14 flex items-center gap-6">
            <div className="h-px flex-1 bg-ink-border" />
            <p className="shrink-0 text-center text-sm text-cream">
              Different starting points. One need: a trusted way to prove the full picture.
            </p>
            <div className="h-px flex-1 bg-ink-border" />
          </div>
        </div>
      </section>

      {/* ── One trust layer ────────────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">
            Built for people the system struggles to understand
          </p>
          <h2 className="mb-4 text-center text-4xl font-bold text-cream lg:text-5xl">
            One trust layer. Many doors reopened.
          </h2>
          <p className="mx-auto mb-16 max-w-xl text-center leading-relaxed text-cream">
            From rebuilding access to proving stability, Equiscore helps turn fragmented evidence into a clearer financial story.
          </p>
          <FlowChart />
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────── */}
      <section className="bg-ink pb-24" id="how-it-works">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">Simple process</p>
          <h2 className="mb-16 text-center text-3xl font-bold text-cream">How it works</h2>

          <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-0">
            {HOW_IT_WORKS.map(({ n, icon: Icon, title, desc }, idx) => (
              <div key={n} className="contents">
                <div className="group relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-ink-border bg-ink-mid p-7 transition-colors duration-200 hover:border-teal/30">
                  <span className="pointer-events-none absolute right-4 top-3 select-none text-7xl font-black leading-none text-cream/[0.04]">
                    {n}
                  </span>
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-teal/20 bg-teal/10 transition-colors duration-200 group-hover:border-teal/40 group-hover:bg-teal/15">
                    <Icon className="h-6 w-6 text-teal" />
                  </div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal/60">Step {n}</p>
                  <h3 className="mb-2 text-base font-bold text-cream">{title}</h3>
                  <p className="text-sm leading-relaxed text-cream">{desc}</p>
                </div>

                {idx < HOW_IT_WORKS.length - 1 && (
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

      {/* ── For Individuals / For Institutions ─────────────────────── */}
      <section className="bg-ink pb-24" id="for-individuals">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-8 text-center text-xs font-bold uppercase tracking-widest text-cream">
            Built for both sides
          </p>
          <div className="grid gap-6 lg:grid-cols-2">

            {/* For Individuals — dark card, photo right, fades into dark bg */}
            <div className="flex overflow-hidden rounded-2xl border border-ink-border bg-ink-mid">
              {/* Text */}
              <div className="flex flex-1 flex-col justify-between p-8">
                <div>
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-teal">For Individuals</h3>
                  </div>
                  <p className="mb-5 text-cream">
                    Build a portable trust profile when your credit file does not tell the full story.
                  </p>
                  <ul className="mb-8 space-y-2">
                    {['Thin file or no local history', 'Recovering from account closures or disruption', 'Variable or non-standard income'].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-cream">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                {isPublicSite ? (
                  <RegisterInterestButton label="Join individual waitlist" variant="primary" />
                ) : (
                  <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-teal px-6 py-3 text-sm font-semibold text-ink hover:bg-teal-dark">
                    Start your Trust Portfolio <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>

              {/* Photo — right side, fades left into ink */}
              <div className="relative w-[220px] flex-shrink-0">
                <Image
                  src="/individual.jpg.png"
                  alt="Person using Equiscore"
                  fill
                  className="object-cover object-[center_10%]"
                />
                {/* Subtle fade — just the left edge */}
                <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-ink-mid to-transparent" />
              </div>
            </div>

            {/* For Institutions — dark card, city photo right, fades into dark bg */}
            <div className="flex overflow-hidden rounded-2xl border border-ink-border bg-ink-mid">
              {/* Text */}
              <div className="flex flex-1 flex-col justify-between p-8">
                <div>
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-teal">For Institutions</h3>
                  </div>
                  <p className="mb-5 text-cream">
                    A clearer, more contextual evidence layer to support risk-aware, inclusive decisions.
                  </p>
                  <ul className="mb-8 space-y-2">
                    {['Better context for edge cases', 'Faster, more consistent review', 'More inclusive onboarding pathways'].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-cream">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <RegisterInterestButton label="Partner with Equiscore" variant="outline-light" />
              </div>

              {/* City photo — right side, fades left into ink */}
              <div className="relative w-[220px] flex-shrink-0">
                <Image
                  src="/institutions.jpg.png"
                  alt="London city skyline"
                  fill
                  className="object-cover object-center"
                />
                {/* Strong fade from ink-mid into photo */}
                <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-ink-mid via-ink-mid/80 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────────────────── */}
      <section className="bg-ink pb-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center gap-8 rounded-2xl border border-ink-border bg-ink-mid px-8 py-12 text-center md:flex-row md:text-left">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
              <Lock className="h-7 w-7 text-teal" />
            </div>
            <div className="flex-1">
              <h2 className="mb-2 text-3xl font-bold text-cream lg:text-4xl">
                Financial access should not depend
                <br className="hidden lg:block" /> on being easy to score.
              </h2>
              <p className="text-cream">Register for early access and follow the launch of Equiscore.</p>
            </div>
            {isPublicSite ? (
              <RegisterInterestButton label="Join the waitlist" variant="primary" />
            ) : (
              <DevBottomCTA />
            )}
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  )
}
