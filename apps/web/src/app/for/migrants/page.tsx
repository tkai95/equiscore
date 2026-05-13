import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { isPublicSite } from '@/lib/site'
import {
  Home,
  Briefcase,
  CreditCard,
  Smartphone,
  Zap,
  ShieldCheck,
  ArrowRight,
  Globe,
  FileText,
  Lock,
  Users,
  TrendingUp,
} from 'lucide-react'

const BARRIERS = [
  {
    title: 'No UK credit history',
    body: 'Credit scoring in the UK relies almost entirely on your history with UK lenders. If you have just arrived, you have no history here, and a blank file is treated the same as a bad one by most automated systems.',
  },
  {
    title: 'Your home country record does not travel',
    body: 'You may have an excellent financial track record in another country, a mortgage, years of on-time payments, savings. None of it carries across. UK institutions have no way to verify it and most do not try.',
  },
  {
    title: 'Some visa types trigger additional scrutiny',
    body: 'Certain visa categories are flagged automatically by bank compliance systems, regardless of your actual financial situation. You can be declined before a human has even looked at your application.',
  },
  {
    title: 'No guarantor, no fixed address, no history',
    body: 'Renting, phone contracts and utility accounts often require a combination of credit history, a UK guarantor and proof of long-term address. For a newcomer, those three things are a near-impossible circle to break into.',
  },
]

const BLOCKED = [
  { icon: CreditCard, label: 'Bank accounts', desc: 'Basic accounts can be refused or limited for new arrivals' },
  { icon: Home, label: 'Renting a home', desc: 'Landlords almost always require UK credit history or a guarantor' },
  { icon: Briefcase, label: 'Employment checks', desc: 'Some roles require financial vetting that relies on a UK credit file' },
  { icon: Zap, label: 'Utility accounts', desc: 'Providers run credit checks even for basic energy and broadband' },
  { icon: Smartphone, label: 'Phone contracts', desc: 'Pay monthly contracts often require a minimum credit history' },
  { icon: TrendingUp, label: 'Credit building', desc: 'You cannot build a credit file without access to credit in the first place' },
]

const HOW_WE_HELP = [
  {
    icon: Globe,
    title: 'Start your Trust Portfolio from day one',
    body: 'You do not need a UK credit history to build a Trust Portfolio. We use your real financial behaviour, including open banking data, to verify income, spending patterns and financial responsibility from the moment you connect.',
  },
  {
    icon: FileText,
    title: 'Verified evidence that travels with you',
    body: 'Your Trust Portfolio is a portable, verified record. Whether you are renting your first flat, applying for a bank account or setting up utilities, you have something concrete to share rather than asking institutions to take a chance.',
  },
  {
    icon: Users,
    title: 'Connections to inclusive providers',
    body: 'We work with banks, landlords and lenders who have committed to looking beyond the traditional credit file. Your Trust Portfolio gets you in front of providers who are willing to make decisions based on real evidence.',
  },
  {
    icon: ShieldCheck,
    title: 'A foundation you build over time',
    body: 'The earlier you start, the stronger your profile becomes. Every month of verified financial behaviour adds to your Trust Portfolio, giving you a growing record that helps open more doors as you settle in.',
  },
]

export default function MigrantsPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-teal" />
          <span className="text-sm font-medium text-teal">Migrants & newcomers</span>
        </div>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-cream lg:text-5xl">
          You have a financial history.
          <br />
          <span className="text-teal">The UK just cannot see it yet.</span>
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg leading-relaxed text-cream">
          Moving to a new country means starting from scratch financially, regardless of the track record you built back home. The UK credit system has no way to look beyond its own borders, so you arrive with nothing on file and institutions treat that as a risk.
        </p>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-cream">
          Equiscore is designed to close that gap, using real financial data to build a verified Trust Portfolio that works from your first day in the UK.
        </p>
      </section>

      {/* ── The barriers ─────────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">Why it is harder than it should be</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            The UK system was not built with newcomers in mind
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            These are the specific barriers most new arrivals run into, and why a clean financial record from abroad does not help.
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

      {/* ── Stats ────────────────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-2xl border border-teal/20 bg-ink-mid p-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">The scale of the problem</p>
            <h2 className="mb-6 text-2xl font-bold text-cream">
              Hundreds of thousands of people arrive in the UK each year and face the same wall
            </h2>
            <p className="mb-10 leading-relaxed text-cream">
              Net migration to the UK reached 204,000 in the year to June 2025. Each of those people arrives needing a bank account, somewhere to live, and access to basic services. For most, the first months are a frustrating cycle of rejections with no clear path through. The credit system offers no on-ramp and no acknowledgement that a person can be financially responsible without a UK credit file to prove it.
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                { stat: '204k', label: 'net migration to the UK in 2025' },
                { stat: '0', label: 'months of UK credit history most arrive with' },
                { stat: '6+ months', label: 'typical wait before standard credit products become accessible' },
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
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">What a blank credit file costs you</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            The doors that stay closed without a UK credit history
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            A blank file is not neutral. It is treated as a negative by automated systems that have no other frame of reference.
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

      {/* ── The injustice ────────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">The fundamental problem</p>
          <h2 className="mb-10 text-center text-3xl font-bold text-cream">
            Your history exists. The system just refuses to look for it.
          </h2>
          <div className="space-y-5">
            <p className="text-lg leading-relaxed text-cream">
              Most people who arrive in the UK have years of financial history behind them. Rent paid on time, savings built up, income verified through employment. That history is real. It simply does not appear on a UK credit file, so UK institutions act as though it never happened.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              The credit system was designed for people who have always lived here. It has no mechanism for recognising financial responsibility built elsewhere. As a result, someone who has never missed a payment in their life can be treated the same as someone with a history of defaults.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              That is not a fair assessment of risk. It is a gap in the system, and one that disproportionately affects people who are already navigating the demands of settling somewhere new.
            </p>
          </div>
        </div>
      </section>

      {/* ── How we help ──────────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">How Equiscore helps</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            Build your financial identity from day one
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            You do not need a credit history to start. You need your bank account and about 15 minutes.
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
              Start building your UK financial identity today
            </h2>
            <p className="mx-auto mb-8 max-w-md leading-relaxed text-cream">
              Your Trust Portfolio grows with every month of verified financial behaviour. The earlier you start, the stronger your profile becomes.
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
